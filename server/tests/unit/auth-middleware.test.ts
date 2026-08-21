import type { AuthContext } from "#server/lib/auth-middleware";
import type { MiddlewareHandler } from "hono";

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createErrorHandler } from "#server/lib/errors";

const { mockGetSession, mockAdminRows, mockBusinessRows } = vi.hoisted(() => ({
  mockGetSession: vi.fn<
    () => Promise<{
      user: { id: string; emailVerified: boolean };
      session: { id: string };
    } | null>
  >(),
  mockAdminRows: [] as { userId: string }[],
  mockBusinessRows: [] as { id: string }[],
}));

vi.mock("#server/lib/auth", () => ({
  auth: {
    api: {
      getSession: () => mockGetSession(),
    },
  },
}));

vi.mock("#server/lib/db", () => ({
  db: {
    select: (fields: unknown) => ({
      from: () => ({
        where: () => ({
          limit: () => {
            if (fields && typeof fields === "object" && "id" in fields) {
              return Promise.resolve(mockBusinessRows);
            }
            return Promise.resolve(mockAdminRows);
          },
        }),
      }),
    }),
  },
}));

const { resolveAuth, requireAuth, requireVerified, requireAdmin, requireBusinessOwner } =
  await import("#server/lib/auth-middleware");

type TestVariables = { requestId: string; auth: AuthContext | undefined };

const createTestApp = (...middleware: MiddlewareHandler[]) => {
  const logger = {
    warning: vi.fn<(_msg: string, _props: Record<string, unknown>) => void>(),
    error: vi.fn<(_err: Error, _props: Record<string, unknown>) => void>(),
  };

  const app = new Hono<{ Variables: TestVariables }>();

  app.use(async (c, next) => {
    c.set("requestId", "req-auth-test");
    await next();
  });

  app.use("/protected", ...middleware);
  app.get("/protected", c => c.json({ ok: true, auth: c.get("auth") }));
  app.get("/public", resolveAuth, c => c.json({ ok: true, auth: c.get("auth") }));
  app.use("/businesses/:id", requireBusinessOwner);
  app.get("/businesses/:id", c => c.json({ ok: true, id: c.req.param("id"), auth: c.get("auth") }));

  app.onError(createErrorHandler({ logger }));
  return app;
};

beforeEach(() => {
  mockGetSession.mockReset();
  mockAdminRows.length = 0;
  mockBusinessRows.length = 0;
});

describe("resolveAuth - single resolution per request", () => {
  it("sets the narrow AuthContext for a valid session and never resolves twice under stacked policies", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: "usr_123", emailVerified: true },
      session: { id: "ses_123" },
    });

    const app = createTestApp(requireVerified, requireAuth, requireVerified);
    const res = await app.request("/protected", {
      headers: { cookie: "localoco.session_token=valid_token" },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      auth: { userId: "usr_123", emailVerified: true, isAdmin: false },
    });
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it("derives the administrator role from the database, never from a client claim", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: "usr_admin", emailVerified: true },
      session: { id: "ses_admin" },
    });
    mockAdminRows.push({ userId: "usr_admin" });

    const app = createTestApp(requireAdmin);
    const res = await app.request("/protected", {
      headers: { cookie: "localoco.session_token=admin_token" },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      auth: { userId: "usr_admin", emailVerified: true, isAdmin: true },
    });
  });

  it("leaves auth unset for a request without a session", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await createTestApp().request("/public");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});

describe("requireAuth", () => {
  it("rejects anonymous requests with 401 unauthorized", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const app = createTestApp(requireAuth);
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

describe("requireVerified", () => {
  it("rejects an authenticated but unverified user with 403 forbidden", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: "usr_unverified", emailVerified: false },
      session: { id: "ses_1" },
    });

    const app = createTestApp(requireVerified);
    const res = await app.request("/protected", {
      headers: { cookie: "localoco.session_token=unverified_token" },
    });

    expect(res.status).toBe(403);
    const body: unknown = await res.json();
    expect(body).toMatchObject({ error: { code: "forbidden" } });
  });
});

describe("requireAdmin", () => {
  it("rejects a verified non-administrator with 403 forbidden", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: "usr_plain", emailVerified: true },
      session: { id: "ses_2" },
    });

    const app = createTestApp(requireAdmin);
    const res = await app.request("/protected", {
      headers: { cookie: "localoco.session_token=plain_token" },
    });

    expect(res.status).toBe(403);
    const body: unknown = await res.json();
    expect(body).toMatchObject({ error: { code: "forbidden" } });
  });
});

describe("requireBusinessOwner", () => {
  it("permits access when the verified user owns the requested business", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: "usr_owner", emailVerified: true },
      session: { id: "ses_owner" },
    });
    mockBusinessRows.push({ id: "biz_123" });

    const app = createTestApp();
    const res = await app.request("/businesses/biz_123", {
      headers: { cookie: "localoco.session_token=owner_token" },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      id: "biz_123",
      auth: { userId: "usr_owner", emailVerified: true, isAdmin: false },
    });
  });

  it("permits access when the verified user is an administrator", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: "usr_admin", emailVerified: true },
      session: { id: "ses_admin" },
    });
    mockAdminRows.push({ userId: "usr_admin" });
    mockBusinessRows.push({ id: "biz_123" });

    const app = createTestApp();
    const res = await app.request("/businesses/biz_123", {
      headers: { cookie: "localoco.session_token=admin_token" },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      id: "biz_123",
      auth: { userId: "usr_admin", emailVerified: true, isAdmin: true },
    });
  });

  it("answers 404 not found when the business does not exist or user does not own it (anti-enumeration)", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: "usr_other", emailVerified: true },
      session: { id: "ses_other" },
    });
    // mockBusinessRows is empty - simulating non-owned or non-existent business

    const app = createTestApp();
    const res = await app.request("/businesses/biz_foreign", {
      headers: { cookie: "localoco.session_token=other_token" },
    });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "not_found",
        message: "Business not found",
        requestId: "req-auth-test",
      },
    });
  });

  it("rejects anonymous requests with 401 unauthorized", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const app = createTestApp();
    const res = await app.request("/businesses/biz_123");

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "unauthorized",
        message: "Authentication required",
        requestId: "req-auth-test",
      },
    });
  });

  it("rejects unverified users with 403 forbidden", async () => {
    mockGetSession.mockResolvedValueOnce({
      user: { id: "usr_unverified", emailVerified: false },
      session: { id: "ses_unverified" },
    });

    const app = createTestApp();
    const res = await app.request("/businesses/biz_123", {
      headers: { cookie: "localoco.session_token=unverified_token" },
    });

    expect(res.status).toBe(403);
    const body: unknown = await res.json();
    expect(body).toMatchObject({
      error: {
        code: "forbidden",
        message: "Email verification required to perform this action",
      },
    });
  });
});
