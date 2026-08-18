/**
 * @vitest-environment node
 */
import type { AppType } from "#server/index";
import type { db as dbInstance } from "#server/lib/db";
import type { TestAppEnv } from "./auth-helpers";
import type { Context, Hono, MiddlewareHandler, Next } from "hono";

import { eq } from "drizzle-orm";
import { Client } from "pg";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { user } from "#server/database/auth";
import { administrator, business } from "#server/database/business";
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
let sql: ReturnType<typeof postgres>;

let app: AppType;
let testApp: Hono<TestAppEnv>;
let db: typeof dbInstance;
let requireAuth: MiddlewareHandler;
let requireVerified: MiddlewareHandler;

const PASSWORD = "Password123!";
const ORIGIN = "http://localhost:4000";

const signIn = async (email: string) => {
  const res = await testApp.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  expect(res.status).toBe(200);
  return extractSessionCookie(res);
};

const signUp = async (name: string, email: string) => {
  const res = await registerUser(testApp, { name, email, password: PASSWORD });
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

const seedBusiness = (ownerId: string, uen: string) =>
  db.insert(business).values({ ownerId, uen }).returning({ id: business.id });

const patchBusiness = (id: string, cookie: string | undefined, body: object) =>
  testApp.request(`/api/businesses/${id}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });

const patchBusinessUen = (id: string, cookie?: string) =>
  patchBusiness(id, cookie, { uen: "UEN-EDITED" });

beforeAll(async () => {
  const started = await startPostgresContainer();
  container = started.container;
  sql = postgres(started.databaseUrl, { max: 2 });

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
  await sql.end({ timeout: 5 });
  await container.stop();
});

describe("authorization matrix over PATCH /api/businesses/:id", () => {
  let aliceId: string;
  let bobId: string;
  let aliceCookie: string;
  let bobCookie: string;
  let unverifiedCookie: string;
  let adminCookie: string;
  let bizA: { id: string };
  let bizB: { id: string };

  beforeAll(async () => {
    aliceCookie = await signUp("Alice", "alice.owner@example.com");
    bobCookie = await signUp("Bob", "bob.owner@example.com");
    unverifiedCookie = await signUp("Carol", "carol.unverified@example.com");
    await signUp("Dave", "dave.admin@example.com");

    await verifyEmail("alice.owner@example.com");
    await verifyEmail("bob.owner@example.com");
    await verifyEmail("dave.admin@example.com");
    aliceCookie = await signIn("alice.owner@example.com");
    bobCookie = await signIn("bob.owner@example.com");
    adminCookie = await signIn("dave.admin@example.com");

    aliceId = await userId("alice.owner@example.com");
    bobId = await userId("bob.owner@example.com");
    const daveId = await userId("dave.admin@example.com");
    await db.insert(administrator).values({ userId: daveId });

    [bizA] = await seedBusiness(aliceId, "UEN-ALICE-1");
    [bizB] = await seedBusiness(bobId, "UEN-BOB-1");
  });

  it("rejects anonymous with 401 unauthorized", async () => {
    const res = await patchBusinessUen(bizA.id);
    expect(res.status).toBe(401);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("unauthorized");
  });

  it("rejects an unverified user with 403 forbidden", async () => {
    const res = await patchBusinessUen(bizA.id, unverifiedCookie);
    expect(res.status).toBe(403);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("forbidden");
  });

  it("rejects a verified user who owns nothing with 404 not_found", async () => {
    const eveCookie = await signUp("Eve", "eve.verified@example.com");
    await verifyEmail("eve.verified@example.com");
    const verifiedEveCookie = await signIn("eve.verified@example.com");

    const res = await patchBusinessUen(bizA.id, verifiedEveCookie);
    expect(res.status).toBe(404);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("not_found");
    void eveCookie;
  });

  it("rejects the owner of another business with 404 not_found", async () => {
    const res = await patchBusinessUen(bizA.id, bobCookie);
    expect(res.status).toBe(404);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("not_found");
  });

  it("allows the resource owner", async () => {
    const res = await patchBusiness(bizA.id, aliceCookie, { uen: "UEN-ALICE-EDITED" });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ id: bizA.id, uen: "UEN-ALICE-EDITED" });

    const [row] = await db
      .select({ uen: business.uen })
      .from(business)
      .where(eq(business.id, bizA.id));
    expect(row.uen).toBe("UEN-ALICE-EDITED");
  });

  it("allows an administrator who owns nothing", async () => {
    const res = await patchBusiness(bizA.id, adminCookie, { uen: "UEN-ALICE-ADMIN" });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ id: bizA.id, uen: "UEN-ALICE-ADMIN" });
  });

  it("does not reveal resource existence: missing and unauthorized answer identically", async () => {
    const missing = await patchBusinessUen("no-such-business", aliceCookie);
    const unauthorized = await patchBusinessUen(bizB.id, aliceCookie);

    expect(missing.status).toBe(404);
    expect(unauthorized.status).toBe(404);

    // The envelopes differ only by requestId; code and message must match.
    const missingBody = errorEnvelopeSchema.parse(await missing.json());
    const unauthorizedBody = errorEnvelopeSchema.parse(await unauthorized.json());
    expect(missingBody.error.code).toBe(unauthorizedBody.error.code);
    expect(missingBody.error.message).toBe(unauthorizedBody.error.message);
  });

  it("ignores a client-supplied owner identifier in the body", async () => {
    const asOwner = await patchBusiness(bizA.id, aliceCookie, {
      uen: "UEN-ALICE-SELF",
      ownerId: bobId,
    });
    expect(asOwner.status).toBe(200);
    await expect(asOwner.json()).resolves.toEqual({ id: bizA.id, uen: "UEN-ALICE-SELF" });

    const asNonOwner = await patchBusiness(bizA.id, bobCookie, {
      uen: "UEN-TAMPERED",
      ownerId: aliceId,
    });
    expect(asNonOwner.status).toBe(404);
  });

  it("rejects a malformed body at the trust boundary with 400", async () => {
    const res = await patchBusiness(bizA.id, aliceCookie, { uen: "" });
    expect(res.status).toBe(400);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("invalid_request");
  });
});

describe("client-side business selection never affects authorization", () => {
  let ginaCookie: string;
  let bizG: { id: string };
  let bizB: { id: string };

  beforeAll(async () => {
    await signUp("Gina", "gina.verified@example.com");
    await verifyEmail("gina.verified@example.com");
    ginaCookie = await signIn("gina.verified@example.com");
    const ginaId = await userId("gina.verified@example.com");
    const bobId = await userId("bob.owner@example.com");
    [bizG] = await seedBusiness(ginaId, "UEN-GINA-1");
    [bizB] = await seedBusiness(bobId, "UEN-BOB-2");
  });

  it("lists only the session user's businesses, ignoring a selected foreign business", async () => {
    const res = await testApp.request(`/api/businesses?selected=${bizB.id}`, {
      headers: { cookie: ginaCookie },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    await expect(res.json()).resolves.toEqual({
      items: [{ id: bizG.id, uen: "UEN-GINA-1" }],
      selectedId: null,
    });
  });

  it("echoes a selected business only when the session user owns it", async () => {
    const res = await testApp.request(`/api/businesses?selected=${bizG.id}`, {
      headers: { cookie: ginaCookie },
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      items: [{ id: bizG.id, uen: "UEN-GINA-1" }],
      selectedId: bizG.id,
    });
  });

  it("still gates the list by session: anonymous is 401 and unverified is 403", async () => {
    const anonymous = await testApp.request("/api/businesses");
    expect(anonymous.status).toBe(401);

    const unverifiedCookie = await signUp("Frank", "frank.unverified@example.com");
    const unverified = await testApp.request("/api/businesses", {
      headers: { cookie: unverifiedCookie },
    });
    expect(unverified.status).toBe(403);
  });
});

describe("concurrency: ownership changes between read and write", () => {
  it("denies the write when the owner changes after the read, and leaves the row untouched", async () => {
    const aliceCookie = await signIn("alice.owner@example.com");
    const bobCookie = await signIn("bob.owner@example.com");
    const aliceId = await userId("alice.owner@example.com");
    const bobId = await userId("bob.owner@example.com");
    const [bizC] = await seedBusiness(aliceId, "UEN-ALICE-3");

    // Swap ownership on a separate connection and hold the row lock while
    // the handler's own transaction runs: its read passes under the old
    // ownership, its UPDATE blocks on the lock, and after the commit the
    // write predicate is re-evaluated against the new owner.
    const swapClient = new Client({ connectionString: process.env.DATABASE_URL });
    await swapClient.connect();
    try {
      await swapClient.query("BEGIN");
      await swapClient.query(`UPDATE business SET owner_id = $1 WHERE id = $2`, [bobId, bizC.id]);

      const patchPromise = patchBusinessUen(bizC.id, aliceCookie);

      // Wait until the handler's UPDATE is actually parked on our lock, so
      // the test exercises the read-passed / write-denied interleaving.
      const deadline = Date.now() + 45_000;
      let blocked = false;
      while (Date.now() < deadline && !blocked) {
        const [row] = await sql<{ n: number }[]>`
            select count(*)::int as n from pg_stat_activity
            where wait_event_type = 'Lock' and query ilike 'update "business"%'
          `;
        blocked = Boolean(row.n);
        if (!blocked) {
          await new Promise<void>(resolve => {
            setTimeout(resolve, 100);
          });
        }
      }
      expect(blocked, "handler UPDATE never blocked on the ownership swap").toBe(true);

      await swapClient.query("COMMIT");
      const res = await patchPromise;
      expect(res.status).toBe(404);
    } finally {
      await swapClient.end();
    }

    const [row] = await db
      .select({ uen: business.uen, ownerId: business.ownerId })
      .from(business)
      .where(eq(business.id, bizC.id));
    expect(row).toEqual({ uen: "UEN-ALICE-3", ownerId: bobId });

    const asNewOwner = await patchBusiness(bizC.id, bobCookie, { uen: "UEN-BOB-3" });
    expect(asNewOwner.status).toBe(200);
  }, 60_000);
});
