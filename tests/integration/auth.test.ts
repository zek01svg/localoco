/**
 * @vitest-environment node
 */
import type { AppType } from "#server/index";
import type { db as dbInstance } from "#server/lib/db";
import type { TestAppEnv } from "./auth-helpers";
import type { Context, Hono, MiddlewareHandler, Next } from "hono";

import { and, desc, eq, like } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";

import { user, verification } from "#server/database/auth";
import { emailDelivery } from "#server/database/email";
import { errorEnvelopeSchema } from "#shared/contracts/error";

import {
  createTestHonoApp,
  extractSessionCookie,
  registerUser,
  startPostgresContainer,
} from "./auth-helpers";

vi.mock("hono/bun", () => ({
  serveStatic: () => (_c: Context, next: Next) => next(),
}));

const { mockPublishEmailJob } = vi.hoisted(() => ({
  mockPublishEmailJob: vi.fn<() => Promise<{ messageId: string }>>().mockResolvedValue({
    messageId: "mock_qstash_msg_123",
  }),
}));

vi.mock("#server/lib/email/qstash", () => ({
  publishEmailJob: () => mockPublishEmailJob(),
  verifyQStashSignature: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
}));

let container: Awaited<ReturnType<typeof startPostgresContainer>>["container"];

let app: AppType;
let testApp: Hono<TestAppEnv>;
let db: typeof dbInstance;
let requireAuth: MiddlewareHandler;
let requireVerified: MiddlewareHandler;

beforeAll(async () => {
  const started = await startPostgresContainer();
  container = started.container;

  process.env.DATABASE_URL = started.databaseUrl;
  process.env.BETTER_AUTH_SECRET = "super-secret-test-key-32-chars-long!!";
  process.env.NODE_ENV = "test";
  process.env.VITE_APP_URL = "http://localhost:4000";

  const serverModule = await import("#server/index");
  const dbModule = await import("#server/lib/db");
  const authMwModule = await import("#server/lib/auth-middleware");

  app = serverModule.app;
  db = dbModule.db;
  requireAuth = authMwModule.requireAuth;
  requireVerified = authMwModule.requireVerified;

  const logger = {
    warning: vi.fn<(_msg: string, _props: Record<string, unknown>) => void>(),
    error: vi.fn<(_err: Error, _props: Record<string, unknown>) => void>(),
  };

  testApp = await createTestHonoApp(app, requireAuth, requireVerified, logger);
}, 120_000);

afterAll(async () => {
  await container.stop();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Auth Registration & Email Queueing", () => {
  it("registers a new user, sets HTTP-only session cookie, and asynchronously enqueues verification email", async () => {
    const signupResponse = await registerUser(testApp, {
      name: "Alice Tan",
      email: "alice.tan@example.com",
      password: "Password123!",
    });

    expect(signupResponse.status).toBe(200);
    const setCookieHeader = signupResponse.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain("localoco.session_token");
    expect(setCookieHeader).toContain("HttpOnly");

    const users = await db.select().from(user).where(eq(user.email, "alice.tan@example.com"));
    expect(users).toHaveLength(1);
    expect(users[0]?.name).toBe("Alice Tan");
    expect(users[0]?.emailVerified).toBe(false);

    const emails = await db
      .select()
      .from(emailDelivery)
      .where(eq(emailDelivery.recipient, "alice.tan@example.com"));
    expect(emails.length).toBeGreaterThanOrEqual(1);
    expect(emails[0]?.subject).toContain("Verify your LocaLoco email address");
    expect(emails[0]?.htmlBody).toContain("Alice Tan");
    expect(emails[0]?.htmlBody).toContain("/api/auth/verify-email");
  });

  it("handles duplicate registration attempts safely without enumeration leaks", async () => {
    const dupSignup = await registerUser(testApp, {
      name: "Alice Imposter",
      email: "alice.tan@example.com",
      password: "DifferentPassword123!",
    });

    expect([400, 422]).toContain(dupSignup.status);

    const users = await db.select().from(user).where(eq(user.email, "alice.tan@example.com"));
    expect(users).toHaveLength(1);
    expect(users[0]?.name).toBe("Alice Tan");
  });
});

describe("Auth Email Verification", () => {
  it("verifies email with valid token and transitions user.emailVerified to true in database", async () => {
    const signupResponse = await registerUser(testApp, {
      name: "Bob Lee",
      email: "bob.lee@example.com",
      password: "Password123!",
    });
    expect(signupResponse.status).toBe(200);

    const emails = await db
      .select()
      .from(emailDelivery)
      .where(eq(emailDelivery.recipient, "bob.lee@example.com"));
    expect(emails.length).toBeGreaterThanOrEqual(1);
    const match = emails[0]?.htmlBody.match(/token=([^&"'\s]+)/u);
    const token = match?.[1];

    const verifyResponse = await testApp.request(`/api/auth/verify-email?token=${token}`, {
      method: "GET",
      headers: { origin: "http://localhost:4000" },
    });
    expect(verifyResponse.status).toBe(200);

    const [bobUser] = await db.select().from(user).where(eq(user.email, "bob.lee@example.com"));
    expect(bobUser).toBeDefined();
    expect(bobUser.emailVerified).toBe(true);

    const badVerifyResponse = await testApp.request(
      `/api/auth/verify-email?token=invalid_token_xyz`,
      { method: "GET", headers: { origin: "http://localhost:4000" } }
    );
    expect([400, 401]).toContain(badVerifyResponse.status);
  });
});

describe("Auth Password Authentication", () => {
  it("authenticates registered user with valid password and rejects invalid password", async () => {
    const loginResponse = await testApp.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:4000",
      },
      body: JSON.stringify({
        email: "alice.tan@example.com",
        password: "Password123!",
      }),
    });
    expect(loginResponse.status).toBe(200);
    const cookie = loginResponse.headers.get("set-cookie");
    expect(cookie).toContain("localoco.session_token");

    const badLoginResponse = await testApp.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:4000",
      },
      body: JSON.stringify({
        email: "alice.tan@example.com",
        password: "WrongPassword!",
      }),
    });
    expect([400, 401]).toContain(badLoginResponse.status);
  });
});

describe("Auth Authorization Gates", () => {
  it("enforces server-side authorization gate: blocks unverified user (403) and allows verified user (200)", async () => {
    const aliceLogin = await testApp.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:4000" },
      body: JSON.stringify({ email: "alice.tan@example.com", password: "Password123!" }),
    });
    const aliceSessionCookie = extractSessionCookie(aliceLogin);

    const aliceProtected = await testApp.request("/api/test-protected", {
      headers: { cookie: aliceSessionCookie },
    });
    expect(aliceProtected.status).toBe(200);

    const aliceMutation = await testApp.request("/api/test-verified-mutation", {
      method: "POST",
      headers: { cookie: aliceSessionCookie },
    });
    expect(aliceMutation.status).toBe(403);
    const aliceErr = errorEnvelopeSchema.parse(await aliceMutation.json());
    expect(aliceErr.error.code).toBe("forbidden");

    const bobLogin = await testApp.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:4000" },
      body: JSON.stringify({ email: "bob.lee@example.com", password: "Password123!" }),
    });
    const bobSessionCookie = extractSessionCookie(bobLogin);

    const bobMutation = await testApp.request("/api/test-verified-mutation", {
      method: "POST",
      headers: { cookie: bobSessionCookie },
    });
    expect(bobMutation.status).toBe(200);
    const mutationSchema = z.object({ ok: z.boolean(), mutatedBy: z.string() });
    const bobSuccess = mutationSchema.parse(await bobMutation.json());
    expect(bobSuccess.ok).toBe(true);
  });
});

describe("Auth Session Expiration & Sign Out", () => {
  it("stops authorizing expired sessions immediately with 401", async () => {
    const bobLogin = await testApp.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:4000" },
      body: JSON.stringify({ email: "bob.lee@example.com", password: "Password123!" }),
    });
    const sessionCookie = extractSessionCookie(bobLogin);

    const beforeRes = await testApp.request("/api/test-protected", {
      headers: { cookie: sessionCookie },
    });
    expect(beforeRes.status).toBe(200);

    const { session } = await import("#server/database/auth");
    await db.update(session).set({ expiresAt: new Date(Date.now() - 3600_000) });

    const afterRes = await testApp.request("/api/test-protected", {
      headers: { cookie: sessionCookie },
    });
    expect(afterRes.status).toBe(401);
  });

  it("sign-out revokes session and subsequent requests stop authorizing immediately (401)", async () => {
    const bobLogin = await testApp.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:4000" },
      body: JSON.stringify({ email: "bob.lee@example.com", password: "Password123!" }),
    });
    const sessionCookie = extractSessionCookie(bobLogin);

    const signOutRes = await testApp.request("/api/auth/sign-out", {
      method: "POST",
      headers: {
        cookie: sessionCookie,
        origin: "http://localhost:4000",
      },
    });
    expect(signOutRes.status).toBe(200);

    const protectedRes = await testApp.request("/api/test-protected", {
      headers: { cookie: sessionCookie },
    });
    expect(protectedRes.status).toBe(401);
    const err = errorEnvelopeSchema.parse(await protectedRes.json());
    expect(err.error.code).toBe("unauthorized");
  });
});

describe("Auth Password Reset", () => {
  const resetEmail = "carol.tan@example.com";

  function requestReset(email: string): Promise<Response> | Response {
    return testApp.request("/api/auth/request-password-reset", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:4000",
      },
      body: JSON.stringify({ email }),
    });
  }

  async function latestResetToken(email: string): Promise<string> {
    const emails = await db
      .select()
      .from(emailDelivery)
      .where(eq(emailDelivery.recipient, email))
      .orderBy(desc(emailDelivery.createdAt));
    const match = emails[0]?.htmlBody.match(/\/reset-password\/([^?&"'\s]+)/u);
    if (!match) {
      throw new Error("No reset link found in delivered email");
    }
    return match[1];
  }

  function resetPassword(token: string, newPassword: string): Promise<Response> | Response {
    return testApp.request("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:4000",
      },
      body: JSON.stringify({ newPassword, token }),
    });
  }

  beforeAll(async () => {
    await registerUser(testApp, {
      name: "Carol Tan",
      email: resetEmail,
      password: "Password123!",
    });
  });

  it("returns an identical non-enumerating response whether or not the email exists", async () => {
    const existingResponse = await requestReset(resetEmail);
    const unknownResponse = await requestReset("ghost@example.com");

    expect(existingResponse.status).toBe(200);
    expect(unknownResponse.status).toBe(200);
    await expect(existingResponse.json()).resolves.toEqual(await unknownResponse.json());

    const ghostEmails = await db
      .select()
      .from(emailDelivery)
      .where(eq(emailDelivery.recipient, "ghost@example.com"));
    expect(ghostEmails).toHaveLength(0);
  });

  it("enqueues a reset email asynchronously with a token link", async () => {
    await requestReset(resetEmail);

    const emails = await db
      .select()
      .from(emailDelivery)
      .where(eq(emailDelivery.recipient, resetEmail))
      .orderBy(desc(emailDelivery.createdAt));
    expect(emails[0]?.subject).toContain("Reset your LocaLoco password");
    expect(emails[0]?.htmlBody).toContain("/api/auth/reset-password/");
    await expect(latestResetToken(resetEmail)).resolves.toBeTruthy();
  });

  it("rejects a replayed or already-consumed reset token", async () => {
    await requestReset(resetEmail);
    const token = await latestResetToken(resetEmail);

    const firstReset = await resetPassword(token, "NewPassword456!");
    expect(firstReset.status).toBe(200);

    const replayReset = await resetPassword(token, "AnotherPassword789!");
    expect([400, 401]).toContain(replayReset.status);
  });

  it("rejects an expired reset token", async () => {
    await requestReset(resetEmail);
    const token = await latestResetToken(resetEmail);

    const [carol] = await db.select().from(user).where(eq(user.email, resetEmail));
    await db
      .update(verification)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(
        and(like(verification.identifier, "reset-password:%"), eq(verification.value, carol.id))
      );

    const expiredReset = await resetPassword(token, "ExpiredPassword123!");
    expect([400, 401]).toContain(expiredReset.status);
  });

  it("revokes all prior sessions when a reset completes", async () => {
    const login = await testApp.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:4000" },
      body: JSON.stringify({ email: resetEmail, password: "NewPassword456!" }),
    });
    const sessionCookie = extractSessionCookie(login);

    const beforeRes = await testApp.request("/api/test-protected", {
      headers: { cookie: sessionCookie },
    });
    expect(beforeRes.status).toBe(200);

    await requestReset(resetEmail);
    const token = await latestResetToken(resetEmail);
    const resetRes = await resetPassword(token, "FinalPassword789!");
    expect(resetRes.status).toBe(200);

    const afterRes = await testApp.request("/api/test-protected", {
      headers: { cookie: sessionCookie },
    });
    expect(afterRes.status).toBe(401);

    const newLogin = await testApp.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:4000" },
      body: JSON.stringify({ email: resetEmail, password: "FinalPassword789!" }),
    });
    expect(newLogin.status).toBe(200);
  });
});
