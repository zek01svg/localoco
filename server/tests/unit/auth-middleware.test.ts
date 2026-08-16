import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createErrorHandler } from "#server/lib/errors";

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn<
    (_opts: { headers: Headers }) => Promise<{
      user: { id: string; name: string; email: string; emailVerified: boolean };
      session: { id: string; userId: string; expiresAt: Date };
    } | null>
  >(),
}));

vi.mock("#server/lib/auth", () => ({
  auth: {
    api: {
      getSession: (opts: { headers: Headers }) => mockGetSession(opts),
    },
  },
}));

// Dynamic import after mock setup
const { requireAuth, requireVerified } = await import("#server/lib/auth-middleware");

const createTestApp = () => {
  const logger = {
    warning: vi.fn<(_msg: string, _props: Record<string, unknown>) => void>(),
    error: vi.fn<(_err: Error, _props: Record<string, unknown>) => void>(),
  };

  const app = new Hono<{
    Variables: {
      requestId: string;
      user: { id: string; name: string; email: string; emailVerified: boolean };
      session: { id: string; userId: string; expiresAt: Date };
    };
  }>();

  app.use(async (c, next) => {
    c.set("requestId", "req-auth-test");
    await next();
  });

  app.get("/public", c => c.json({ status: "public" }));

  app.get("/protected", requireAuth, c => {
    const user = c.get("user");
    return c.json({ status: "authenticated", userId: user.id });
  });

  app.post("/community/create", requireAuth, requireVerified, c => {
    const user = c.get("user");
    return c.json({ status: "created", by: user.id });
  });

  app.onError(createErrorHandler({ logger }));
  return app;
};

describe("requireAuth Middleware - valid session", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it("allows access when session is valid and populates user and session on context", async () => {
    const validUser = {
      id: "usr_123",
      name: "Alice",
      email: "alice@example.com",
      emailVerified: false,
    };
    const validSession = {
      id: "ses_123",
      userId: "usr_123",
      expiresAt: new Date(Date.now() + 3600_000),
    };

    mockGetSession.mockResolvedValueOnce({
      user: validUser,
      session: validSession,
    });

    const app = createTestApp();
    const res = await app.request("/protected", {
      headers: { cookie: "localoco.session_token=valid_token" },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      status: "authenticated",
      userId: "usr_123",
    });
  });
});

describe("requireAuth Middleware - unauthenticated", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it("throws 401 unauthorized when no session is present", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const app = createTestApp();
    const res = await app.request("/protected");

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "unauthorized",
        message: "Authentication required",
        requestId: "req-auth-test",
      },
    });
  });
});

describe("requireVerified Middleware - verified email", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it("allows mutation when user email is verified", async () => {
    const verifiedUser = {
      id: "usr_verified",
      name: "Bob",
      email: "bob@example.com",
      emailVerified: true,
    };
    const validSession = {
      id: "ses_456",
      userId: "usr_verified",
      expiresAt: new Date(Date.now() + 3600_000),
    };

    mockGetSession.mockResolvedValueOnce({
      user: verifiedUser,
      session: validSession,
    });

    const app = createTestApp();
    const res = await app.request("/community/create", {
      method: "POST",
      headers: { cookie: "localoco.session_token=valid_token" },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      status: "created",
      by: "usr_verified",
    });
  });
});

describe("requireVerified Middleware - unverified email", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it("throws 403 forbidden when user email is unverified", async () => {
    const unverifiedUser = {
      id: "usr_unverified",
      name: "Charlie",
      email: "charlie@example.com",
      emailVerified: false,
    };
    const validSession = {
      id: "ses_789",
      userId: "usr_unverified",
      expiresAt: new Date(Date.now() + 3600_000),
    };

    mockGetSession.mockResolvedValueOnce({
      user: unverifiedUser,
      session: validSession,
    });

    const app = createTestApp();
    const res = await app.request("/community/create", {
      method: "POST",
      headers: { cookie: "localoco.session_token=valid_token" },
    });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "forbidden",
        message: "Email verification required to perform this action",
        requestId: "req-auth-test",
      },
    });
  });
});
