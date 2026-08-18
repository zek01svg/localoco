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
import { administrator } from "#server/database/business";
import { emailDelivery } from "#server/database/email";
import { listingModerationAudit } from "#server/database/listing";
import { businessCreationResponseSchema } from "#shared/contracts/business";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  listingAuditsResponseSchema,
  listingsResponseSchema,
  ownerListingSchema,
} from "#shared/contracts/listings";

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

const submitForReview = (businessId: string, cookie?: string) =>
  testApp.request(`/api/businesses/${businessId}/listing/submit`, {
    method: "POST",
    headers: cookie
      ? { "content-type": "application/json", cookie }
      : { "content-type": "application/json" },
  });

const moderateListing = (
  businessId: string,
  cookie: string | undefined,
  body: { action: string; reason: string }
) =>
  testApp.request(`/api/businesses/${businessId}/listing/moderate`, {
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

const getAuditHistory = (businessId: string, cookie?: string) =>
  testApp.request(`/api/businesses/${businessId}/listing/audit`, {
    headers: cookie ? { cookie } : undefined,
  });

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

describe("PRS-182: Listing moderation lifecycle and audit", () => {
  let ownerCookie: string;
  let otherOwnerCookie: string;
  let adminCookie: string;
  let adminId: string;
  let unverifiedCookie: string;

  beforeAll(async () => {
    await signUp("Alice Owner", "alice.mod.owner@example.com");
    await verifyEmail("alice.mod.owner@example.com");
    ownerCookie = await signIn("alice.mod.owner@example.com");

    await signUp("Bob Other", "bob.mod.other@example.com");
    await verifyEmail("bob.mod.other@example.com");
    otherOwnerCookie = await signIn("bob.mod.other@example.com");

    await signUp("Dave Admin", "dave.mod.admin@example.com");
    await verifyEmail("dave.mod.admin@example.com");
    adminCookie = await signIn("dave.mod.admin@example.com");
    adminId = await userId("dave.mod.admin@example.com");
    await db.insert(administrator).values({ userId: adminId });

    unverifiedCookie = await signUp("Carol Unverified", "carol.mod.unverified@example.com");
  });

  describe("Owner submission for review", () => {
    it("transitions a draft listing to pending_review", async () => {
      const biz = await createBusiness(ownerCookie, "202000001A", "Cafe Sunrise");

      // Verify created as draft
      const readDraft = await getOwnedListing(biz.id, ownerCookie);
      const draftData = ownerListingSchema.parse(await readDraft.json());
      expect(draftData.status).toBe("draft");

      // Submit for review
      const res = await submitForReview(biz.id, ownerCookie);
      expect(res.status).toBe(200);
      const data = ownerListingSchema.parse(await res.json());
      expect(data.status).toBe("pending_review");
      expect(data.rejectionReason).toBeNull();
    });

    it("rejects duplicate submission when already pending_review with 409 conflict", async () => {
      const biz = await createBusiness(ownerCookie, "202000002B", "Cafe Noon");
      await submitForReview(biz.id, ownerCookie);

      const res = await submitForReview(biz.id, ownerCookie);
      expect(res.status).toBe(409);
      const body = errorEnvelopeSchema.parse(await res.json());
      expect(body.error.code).toBe("conflict");
    });

    it("rejects submission from an unauthorized user with 404 not_found", async () => {
      const biz = await createBusiness(ownerCookie, "202000003C", "Cafe Sunset");
      const res = await submitForReview(biz.id, otherOwnerCookie);
      expect(res.status).toBe(404);
    });

    it("enforces authentication (401) and email verification (403)", async () => {
      const biz = await createBusiness(ownerCookie, "202000004D", "Cafe Night");

      const anon = await submitForReview(biz.id);
      expect(anon.status).toBe(401);

      const unverified = await submitForReview(biz.id, unverifiedCookie);
      expect(unverified.status).toBe(403);
    });
  });

  describe("Administrative Moderation (Publish, Reject, Suspend)", () => {
    it("admin publishes a pending_review listing with reason, writing an audit record", async () => {
      const biz = await createBusiness(ownerCookie, "202000005E", "Orchard Bakery");
      await submitForReview(biz.id, ownerCookie);

      const res = await moderateListing(biz.id, adminCookie, {
        action: "publish",
        reason: "Valid business documentation verified.",
      });
      expect(res.status).toBe(200);
      const data = ownerListingSchema.parse(await res.json());
      expect(data.status).toBe("published");
      expect(data.rejectionReason).toBeNull();

      // Verify audit record in database
      const audits = await db
        .select()
        .from(listingModerationAudit)
        .where(eq(listingModerationAudit.listingId, biz.listing.id));
      expect(audits).toHaveLength(1);
      expect(audits[0].actorId).toBe(adminId);
      expect(audits[0].previousStatus).toBe("pending_review");
      expect(audits[0].nextStatus).toBe("published");
      expect(audits[0].reason).toBe("Valid business documentation verified.");
    });

    it("admin rejects a pending_review listing with reason; owner sees reason and can re-submit", async () => {
      const biz = await createBusiness(ownerCookie, "202000006F", "River Valley Bistro");
      await submitForReview(biz.id, ownerCookie);

      const res = await moderateListing(biz.id, adminCookie, {
        action: "reject",
        reason: "Business name does not match UEN registration.",
      });
      expect(res.status).toBe(200);
      const data = ownerListingSchema.parse(await res.json());
      expect(data.status).toBe("rejected");
      expect(data.rejectionReason).toBe("Business name does not match UEN registration.");

      // Owner reads their listing and sees rejectionReason
      const ownerView = await getOwnedListing(biz.id, ownerCookie);
      const ownerData = ownerListingSchema.parse(await ownerView.json());
      expect(ownerData.status).toBe("rejected");
      expect(ownerData.rejectionReason).toBe("Business name does not match UEN registration.");

      // Owner addresses feedback and re-submits
      const resubmit = await submitForReview(biz.id, ownerCookie);
      expect(resubmit.status).toBe(200);
      const resubmittedData = ownerListingSchema.parse(await resubmit.json());
      expect(resubmittedData.status).toBe("pending_review");
      expect(resubmittedData.rejectionReason).toBeNull();
    });

    it("admin suspends a published listing, and can unsuspend/publish it later", async () => {
      const biz = await createBusiness(ownerCookie, "202000007G", "Marina Bay Desserts");
      await submitForReview(biz.id, ownerCookie);
      await moderateListing(biz.id, adminCookie, {
        action: "publish",
        reason: "Initial launch approval.",
      });

      // Suspend
      const suspendRes = await moderateListing(biz.id, adminCookie, {
        action: "suspend",
        reason: "Reported for incorrect operating address.",
      });
      expect(suspendRes.status).toBe(200);
      const suspendedData = ownerListingSchema.parse(await suspendRes.json());
      expect(suspendedData.status).toBe("suspended");
      expect(suspendedData.rejectionReason).toBe("Reported for incorrect operating address.");

      // Owner cannot re-submit a suspended listing
      const ownerSubmit = await submitForReview(biz.id, ownerCookie);
      expect(ownerSubmit.status).toBe(409);

      // Admin unsuspends / publishes
      const unsuspendRes = await moderateListing(biz.id, adminCookie, {
        action: "publish",
        reason: "Address proof submitted and verified.",
      });
      expect(unsuspendRes.status).toBe(200);
      const republishedData = ownerListingSchema.parse(await unsuspendRes.json());
      expect(republishedData.status).toBe("published");
      expect(republishedData.rejectionReason).toBeNull();
    });

    it("rejects moderation actions missing a reason with 400 invalid_request", async () => {
      const biz = await createBusiness(ownerCookie, "202000008H", "Sentosa Grill");
      await submitForReview(biz.id, ownerCookie);

      const emptyReason = await moderateListing(biz.id, adminCookie, {
        action: "publish",
        reason: "   ",
      });
      expect(emptyReason.status).toBe(400);
    });

    it("rejects illegal administrative transitions with 409 conflict", async () => {
      const biz = await createBusiness(ownerCookie, "202000009I", "Jurong Eats");

      // Cannot reject a draft
      const rejectDraft = await moderateListing(biz.id, adminCookie, {
        action: "reject",
        reason: "Not submitted yet",
      });
      expect(rejectDraft.status).toBe(409);

      // Cannot suspend a draft
      const suspendDraft = await moderateListing(biz.id, adminCookie, {
        action: "suspend",
        reason: "Not published",
      });
      expect(suspendDraft.status).toBe(409);

      // Submit
      await submitForReview(biz.id, ownerCookie);

      // Cannot suspend pending_review
      const suspendPending = await moderateListing(biz.id, adminCookie, {
        action: "suspend",
        reason: "Not published",
      });
      expect(suspendPending.status).toBe(409);

      // Publish
      await moderateListing(biz.id, adminCookie, {
        action: "publish",
        reason: "Approved",
      });

      // Cannot publish an already published listing
      const publishPublished = await moderateListing(biz.id, adminCookie, {
        action: "publish",
        reason: "Already published",
      });
      expect(publishPublished.status).toBe(409);

      // Cannot reject a published listing (must suspend instead)
      const rejectPublished = await moderateListing(biz.id, adminCookie, {
        action: "reject",
        reason: "Already published",
      });
      expect(rejectPublished.status).toBe(409);
    });

    it("enforces admin authorization matrix on POST /moderate", async () => {
      const biz = await createBusiness(ownerCookie, "202000010J", "Tampines Tea");
      await submitForReview(biz.id, ownerCookie);

      // Anonymous
      const anon = await moderateListing(biz.id, undefined, {
        action: "publish",
        reason: "Approve",
      });
      expect(anon.status).toBe(401);

      // Non-admin owner
      const nonAdmin = await moderateListing(biz.id, ownerCookie, {
        action: "publish",
        reason: "Self-approve attempt",
      });
      expect(nonAdmin.status).toBe(403);

      // Unverified user
      const unverified = await moderateListing(biz.id, unverifiedCookie, {
        action: "publish",
        reason: "Unverified attempt",
      });
      expect(unverified.status).toBe(403);
    });
  });

  describe("Public Discovery Isolation", () => {
    it("returns ONLY published listings in GET /api/listings", async () => {
      // 1. Draft
      const bizDraft = await createBusiness(ownerCookie, "202000011K", "Public Discovery Draft");

      // 2. Pending review
      const bizPending = await createBusiness(
        ownerCookie,
        "202000012L",
        "Public Discovery Pending"
      );
      await submitForReview(bizPending.id, ownerCookie);

      // 3. Rejected
      const bizRejected = await createBusiness(
        ownerCookie,
        "202000013M",
        "Public Discovery Rejected"
      );
      await submitForReview(bizRejected.id, ownerCookie);
      await moderateListing(bizRejected.id, adminCookie, {
        action: "reject",
        reason: "Incomplete details",
      });

      // 4. Suspended
      const bizSuspended = await createBusiness(
        ownerCookie,
        "202000014N",
        "Public Discovery Suspended"
      );
      await submitForReview(bizSuspended.id, ownerCookie);
      await moderateListing(bizSuspended.id, adminCookie, {
        action: "publish",
        reason: "Initial approval",
      });
      await moderateListing(bizSuspended.id, adminCookie, {
        action: "suspend",
        reason: "Suspended for review",
      });

      // 5. Published
      const bizPublished = await createBusiness(
        ownerCookie,
        "202000015O",
        "Public Discovery Published"
      );
      await submitForReview(bizPublished.id, ownerCookie);
      await moderateListing(bizPublished.id, adminCookie, {
        action: "publish",
        reason: "Approved for public",
      });

      // Query public listings
      const publicRes = await testApp.request("/api/listings");
      expect(publicRes.status).toBe(200);
      const publicData = listingsResponseSchema.parse(await publicRes.json());
      const publicIds = publicData.items.map(item => item.id);

      expect(publicIds).toContain(bizPublished.listing.id);
      expect(publicIds).not.toContain(bizDraft.listing.id);
      expect(publicIds).not.toContain(bizPending.listing.id);
      expect(publicIds).not.toContain(bizRejected.listing.id);
      expect(publicIds).not.toContain(bizSuspended.listing.id);
    });
  });

  describe("Editing a published listing demotes it to pending_review", () => {
    it("demotes published listing to pending_review on PATCH, removing it from public discovery", async () => {
      const biz = await createBusiness(ownerCookie, "202000016P", "Woodlands Coffee");
      await submitForReview(biz.id, ownerCookie);
      await moderateListing(biz.id, adminCookie, {
        action: "publish",
        reason: "Approved",
      });

      // Confirm it is published
      const checkPublished = await getOwnedListing(biz.id, ownerCookie);
      expect(ownerListingSchema.parse(await checkPublished.json()).status).toBe("published");

      // Owner edits phone number
      const patchRes = await patchOwnedListing(biz.id, ownerCookie, {
        phone: "69998888",
      });
      expect(patchRes.status).toBe(200);
      const patchedData = ownerListingSchema.parse(await patchRes.json());
      expect(patchedData.status).toBe("pending_review");
      expect(patchedData.phone).toBe("69998888");

      // Verify no longer appears in public discovery
      const publicRes = await testApp.request("/api/listings");
      const publicData = listingsResponseSchema.parse(await publicRes.json());
      expect(publicData.items.some(item => item.id === biz.listing.id)).toBe(false);
    });

    it("preserves draft status when editing a draft listing", async () => {
      const biz = await createBusiness(ownerCookie, "202000017Q", "Bedok Noodle");
      const patchRes = await patchOwnedListing(biz.id, ownerCookie, {
        website: "https://bedoknoodle.sg",
      });
      expect(patchRes.status).toBe(200);
      const patchedData = ownerListingSchema.parse(await patchRes.json());
      expect(patchedData.status).toBe("draft");
    });

    it("ignores client-supplied status in PATCH payload (cannot self-publish)", async () => {
      const biz = await createBusiness(ownerCookie, "202000018R", "Kallang Roastery");
      const patchRes = await patchOwnedListing(biz.id, ownerCookie, {
        status: "published",
        priceRange: "$10-$20",
      });
      expect(patchRes.status).toBe(200);
      const patchedData = ownerListingSchema.parse(await patchRes.json());
      expect(patchedData.status).toBe("draft");
    });
  });

  describe("Administrative Audit Trail", () => {
    it("records full audit history accessible via GET /api/businesses/:id/listing/audit", async () => {
      const biz = await createBusiness(ownerCookie, "202000019S", "Changi Cafe");
      await submitForReview(biz.id, ownerCookie);

      // 1. Reject
      await moderateListing(biz.id, adminCookie, {
        action: "reject",
        reason: "Initial submission lacked postal verification.",
      });

      // Re-submit
      await submitForReview(biz.id, ownerCookie);

      // 2. Publish
      await moderateListing(biz.id, adminCookie, {
        action: "publish",
        reason: "Postal proof accepted.",
      });

      // 3. Suspend
      await moderateListing(biz.id, adminCookie, {
        action: "suspend",
        reason: "Temporary investigation.",
      });

      // Query audit history as admin
      const auditRes = await getAuditHistory(biz.id, adminCookie);
      expect(auditRes.status).toBe(200);
      const history = listingAuditsResponseSchema.parse(await auditRes.json());

      expect(history.items).toHaveLength(3);

      expect(history.items[0].previousStatus).toBe("pending_review");
      expect(history.items[0].nextStatus).toBe("rejected");
      expect(history.items[0].reason).toBe("Initial submission lacked postal verification.");
      expect(history.items[0].actorId).toBe(adminId);

      expect(history.items[1].previousStatus).toBe("pending_review");
      expect(history.items[1].nextStatus).toBe("published");
      expect(history.items[1].reason).toBe("Postal proof accepted.");

      expect(history.items[2].previousStatus).toBe("published");
      expect(history.items[2].nextStatus).toBe("suspended");
      expect(history.items[2].reason).toBe("Temporary investigation.");

      // Non-admin cannot read audit history
      const ownerAuditRes = await getAuditHistory(biz.id, ownerCookie);
      expect(ownerAuditRes.status).toBe(403);
    });
  });
});
