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
import { emailDelivery } from "#server/database/email";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import { privateProfileSchema } from "#shared/contracts/profiles";

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

const PASSWORD = "Password123!";
const ORIGIN = "http://localhost:4000";

const signUp = async (name: string, email: string) => {
  const res = await registerUser(testApp, { name, email, password: PASSWORD });
  expect(res.status).toBe(200);
  return extractSessionCookie(res);
};

const signIn = async (email: string) => {
  const res = await testApp.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  expect(res.status).toBe(200);
  return extractSessionCookie(res);
};

const verifyEmail = async (email: string) => {
  const emails = await db.select().from(emailDelivery).where(eq(emailDelivery.recipient, email));
  const token = emails[0]?.htmlBody.match(/token=([^&"'\s]+)/u)?.[1];
  expect(token, `no verification token for ${email}`).toBeTruthy();
  const res = await testApp.request(`/api/auth/verify-email?token=${token}`, {
    headers: { origin: ORIGIN },
  });
  expect(res.status).toBe(200);
};

const userId = async (email: string) => {
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  expect(row, `no user for ${email}`).toBeTruthy();
  return row.id;
};

const getProfile = (cookie?: string) =>
  testApp.request("/api/profile", {
    headers: cookie ? { cookie } : {},
  });

const patchProfile = (cookie: string | undefined, body: object) =>
  testApp.request("/api/profile", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });

const changeEmail = (cookie: string | undefined, body: object) =>
  testApp.request("/api/profile/email-change", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });

const clickVerifyLink = async (recipient: string, expectedCount: number) => {
  const emails = await db
    .select({ htmlBody: emailDelivery.htmlBody })
    .from(emailDelivery)
    .where(eq(emailDelivery.recipient, recipient));
  expect(emails, `no email queued for ${recipient}`).toHaveLength(expectedCount);
  const latest = emails[expectedCount - 1];
  const token = latest.htmlBody.match(/token=([^&"'\s]+)/u)?.[1];
  expect(token, `no verification token in email to ${recipient}`).toBeTruthy();
  return token ?? "";
};

beforeAll(async () => {
  const started = await startPostgresContainer();
  container = started.container;

  process.env.DATABASE_URL = started.databaseUrl;
  process.env.BETTER_AUTH_SECRET = "super-secret-test-key-32-chars-long!!";
  process.env.NODE_ENV = "test";
  process.env.VITE_APP_URL = ORIGIN;

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

describe("GET /api/profile", () => {
  let aliceId: string;
  let aliceCookie: string;
  let bobId: string;

  beforeAll(async () => {
    aliceCookie = await signUp("Alice Tan", "alice.me@example.com");
    bobId = await signUp("Bob Lee", "bob.me@example.com");
    aliceId = await userId("alice.me@example.com");
    await verifyEmail("alice.me@example.com");
  });

  it("rejects anonymous visitors with 401 unauthorized", async () => {
    const res = await getProfile();
    expect(res.status).toBe(401);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("unauthorized");
  });

  it("returns the exact private shape for the session user, never cached", async () => {
    const res = await getProfile(aliceCookie);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");

    const body = privateProfileSchema.parse(await res.json());
    expect(body).toMatchObject({
      id: aliceId,
      displayName: "Alice Tan",
      avatarUrl: null,
      email: "alice.me@example.com",
      emailVerified: true,
    });
    // The wire carried an ISO string; the contract coerces it to a Date.
    expect(body.createdAt).toBeInstanceOf(Date);
  });

  it("ignores a submitted identifier: ?userId= for another User still returns the session user", async () => {
    const res = await testApp.request(`/api/profile?userId=${bobId}`, {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = privateProfileSchema.parse(await res.json());
    expect(body).toMatchObject({ id: aliceId, email: "alice.me@example.com" });
    expect(body.id).not.toBe(bobId);
  });

  it("lets an unverified User read their own profile", async () => {
    const carolCookie = await signUp("Carol Lim", "carol.me@example.com");
    const res = await getProfile(carolCookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      email: "carol.me@example.com",
      emailVerified: false,
    });
  });
});

describe("PATCH /api/profile", () => {
  let aliceId: string;
  let aliceCookie: string;
  let bobId: string;

  beforeAll(async () => {
    aliceCookie = await signUp("Alice Tan", "alice.edit@example.com");
    bobId = await signUp("Bob Lee", "bob.edit@example.com");
    aliceId = await userId("alice.edit@example.com");
    await verifyEmail("alice.edit@example.com");
    await signIn("alice.edit@example.com");
  });

  it("rejects anonymous visitors with 401", async () => {
    const res = await patchProfile(undefined, { displayName: "Hacker" });
    expect(res.status).toBe(401);
  });

  it("rejects an unverified User with 403", async () => {
    const daveCookie = await signUp("Dave Unverified", "dave.edit@example.com");
    const res = await patchProfile(daveCookie, { displayName: "Dave" });
    expect(res.status).toBe(403);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("forbidden");
  });

  it("updates displayName and avatarUrl and returns the private profile", async () => {
    const res = await patchProfile(aliceCookie, {
      displayName: "Alice Tan Edited",
      avatarUrl: "https://cdn.example.com/alice-new.png",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      id: aliceId,
      displayName: "Alice Tan Edited",
      avatarUrl: "https://cdn.example.com/alice-new.png",
    });

    const [row] = await db
      .select({ name: user.name, image: user.image })
      .from(user)
      .where(eq(user.id, aliceId));
    expect(row).toEqual({
      name: "Alice Tan Edited",
      image: "https://cdn.example.com/alice-new.png",
    });
  });

  it("ignores a submitted identifier in the body: another User's id changes nothing for them", async () => {
    const before = await db.select().from(user).where(eq(user.id, bobId));

    const res = await patchProfile(aliceCookie, {
      displayName: "Alice Tampered",
      id: bobId,
      userId: bobId,
    });
    expect(res.status).toBe(200);
    const body = privateProfileSchema.parse(await res.json());
    expect(body.id).toBe(aliceId);
    expect(body.displayName).toBe("Alice Tampered");

    const [after] = await db.select().from(user).where(eq(user.id, bobId));
    expect(after).toEqual(before[0]);
  });

  it("clears the avatar when avatarUrl is null", async () => {
    const res = await patchProfile(aliceCookie, { avatarUrl: null });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ avatarUrl: null });
  });

  it("rejects malformed bodies at the trust boundary with 400", async () => {
    const empty = await patchProfile(aliceCookie, {});
    expect(empty.status).toBe(400);
    const emptyBody = errorEnvelopeSchema.parse(await empty.json());
    expect(emptyBody.error.code).toBe("invalid_request");

    const blank = await patchProfile(aliceCookie, { displayName: "   " });
    expect(blank.status).toBe(400);

    const badUrl = await patchProfile(aliceCookie, { avatarUrl: "not-a-url" });
    expect(badUrl.status).toBe(400);
  });
});

describe("POST /api/profile/email-change", () => {
  let aliceId: string;
  let aliceCookie: string;
  let bobId: string;

  beforeAll(async () => {
    aliceCookie = await signUp("Alice Tan", "alice.change@example.com");
    await verifyEmail("alice.change@example.com");
    aliceCookie = await signIn("alice.change@example.com");
    aliceId = await userId("alice.change@example.com");
    await signUp("Bob Lee", "bob.change@example.com");
    bobId = await userId("bob.change@example.com");
  });

  it("rejects anonymous visitors with 401", async () => {
    const res = await changeEmail(undefined, { email: "new@example.com" });
    expect(res.status).toBe(401);
  });

  it("rejects an unverified User with 403", async () => {
    const eveCookie = await signUp("Eve Unverified", "eve.change@example.com");
    const res = await changeEmail(eveCookie, { email: "new@example.com" });
    expect(res.status).toBe(403);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("forbidden");
  });

  it("rejects an invalid email at the trust boundary with 400", async () => {
    const res = await changeEmail(aliceCookie, { email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("rejects changing to the current email with 400", async () => {
    const res = await changeEmail(aliceCookie, {
      email: "alice.change@example.com",
    });
    expect(res.status).toBe(400);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("invalid_request");
  });

  it("runs the double opt-in: confirm at the old address, then verify the new one", async () => {
    const res = await changeEmail(aliceCookie, {
      email: "alice.new@example.com",
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "confirmation_sent" });

    // alice.change@example.com already received its signup verification
    // email, so the change-confirmation is the second one for that address.
    const confirmToken = await clickVerifyLink("alice.change@example.com", 2);
    await testApp.request(`/api/auth/verify-email?token=${confirmToken}&callbackURL=/profile`, {
      headers: { origin: ORIGIN },
    });

    const verifyToken = await clickVerifyLink("alice.new@example.com", 1);
    const final = await testApp.request(
      `/api/auth/verify-email?token=${verifyToken}&callbackURL=/profile`,
      { headers: { origin: ORIGIN } }
    );
    expect([200, 302]).toContain(final.status);

    const [row] = await db.select().from(user).where(eq(user.id, aliceId));
    expect(row).toMatchObject({
      id: aliceId,
      email: "alice.new@example.com",
      emailVerified: true,
    });
  });

  it("answers identically for a taken email without sending anything (anti-enumeration)", async () => {
    const before = await db
      .select({ id: emailDelivery.id })
      .from(emailDelivery)
      .where(eq(emailDelivery.recipient, "bob.change@example.com"));

    const res = await changeEmail(aliceCookie, {
      email: "bob.change@example.com",
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "confirmation_sent" });

    const after = await db
      .select({ id: emailDelivery.id })
      .from(emailDelivery)
      .where(eq(emailDelivery.recipient, "bob.change@example.com"));
    expect(after).toEqual(before);

    const [bobRow] = await db.select().from(user).where(eq(user.id, bobId));
    expect(bobRow.email).toBe("bob.change@example.com");
  });

  it("ignores a submitted identifier in the body", async () => {
    const res = await changeEmail(aliceCookie, {
      email: "alice.another@example.com",
      id: bobId,
    });
    expect(res.status).toBe(200);

    const [bobRow] = await db.select().from(user).where(eq(user.id, bobId));
    expect(bobRow.email).toBe("bob.change@example.com");
  });
});
