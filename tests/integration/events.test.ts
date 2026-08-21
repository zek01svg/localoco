/**
 * @vitest-environment node
 */
import type { AppType } from "#server/index";
import type { db as dbInstance } from "#server/lib/db";
import type { TestAppEnv } from "./auth-helpers";
import type { Context, Hono, MiddlewareHandler, Next } from "hono";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { administrator, business, emailDelivery, event, listing, user } from "#server/database";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  eventAuditsResponseSchema,
  eventItemSchema,
  eventsResponseSchema,
} from "#shared/contracts/events";

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
    messageId: "mock_qstash_msg_events",
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

describe("Events Integration Suite (PRS-192)", () => {
  describe("Publication Requirement & Ownership", () => {
    it("allows verified owner of a published business to create an event", async () => {
      const ownerEmail = "event_owner1@test.com";
      const ownerId = await registerAndGetId({
        name: "Alice Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      const { bizId } = await seedBusiness(ownerId, "Artisan Roasters", "T09LL0101A", "published");

      const startsAt = new Date(Date.now() + 3600_000).toISOString();
      const endsAt = new Date(Date.now() + 7200_000).toISOString();

      const res = await testApp.request(`/api/businesses/${bizId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          title: "Single Origin Cupping",
          description: "Explore flavors from Ethiopia and Colombia.",
          imageUrl: "https://images.example.com/coffee.jpg",
          linkUrl: "https://example.com/register",
          startsAt,
          endsAt,
        }),
      });

      expect(res.status).toBe(201);
      const data = eventItemSchema.parse(await res.json());
      expect(data.title).toBe("Single Origin Cupping");
      expect(data.businessId).toBe(bizId);
      expect(data.business?.name).toBe("Artisan Roasters");
      expect(data.status).toBe("active");
      expect(data.canonicalUrl).toBe(`/events/${data.id}`);
    });

    it("rejects event creation with 409 Conflict if listing is in draft state", async () => {
      const ownerEmail = "event_draft_owner@test.com";
      const ownerId = await registerAndGetId({
        name: "Draft Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      const { bizId } = await seedBusiness(ownerId, "Draft Bistro", "T09LL0102A", "draft");

      const res = await testApp.request(`/api/businesses/${bizId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          title: "Draft Event",
          description: "Cannot post on draft listing",
          startsAt: new Date(Date.now() + 10000).toISOString(),
          endsAt: new Date(Date.now() + 20000).toISOString(),
        }),
      });

      expect(res.status).toBe(409);
      const err = errorEnvelopeSchema.parse(await res.json());
      expect(err.error.code).toBe("conflict");
      expect(err.error.message).toContain("published");
    });

    it("rejects event creation with 409 Conflict if listing is suspended or rejected", async () => {
      const ownerEmail = "event_susp_owner@test.com";
      const ownerId = await registerAndGetId({
        name: "Susp Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      const { bizId: suspBizId } = await seedBusiness(
        ownerId,
        "Suspended Shop",
        "T09LL0103A",
        "suspended"
      );
      const { bizId: rejBizId } = await seedBusiness(
        ownerId,
        "Rejected Shop",
        "T09LL0104A",
        "rejected"
      );

      const payload = {
        title: "Forbidden Event",
        description: "Should fail",
        startsAt: new Date(Date.now() + 10000).toISOString(),
        endsAt: new Date(Date.now() + 20000).toISOString(),
      };

      const resSusp = await testApp.request(`/api/businesses/${suspBizId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(payload),
      });
      expect(resSusp.status).toBe(409);

      const resRej = await testApp.request(`/api/businesses/${rejBizId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(payload),
      });
      expect(resRej.status).toBe(409);
    });

    it("rejects creation from a non-owner with 404", async () => {
      const ownerId = await registerAndGetId({
        name: "Real Owner",
        email: "event_real@test.com",
        password: "Password123!",
      });
      await verifyEmail(ownerId);

      const otherId = await registerAndGetId({
        name: "Other User",
        email: "event_other@test.com",
        password: "Password123!",
      });
      await verifyEmail(otherId);
      const otherCookie = await signIn("event_other@test.com");

      const { bizId } = await seedBusiness(ownerId, "Real Cafe", "T09LL0105A", "published");

      const res = await testApp.request(`/api/businesses/${bizId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: otherCookie },
        body: JSON.stringify({
          title: "Hijacked Event",
          description: "Should not be allowed",
          startsAt: new Date(Date.now() + 10000).toISOString(),
          endsAt: new Date(Date.now() + 20000).toISOString(),
        }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("Time Validation & Expiry Filtering", () => {
    it("rejects inverted intervals (endsAt before startsAt) with 400", async () => {
      const ownerEmail = "event_time_owner@test.com";
      const ownerId = await registerAndGetId({
        name: "Time Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      const { bizId } = await seedBusiness(ownerId, "Time Cafe", "T09LL0106A", "published");

      const res = await testApp.request(`/api/businesses/${bizId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          title: "Reversed Time Event",
          description: "Invalid time bounds",
          startsAt: "2026-10-10T15:00:00.000Z",
          endsAt: "2026-10-10T12:00:00.000Z",
        }),
      });

      expect(res.status).toBe(400);
      const err = errorEnvelopeSchema.parse(await res.json());
      expect(err.error.code).toBe("invalid_request");
    });

    it("automatically omits expired events from public feed", async () => {
      const ownerEmail = "event_feed_owner@test.com";
      const ownerId = await registerAndGetId({
        name: "Feed Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      const { bizId } = await seedBusiness(ownerId, "Feed Bakery", "T09LL0107A", "published");

      // Insert active upcoming event
      const activeRes = await testApp.request(`/api/businesses/${bizId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          title: "Upcoming Bread Workshop",
          description: "Learn sourdough techniques.",
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          endsAt: new Date(Date.now() + 7200_000).toISOString(),
        }),
      });
      expect(activeRes.status).toBe(201);
      const activeEvent = eventItemSchema.parse(await activeRes.json());

      // Insert expired event directly into database
      const expiredId = crypto.randomUUID();
      const pastStart = new Date(Date.now() - 7200_000);
      const pastEnd = new Date(Date.now() - 3600_000);
      await db.insert(event).values({
        id: expiredId,
        businessId: bizId,
        userId: ownerId,
        title: "Yesterday's Pastry Class",
        description: "Already over.",
        startsAt: pastStart,
        endsAt: pastEnd,
        status: "active",
        createdAt: pastStart,
        updatedAt: pastStart,
      });

      // Public feed query
      const feedRes = await testApp.request("/api/events?limit=50");
      expect(feedRes.status).toBe(200);
      const feed = eventsResponseSchema.parse(await feedRes.json());

      const activeFound = feed.items.find(i => i.id === activeEvent.id);
      const expiredFound = feed.items.find(i => i.id === expiredId);

      expect(activeFound).toBeDefined();
      expect(expiredFound).toBeUndefined();

      // Direct detail request by public viewer returns 404 for expired event
      const detailExpiredRes = await testApp.request(`/api/events/${expiredId}`);
      expect(detailExpiredRes.status).toBe(404);

      // But owner can view the expired event detail
      const detailOwnerRes = await testApp.request(`/api/events/${expiredId}`, {
        headers: { cookie },
      });
      expect(detailOwnerRes.status).toBe(200);
    });

    it("omits events from unpublished/suspended listings from public feed", async () => {
      const ownerEmail = "event_unpub_owner@test.com";
      const ownerId = await registerAndGetId({
        name: "Unpub Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      const { bizId, listingId } = await seedBusiness(
        ownerId,
        "Initially Published",
        "T09LL0108A",
        "published"
      );

      // Create event while published
      const res = await testApp.request(`/api/businesses/${bizId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          title: "Public Event To Be Hidden",
          description: "Will hide once suspended",
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          endsAt: new Date(Date.now() + 7200_000).toISOString(),
        }),
      });
      expect(res.status).toBe(201);
      const eventData = eventItemSchema.parse(await res.json());

      // Suspend listing
      await db.update(listing).set({ status: "suspended" }).where(eq(listing.id, listingId));

      // Public feed check
      const feedRes = await testApp.request("/api/events?limit=50");
      const feed = eventsResponseSchema.parse(await feedRes.json());
      expect(feed.items.find(i => i.id === eventData.id)).toBeUndefined();

      // Public detail returns 404
      const detailRes = await testApp.request(`/api/events/${eventData.id}`);
      expect(detailRes.status).toBe(404);
    });
  });

  describe("Image and Link Validation", () => {
    it("rejects non-HTTPS image and link URLs", async () => {
      const ownerEmail = "event_url_owner@test.com";
      const ownerId = await registerAndGetId({
        name: "Url Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      const { bizId } = await seedBusiness(ownerId, "Url Cafe", "T09LL0109A", "published");

      const resHttpImage = await testApp.request(`/api/businesses/${bizId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          title: "Insecure Image Event",
          description: "Desc",
          imageUrl: "http://insecure.com/pic.jpg",
          startsAt: new Date(Date.now() + 10000).toISOString(),
          endsAt: new Date(Date.now() + 20000).toISOString(),
        }),
      });
      expect(resHttpImage.status).toBe(400);

      const resHttpLink = await testApp.request(`/api/businesses/${bizId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          title: "Insecure Link Event",
          description: "Desc",
          linkUrl: "http://insecure.com/tickets",
          startsAt: new Date(Date.now() + 10000).toISOString(),
          endsAt: new Date(Date.now() + 20000).toISOString(),
        }),
      });
      expect(resHttpLink.status).toBe(400);
    });
  });

  describe("Administrator Moderation & Audit Trail", () => {
    it("allows admin to moderate an event with reason and preserves audit record", async () => {
      const adminEmail = "event_admin@test.com";
      const adminId = await registerAndGetId({
        name: "Admin Mod",
        email: adminEmail,
        password: "Password123!",
      });
      await verifyEmail(adminId);
      await db.insert(administrator).values({ userId: adminId });
      const adminCookie = await signIn(adminEmail);

      const ownerEmail = "event_mod_owner@test.com";
      const ownerId = await registerAndGetId({
        name: "Mod Target Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const ownerCookie = await signIn(ownerEmail);

      const { bizId } = await seedBusiness(ownerId, "Modded Cafe", "T09LL0110A", "published");

      const createRes = await testApp.request(`/api/businesses/${bizId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: ownerCookie },
        body: JSON.stringify({
          title: "Rave Party",
          description: "Prohibited loud event.",
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          endsAt: new Date(Date.now() + 7200_000).toISOString(),
        }),
      });
      expect(createRes.status).toBe(201);
      const createdEvent = eventItemSchema.parse(await createRes.json());

      // Admin moderates
      const modRes = await testApp.request(`/api/events/${createdEvent.id}/moderate`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: adminCookie },
        body: JSON.stringify({
          action: "moderate",
          reason: "Violates local noise regulations.",
        }),
      });
      expect(modRes.status).toBe(200);
      const modEvent = eventItemSchema.parse(await modRes.json());
      expect(modEvent.status).toBe("moderated");
      expect(modEvent.moderationReason).toBe("Violates local noise regulations.");

      // Check public feed hides it
      const feedRes = await testApp.request("/api/events?limit=50");
      const feed = eventsResponseSchema.parse(await feedRes.json());
      expect(feed.items.find(i => i.id === createdEvent.id)).toBeUndefined();

      // Check audit log
      const auditRes = await testApp.request(`/api/events/${createdEvent.id}/audits`, {
        headers: { cookie: adminCookie },
      });
      expect(auditRes.status).toBe(200);
      const audits = eventAuditsResponseSchema.parse(await auditRes.json());
      expect(audits.items.length).toBe(1);
      expect(audits.items[0]?.previousStatus).toBe("active");
      expect(audits.items[0]?.nextStatus).toBe("moderated");
      expect(audits.items[0]?.reason).toBe("Violates local noise regulations.");

      // Admin restores
      const restoreRes = await testApp.request(`/api/events/${createdEvent.id}/moderate`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: adminCookie },
        body: JSON.stringify({
          action: "restore",
          reason: "Permit approved upon appeal.",
        }),
      });
      expect(restoreRes.status).toBe(200);
      const restored = eventItemSchema.parse(await restoreRes.json());
      expect(restored.status).toBe("active");
      expect(restored.moderationReason).toBeNull();

      // Check audit log now has 2 entries
      const auditRes2 = await testApp.request(`/api/events/${createdEvent.id}/audits`, {
        headers: { cookie: adminCookie },
      });
      const audits2 = eventAuditsResponseSchema.parse(await auditRes2.json());
      expect(audits2.items.length).toBe(2);
    });

    it("rejects non-admin moderation attempts with 403", async () => {
      const ownerEmail = "event_nonadmin@test.com";
      const ownerId = await registerAndGetId({
        name: "Regular User",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      const { bizId } = await seedBusiness(ownerId, "Non Admin Biz", "T09LL0111A", "published");

      const createRes = await testApp.request(`/api/businesses/${bizId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          title: "Regular Event",
          description: "Regular description",
          startsAt: new Date(Date.now() + 10000).toISOString(),
          endsAt: new Date(Date.now() + 20000).toISOString(),
        }),
      });
      const createdEvent = eventItemSchema.parse(await createRes.json());

      const modRes = await testApp.request(`/api/events/${createdEvent.id}/moderate`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          action: "moderate",
          reason: "Attempt by non admin",
        }),
      });
      expect(modRes.status).toBe(403);
    });
  });

  describe("Zero Email Delivery Assertion", () => {
    it("creates an event and asserts zero email delivery records are produced", async () => {
      const ownerEmail = "event_noemail@test.com";
      const ownerId = await registerAndGetId({
        name: "Zero Email Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      const { bizId } = await seedBusiness(ownerId, "Quiet Cafe", "T09LL0112A", "published");

      mockPublishEmailJob.mockClear();

      const emailsBefore = await db.select({ id: emailDelivery.id }).from(emailDelivery);

      const res = await testApp.request(`/api/businesses/${bizId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          title: "Silent Opening",
          description: "No emails should be sent.",
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          endsAt: new Date(Date.now() + 7200_000).toISOString(),
        }),
      });
      expect(res.status).toBe(201);

      const emailsAfter = await db.select({ id: emailDelivery.id }).from(emailDelivery);
      expect(emailsAfter.length).toBe(emailsBefore.length);
      expect(mockPublishEmailJob).not.toHaveBeenCalled();
    });
  });

  describe("Business Events CRUD", () => {
    it("allows owner to update and delete their event", async () => {
      const ownerEmail = "event_crud_owner@test.com";
      const ownerId = await registerAndGetId({
        name: "Crud Owner",
        email: ownerEmail,
        password: "Password123!",
      });
      await verifyEmail(ownerId);
      const cookie = await signIn(ownerEmail);

      const { bizId } = await seedBusiness(ownerId, "Crud Biz", "T09LL0113A", "published");

      const createRes = await testApp.request(`/api/businesses/${bizId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          title: "Initial Title",
          description: "Initial description",
          startsAt: new Date(Date.now() + 3600_000).toISOString(),
          endsAt: new Date(Date.now() + 7200_000).toISOString(),
        }),
      });
      const created = eventItemSchema.parse(await createRes.json());

      // Update
      const patchRes = await testApp.request(`/api/businesses/${bizId}/events/${created.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          title: "Updated Title",
          description: "Updated description",
        }),
      });
      expect(patchRes.status).toBe(200);
      const updated = eventItemSchema.parse(await patchRes.json());
      expect(updated.title).toBe("Updated Title");
      expect(updated.description).toBe("Updated description");

      // Delete
      const deleteRes = await testApp.request(`/api/businesses/${bizId}/events/${created.id}`, {
        method: "DELETE",
        headers: { cookie },
      });
      expect(deleteRes.status).toBe(204);

      // Verify gone
      const checkRes = await testApp.request(`/api/events/${created.id}`);
      expect(checkRes.status).toBe(404);
    });
  });
});
