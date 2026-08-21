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
import { administrator, business } from "#server/database/business";
import { emailDelivery } from "#server/database/email";
import { listing } from "#server/database/listing";
import {
  announcementAuditsResponseSchema,
  announcementItemSchema,
  announcementsResponseSchema,
} from "#shared/contracts/announcements";
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
    messageId: "mock_qstash_msg_announcements",
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
  return rows[0].id;
}

async function verifyEmail(userId: string) {
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId));
}

async function signIn(email: string, password = "Password123!") {
  const login = await testApp.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:4000" },
    body: JSON.stringify({ email, password }),
  });
  expect(login.status).toBe(200);
  return extractSessionCookie(login);
}

async function seedBusiness(
  ownerId: string,
  name: string,
  uen: string,
  status: "draft" | "pending_review" | "published" | "rejected" | "suspended" = "published"
) {
  const bizId = crypto.randomUUID();
  const listingId = crypto.randomUUID();
  const now = new Date();

  await db.insert(business).values({
    id: bizId,
    uen,
    ownerId,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(listing).values({
    id: listingId,
    businessId: bizId,
    status,
    name,
    category: "Food & Beverage",
    address: "10 Anson Road",
    postalCode: "079903",
    createdAt: now,
    updatedAt: now,
  });

  return { bizId, listingId };
}

describe("Announcements Integration Suite", () => {
  describe("Publication Requirement & Ownership (PRS-185)", () => {
    it("allows verified owner of a published business to create an announcement", async () => {
      const ownerEmail = "ann_owner1@test.com";
      const ownerId = await registerAndGetId({
        name: "Alice Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      const { bizId } = await seedBusiness(ownerId, "Alice Bakery", "T09LL0001A", "published");

      mockPublishEmailJob.mockClear();
      const emailsBefore = await db
        .select()
        .from(emailDelivery)
        .where(eq(emailDelivery.recipient, ownerEmail));

      const res = await testApp.request(`/api/businesses/${bizId}/announcements`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({
          title: "Fresh Sourdough Available Daily",
          content: "Come grab our freshly baked sourdough loaves every morning starting 8am!",
          imageUrl: "https://example.com/sourdough.jpg",
          linkUrl: "https://example.com/order",
        }),
      });

      expect(res.status).toBe(201);
      const body = announcementItemSchema.parse(await res.json());
      expect(body.title).toBe("Fresh Sourdough Available Daily");
      expect(body.status).toBe("active");
      expect(body.businessId).toBe(bizId);
      expect(body.business?.name).toBe("Alice Bakery");
      expect(body.canonicalUrl).toBe(`/announcements/${body.id}`);

      // Assert zero email/delivery side-effects
      expect(mockPublishEmailJob).not.toHaveBeenCalled();
      const emailsAfter = await db
        .select()
        .from(emailDelivery)
        .where(eq(emailDelivery.recipient, ownerEmail));
      expect(emailsAfter.length).toBe(emailsBefore.length);
    });

    it("rejects announcement creation if listing is draft, pending_review, rejected, or suspended (409 Conflict)", async () => {
      const ownerEmail = "ann_owner2@test.com";
      const ownerId = await registerAndGetId({
        name: "Bob Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      for (const st of ["draft", "pending_review", "rejected", "suspended"] as const) {
        const idx = ["draft", "pending_review", "rejected", "suspended"].indexOf(st);
        const { bizId } = await seedBusiness(ownerId, `Bob Business ${st}`, `T09LL00${idx}1X`, st);

        const res = await testApp.request(`/api/businesses/${bizId}/announcements`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie,
            origin: "http://localhost:4000",
          },
          body: JSON.stringify({
            title: "Special Offer",
            content: "50% off everything!",
          }),
        });

        expect(res.status).toBe(409);
        const err = errorEnvelopeSchema.parse(await res.json());
        expect(err.error.code).toBe("conflict");
        expect(err.error.message).toContain("published");
      }
    });

    it("rejects non-owner from creating announcements (404/403)", async () => {
      const ownerEmail = "owner_legit@test.com";
      const ownerId = await registerAndGetId({
        name: "Legit Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);

      const attackerEmail = "attacker@test.com";
      const attackerId = await registerAndGetId({
        name: "Attacker User",
        email: attackerEmail,
        password: "Password123!",
      });
      await verifyEmail(attackerId);
      const attackerCookie = await signIn(attackerEmail);

      const { bizId } = await seedBusiness(ownerId, "Legit Cafe", "T09LL9999A", "published");

      const res = await testApp.request(`/api/businesses/${bizId}/announcements`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: attackerCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({
          title: "Malicious Announcement",
          content: "I am taking over.",
        }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("Visibility Dates & Automatic Expiry Filtering", () => {
    it("automatically omits expired and future announcements from public feed", async () => {
      const ownerEmail = "date_owner@test.com";
      const ownerId = await registerAndGetId({
        name: "Date Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      const { bizId } = await seedBusiness(ownerId, "Temporal Cafe", "T09LL7777T", "published");

      const now = Date.now();
      const pastStart = new Date(now - 10 * 86400000);
      const pastEnd = new Date(now - 1 * 86400000); // expired yesterday
      const futureStart = new Date(now + 2 * 86400000); // starts in 2 days
      const futureEnd = new Date(now + 10 * 86400000);
      const activeStart = new Date(now - 1 * 86400000); // started yesterday
      const activeEnd = new Date(now + 5 * 86400000); // ends in 5 days

      // 1. Create Expired Announcement
      const resExp = await testApp.request(`/api/businesses/${bizId}/announcements`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie, origin: "http://localhost:4000" },
        body: JSON.stringify({
          title: "Expired Promo",
          content: "This promo has ended.",
          startsAt: pastStart.toISOString(),
          endsAt: pastEnd.toISOString(),
        }),
      });
      expect(resExp.status).toBe(201);
      const expItem = announcementItemSchema.parse(await resExp.json());

      // 2. Create Future Announcement
      const resFut = await testApp.request(`/api/businesses/${bizId}/announcements`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie, origin: "http://localhost:4000" },
        body: JSON.stringify({
          title: "Future Promo",
          content: "This promo will start next week.",
          startsAt: futureStart.toISOString(),
          endsAt: futureEnd.toISOString(),
        }),
      });
      expect(resFut.status).toBe(201);
      const futItem = announcementItemSchema.parse(await resFut.json());

      // 3. Create Currently Active Announcement
      const resAct = await testApp.request(`/api/businesses/${bizId}/announcements`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie, origin: "http://localhost:4000" },
        body: JSON.stringify({
          title: "Currently Active Promo",
          content: "Enjoy 20% off drinks right now!",
          startsAt: activeStart.toISOString(),
          endsAt: activeEnd.toISOString(),
        }),
      });
      expect(resAct.status).toBe(201);
      const actItem = announcementItemSchema.parse(await resAct.json());

      // Public Feed Check:
      const pubFeedRes = await testApp.request("/api/announcements");
      expect(pubFeedRes.status).toBe(200);
      const pubFeed = announcementsResponseSchema.parse(await pubFeedRes.json());

      const ids = pubFeed.items.map(i => i.id);
      expect(ids).toContain(actItem.id);
      expect(ids).not.toContain(expItem.id);
      expect(ids).not.toContain(futItem.id);

      // Public Business Announcements Check:
      const bizPubRes = await testApp.request(`/api/businesses/${bizId}/announcements`);
      expect(bizPubRes.status).toBe(200);
      const bizPub = announcementsResponseSchema.parse(await bizPubRes.json());
      const bizPubIds = bizPub.items.map(i => i.id);
      expect(bizPubIds).toContain(actItem.id);
      expect(bizPubIds).not.toContain(expItem.id);
      expect(bizPubIds).not.toContain(futItem.id);

      // Public Single Detail Check on expired:
      const singleExp = await testApp.request(`/api/announcements/${expItem.id}`);
      expect(singleExp.status).toBe(404);

      // Owner Feed Check (sees all 3):
      const ownerFeedRes = await testApp.request(`/api/businesses/${bizId}/announcements`, {
        headers: { cookie },
      });
      expect(ownerFeedRes.status).toBe(200);
      const ownerFeed = announcementsResponseSchema.parse(await ownerFeedRes.json());
      const ownerIds = ownerFeed.items.map(i => i.id);
      expect(ownerIds).toContain(actItem.id);
      expect(ownerIds).toContain(expItem.id);
      expect(ownerIds).toContain(futItem.id);
    });
  });

  describe("Listing Lifecycle Cascade", () => {
    it("hides announcements immediately if listing is suspended or rejected", async () => {
      const ownerEmail = "cascade_owner@test.com";
      const ownerId = await registerAndGetId({
        name: "Cascade Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      const { bizId, listingId } = await seedBusiness(
        ownerId,
        "Cascade Bistro",
        "T09LL5555C",
        "published"
      );

      const res = await testApp.request(`/api/businesses/${bizId}/announcements`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie, origin: "http://localhost:4000" },
        body: JSON.stringify({
          title: "Open Today",
          content: "Come dine with us.",
        }),
      });
      expect(res.status).toBe(201);
      const ann = announcementItemSchema.parse(await res.json());

      // Check visible publicly initially
      let pubRes = await testApp.request(`/api/announcements/${ann.id}`);
      expect(pubRes.status).toBe(200);

      // Admin suspends the listing
      await db.update(listing).set({ status: "suspended" }).where(eq(listing.id, listingId));

      // Public detail should now 404
      pubRes = await testApp.request(`/api/announcements/${ann.id}`);
      expect(pubRes.status).toBe(404);

      // Public feed should no longer contain it
      const feedRes = await testApp.request("/api/announcements");
      const feed = announcementsResponseSchema.parse(await feedRes.json());
      expect(feed.items.map(i => i.id)).not.toContain(ann.id);
    });
  });

  describe("Administrator Moderation & Audit (PRS-185)", () => {
    it("allows administrator to moderate an announcement with reason and audit record", async () => {
      // Create owner and announcement
      const ownerEmail = "mod_owner@test.com";
      const ownerId = await registerAndGetId({
        name: "Mod Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const ownerCookie = await signIn(ownerEmail);

      const { bizId } = await seedBusiness(ownerId, "Moderation Shop", "T09LL4444M", "published");

      const createRes = await testApp.request(`/api/businesses/${bizId}/announcements`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: ownerCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({
          title: "Spam Announcement",
          content: "Click this untrusted link: https://spam.com",
        }),
      });
      expect(createRes.status).toBe(201);
      const ann = announcementItemSchema.parse(await createRes.json());

      // Create Admin User
      const adminEmail = "admin_user@test.com";
      const adminId = await registerAndGetId({
        name: "Admin Person",
        email: adminEmail,
        password: "Password123!",
      });
      await verifyEmail(adminId);
      await db.insert(administrator).values({ userId: adminId });
      const adminCookie = await signIn(adminEmail);

      // Non-admin attempt -> 403
      const forbiddenRes = await testApp.request(`/api/announcements/${ann.id}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: ownerCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({
          action: "moderate",
          reason: "Spam content",
        }),
      });
      expect(forbiddenRes.status).toBe(403);

      // Admin moderate announcement
      const modRes = await testApp.request(`/api/announcements/${ann.id}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({
          action: "moderate",
          reason: "Prohibited commercial spam and misleading claims",
        }),
      });

      expect(modRes.status).toBe(200);
      const modAnn = announcementItemSchema.parse(await modRes.json());
      expect(modAnn.status).toBe("moderated");
      expect(modAnn.moderationReason).toBe("Prohibited commercial spam and misleading claims");

      // Public can no longer see moderated announcement
      const pubRes = await testApp.request(`/api/announcements/${ann.id}`);
      expect(pubRes.status).toBe(404);

      // Admin can check audits
      const auditRes = await testApp.request(`/api/announcements/${ann.id}/audits`, {
        headers: { cookie: adminCookie },
      });
      expect(auditRes.status).toBe(200);
      const audits = announcementAuditsResponseSchema.parse(await auditRes.json());
      expect(audits.items.length).toBe(1);
      expect(audits.items[0]?.actorId).toBe(adminId);
      expect(audits.items[0]?.previousStatus).toBe("active");
      expect(audits.items[0]?.nextStatus).toBe("moderated");
      expect(audits.items[0]?.reason).toBe("Prohibited commercial spam and misleading claims");
    });
  });

  describe("Owner Update and Deletion", () => {
    it("allows owner to update and delete an announcement", async () => {
      const ownerEmail = "edit_owner@test.com";
      const ownerId = await registerAndGetId({
        name: "Edit Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      const { bizId } = await seedBusiness(ownerId, "Edit Cafe", "T09LL3333E", "published");

      const createRes = await testApp.request(`/api/businesses/${bizId}/announcements`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie, origin: "http://localhost:4000" },
        body: JSON.stringify({
          title: "Initial Title",
          content: "Initial Content",
        }),
      });
      expect(createRes.status).toBe(201);
      const created = announcementItemSchema.parse(await createRes.json());

      // Update announcement
      const updateRes = await testApp.request(
        `/api/businesses/${bizId}/announcements/${created.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json", cookie, origin: "http://localhost:4000" },
          body: JSON.stringify({
            title: "Updated Title",
            content: "Updated Content with https://link.com",
            linkUrl: "https://link.com",
          }),
        }
      );
      expect(updateRes.status).toBe(200);
      const updated = announcementItemSchema.parse(await updateRes.json());
      expect(updated.title).toBe("Updated Title");
      expect(updated.linkUrl).toBe("https://link.com");

      // Delete announcement
      const deleteRes = await testApp.request(
        `/api/businesses/${bizId}/announcements/${created.id}`,
        {
          method: "DELETE",
          headers: { cookie, origin: "http://localhost:4000" },
        }
      );
      expect(deleteRes.status).toBe(204);

      // Verify deleted from db
      const singleRes = await testApp.request(`/api/announcements/${created.id}`);
      expect(singleRes.status).toBe(404);
    });
  });
});
