/**
 * @vitest-environment node
 */
import type { AppType } from "#server/index";
import type { db as dbInstance } from "#server/lib/db";
import type { TestAppEnv } from "./auth-helpers";
import type { Context, Hono, MiddlewareHandler, Next } from "hono";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { user } from "#server/database/auth";
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

async function registerAndGetId(payload: { name: string; email: string; password: string }) {
  const signup = await registerUser(testApp, payload);
  expect(signup.status).toBe(200);
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.email, payload.email));
  if (rows.length === 0) {
    throw new Error(`User ${payload.email} was not created`);
  }
  return rows[0]?.id ?? "";
}

describe("Public profile — anonymous viewer", () => {
  let aliceId: string;

  beforeAll(async () => {
    aliceId = await registerAndGetId({
      name: "Alice Tan",
      email: "alice.profile@example.com",
      password: "Password123!",
    });
  });

  it("returns exactly the public shape for an anonymous visitor — any private field anywhere in the body would fail the exact match", async () => {
    const res = await testApp.request(`/api/users/${aliceId}`);

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      id: aliceId,
      displayName: "Alice Tan",
      avatarUrl: null,
    });
  });

  it("answers not_found for an unknown user id", async () => {
    const res = await testApp.request("/api/users/usr_does_not_exist");

    expect(res.status).toBe(404);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("not_found");
  });
});

describe("Public profile — identical for every viewer", () => {
  let aliceId: string;

  beforeAll(async () => {
    aliceId = await registerAndGetId({
      name: "Alice Tan",
      email: "alice.viewers@example.com",
      password: "Password123!",
    });
  });

  async function signIn(email: string) {
    const login = await testApp.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:4000" },
      body: JSON.stringify({ email, password: "Password123!" }),
    });
    expect(login.status).toBe(200);
    return extractSessionCookie(login);
  }

  it("serves the same public body to another User and to the profile owner as to an anonymous visitor", async () => {
    const anonymousRes = await testApp.request(`/api/users/${aliceId}`);
    const anonymousBody = await anonymousRes.json();
    expect(anonymousRes.status).toBe(200);

    await registerAndGetId({
      name: "Bob Lee",
      email: "bob.viewers@example.com",
      password: "Password123!",
    });
    const bobCookie = await signIn("bob.viewers@example.com");
    const bobRes = await testApp.request(`/api/users/${aliceId}`, {
      headers: { cookie: bobCookie },
    });
    expect(bobRes.status).toBe(200);
    expect(await bobRes.json()).toEqual(anonymousBody);

    const aliceCookie = await signIn("alice.viewers@example.com");
    const ownerRes = await testApp.request(`/api/users/${aliceId}`, {
      headers: { cookie: aliceCookie },
    });
    expect(ownerRes.status).toBe(200);
    expect(await ownerRes.json()).toEqual(anonymousBody);
  });
});

describe("Public profile — avatar", () => {
  it("echoes the User's image as avatarUrl", async () => {
    const userId = await registerAndGetId({
      name: "Carol Lim",
      email: "carol.avatar@example.com",
      password: "Password123!",
    });

    await db
      .update(user)
      .set({ image: "https://cdn.example.com/carol.png" })
      .where(eq(user.id, userId));

    const res = await testApp.request(`/api/users/${userId}`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: userId,
      displayName: "Carol Lim",
      avatarUrl: "https://cdn.example.com/carol.png",
    });
  });
});
