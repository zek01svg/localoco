/**
 * @vitest-environment node
 */
import type { AppType } from "#server/index";
import type { db as dbInstance } from "#server/lib/db";
import type { TestAppEnv } from "./auth-helpers";
import type { Context, Hono, MiddlewareHandler, Next } from "hono";

import { eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { user } from "#server/database/auth";
import { administrator, business, businessOwnershipAudit } from "#server/database/business";
import { emailDelivery } from "#server/database/email";
import { businessCreationResponseSchema } from "#shared/contracts/business";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import { ownerListingSchema } from "#shared/contracts/listings";

import {
  createTestHonoApp,
  extractSessionCookie,
  registerUser,
  startPostgresContainer,
} from "./auth-helpers";

import { randomUUID } from "node:crypto";

vi.mock("hono/bun", () => ({
  serveStatic: () => (_c: Context, next: Next) => next(),
}));

vi.mock("#server/lib/email/qstash", () => ({
  publishEmailJob: () => Promise.resolve({ messageId: "mock_qstash_msg_123" }),
  verifyQStashSignature: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
}));

const { mockGeocodeAddress } = vi.hoisted(() => ({
  mockGeocodeAddress: vi
    .fn<() => Promise<{ latitude: number; longitude: number }>>()
    .mockResolvedValue({ latitude: 1.2956, longitude: 103.7764 }),
}));

vi.mock("#server/lib/geocoding", async importOriginal => {
  const original = await importOriginal<typeof import("#server/lib/geocoding")>();
  return { ...original, geocodeAddress: () => mockGeocodeAddress() };
});

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
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (rows.length === 0) {
    throw new Error(`no user for ${email}`);
  }
  return rows[0].id;
};

const createBusiness = async (cookie: string, uen: string, name: string) => {
  const res = await testApp.request("/api/businesses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify({
      uen,
      listing: {
        name,
        category: "Food & Beverage",
        address: "100 Orchard Road",
        postalCode: "238840",
      },
    }),
  });
  expect(res.status).toBe(201);
  return businessCreationResponseSchema.parse(await res.json());
};

const transferOwnership = (
  businessId: string,
  cookie: string | undefined,
  body: { ownerId: string; reason: string }
) =>
  testApp.request(`/api/businesses/${businessId}/transfer-ownership`, {
    method: "POST",
    headers: cookie
      ? { "content-type": "application/json", cookie }
      : { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const getOwnedListing = (businessId: string, cookie?: string) =>
  testApp.request(`/api/businesses/${businessId}/listing`, {
    headers: cookie ? { cookie } : undefined,
  });

const patchOwnedListing = (businessId: string, cookie: string | undefined, body: object) =>
  testApp.request(`/api/businesses/${businessId}/listing`, {
    method: "PATCH",
    headers: cookie
      ? { "content-type": "application/json", cookie }
      : { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const patchBusiness = (businessId: string, cookie: string | undefined, body: object) =>
  testApp.request(`/api/businesses/${businessId}`, {
    method: "PATCH",
    headers: cookie
      ? { "content-type": "application/json", cookie }
      : { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const ownerOf = async (businessId: string) => {
  const rows = await db
    .select({ ownerId: business.ownerId })
    .from(business)
    .where(eq(business.id, businessId))
    .limit(1);
  return rows[0]?.ownerId;
};

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

describe("PRS-183: Administrative ownership transfer", () => {
  let ownerCookie: string;
  let ownerId: string;
  let takerCookie: string;
  let takerId: string;
  let adminCookie: string;
  let adminId: string;
  let unverifiedCookie: string;
  let unverifiedId: string;
  let syntheticId: string;

  beforeAll(async () => {
    await signUp("Alice Owner", "alice.transfer.owner@example.com");
    await verifyEmail("alice.transfer.owner@example.com");
    ownerCookie = await signIn("alice.transfer.owner@example.com");
    ownerId = await userId("alice.transfer.owner@example.com");

    await signUp("Bob Taker", "bob.transfer.taker@example.com");
    await verifyEmail("bob.transfer.taker@example.com");
    takerCookie = await signIn("bob.transfer.taker@example.com");
    takerId = await userId("bob.transfer.taker@example.com");

    await signUp("Dave Admin", "dave.transfer.admin@example.com");
    await verifyEmail("dave.transfer.admin@example.com");
    adminCookie = await signIn("dave.transfer.admin@example.com");
    adminId = await userId("dave.transfer.admin@example.com");
    await db.insert(administrator).values({ userId: adminId });

    unverifiedCookie = await signUp("Carol Unverified", "carol.transfer.unverified@example.com");
    unverifiedId = await userId("carol.transfer.unverified@example.com");

    // A synthetic non-login User: a user row with a verified email but no
    // account row, so it can never sign in and must never become an owner.
    syntheticId = randomUUID();
    await db.insert(user).values({
      id: syntheticId,
      name: "Synthetic Import",
      email: "synthetic.transfer@example.com",
      emailVerified: true,
    });
  });

  it("admin transfers a Business to another verified User, writing an immutable audit record", async () => {
    const biz = await createBusiness(ownerCookie, "202400151A", "Tanjong Pagar Noodle");

    const res = await transferOwnership(biz.id, adminCookie, {
      ownerId: takerId,
      reason: "Business changed hands; owner requested the transfer.",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: biz.id, uen: biz.uen });

    expect(await ownerOf(biz.id)).toBe(takerId);

    const audits = await db
      .select()
      .from(businessOwnershipAudit)
      .where(eq(businessOwnershipAudit.businessId, biz.id));
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(adminId);
    expect(audits[0].previousOwnerId).toBe(ownerId);
    expect(audits[0].nextOwnerId).toBe(takerId);
    expect(audits[0].reason).toBe("Business changed hands; owner requested the transfer.");
    expect(audits[0].createdAt).toBeInstanceOf(Date);

    // The previous owner loses access; the new owner gains it.
    const formerOwnerView = await getOwnedListing(biz.id, ownerCookie);
    expect(formerOwnerView.status).toBe(404);
    const newOwnerView = await getOwnedListing(biz.id, takerCookie);
    expect(newOwnerView.status).toBe(200);
    expect(ownerListingSchema.parse(await newOwnerView.json()).name).toBe("Tanjong Pagar Noodle");
  });

  it("rejects an absent target and leaves ownership untouched", async () => {
    const biz = await createBusiness(ownerCookie, "202400152B", "Kallang Kopi");

    const res = await transferOwnership(biz.id, adminCookie, {
      ownerId: "usr_does_not_exist",
      reason: "Typo in the target id.",
    });
    expect(res.status).toBe(400);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("invalid_request");
    expect(await ownerOf(biz.id)).toBe(ownerId);

    const audits = await db
      .select({ id: businessOwnershipAudit.id })
      .from(businessOwnershipAudit)
      .where(eq(businessOwnershipAudit.businessId, biz.id));
    expect(audits).toHaveLength(0);
  });

  it("rejects a synthetic non-login User and leaves ownership untouched", async () => {
    const biz = await createBusiness(ownerCookie, "202400153C", "Bugis Burger");

    const res = await transferOwnership(biz.id, adminCookie, {
      ownerId: syntheticId,
      reason: "Import placeholder selected by mistake.",
    });
    expect(res.status).toBe(400);
    expect(await ownerOf(biz.id)).toBe(ownerId);
  });

  it("rejects an unverified target and leaves ownership untouched", async () => {
    const biz = await createBusiness(ownerCookie, "202400154D", "Raffles Roti");

    const res = await transferOwnership(biz.id, adminCookie, {
      ownerId: unverifiedId,
      reason: "Target never verified their email.",
    });
    expect(res.status).toBe(400);
    expect(await ownerOf(biz.id)).toBe(ownerId);
  });

  it("rejects transferring a Business to its current owner with 409 conflict", async () => {
    const biz = await createBusiness(ownerCookie, "202400155E", "Novena Nasi");

    const res = await transferOwnership(biz.id, adminCookie, {
      ownerId: ownerId,
      reason: "No-op transfer.",
    });
    expect(res.status).toBe(409);
    expect(await ownerOf(biz.id)).toBe(ownerId);
  });

  it("answers 404 for a Business that does not exist", async () => {
    const res = await transferOwnership("biz_missing", adminCookie, {
      ownerId: takerId,
      reason: "Target business is gone.",
    });
    expect(res.status).toBe(404);
  });

  it("enforces the authorization matrix: anonymous 401, non-admin owner 403, unverified 403", async () => {
    const biz = await createBusiness(ownerCookie, "202400156F", "Somerset Sate");

    const anon = await transferOwnership(biz.id, undefined, {
      ownerId: takerId,
      reason: "Anonymous attempt.",
    });
    expect(anon.status).toBe(401);

    // The current owner cannot transfer their own Business.
    const nonAdmin = await transferOwnership(biz.id, ownerCookie, {
      ownerId: takerId,
      reason: "Self-transfer attempt.",
    });
    expect(nonAdmin.status).toBe(403);

    const unverified = await transferOwnership(biz.id, unverifiedCookie, {
      ownerId: takerId,
      reason: "Unverified attempt.",
    });
    expect(unverified.status).toBe(403);

    expect(await ownerOf(biz.id)).toBe(ownerId);
  });

  it("a Listing update carrying an owner identifier never changes ownership", async () => {
    const biz = await createBusiness(ownerCookie, "202400157G", "Tiong Bahru Tea");

    const listingRes = await patchOwnedListing(biz.id, ownerCookie, {
      ownerId: takerId,
      businessId: "biz_forged",
      phone: "69998888",
    });
    expect(listingRes.status).toBe(200);
    expect(await ownerOf(biz.id)).toBe(ownerId);

    const businessRes = await patchBusiness(biz.id, ownerCookie, {
      uen: "202400158H",
      ownerId: takerId,
    });
    expect(businessRes.status).toBe(200);
    expect(await ownerOf(biz.id)).toBe(ownerId);
  });

  it("validates the request body: missing reason and missing ownerId answer 400", async () => {
    const biz = await createBusiness(ownerCookie, "202400159I", "Bishan Bakmie");

    const missingReason = await transferOwnership(biz.id, adminCookie, {
      ownerId: takerId,
      reason: "   ",
    });
    expect(missingReason.status).toBe(400);

    const missingOwner = await testApp.request(`/api/businesses/${biz.id}/transfer-ownership`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: adminCookie },
      body: JSON.stringify({ reason: "No target submitted." }),
    });
    expect(missingOwner.status).toBe(400);
  });
});
