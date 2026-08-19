/**
 * @vitest-environment node
 */
import type { ListingStatus } from "#server/database/listing";
import type { AppType } from "#server/index";
import type { db as dbInstance } from "#server/lib/db";
import type { TestAppEnv } from "./auth-helpers";
import type { Context, Hono, MiddlewareHandler, Next } from "hono";

import { eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { user } from "#server/database/auth";
import { business } from "#server/database/business";
import { businessHours } from "#server/database/business-hours";
import { emailDelivery } from "#server/database/email";
import { listing } from "#server/database/listing";
import { mediaObject } from "#server/database/media";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import { publicListingDetailSchema } from "#shared/contracts/listings";

import {
  createTestHonoApp,
  extractSessionCookie,
  registerUser,
  startPostgresContainer,
} from "./auth-helpers";

vi.mock("hono/bun", () => ({
  serveStatic: () => (_c: Context, next: Next) => next(),
}));

vi.mock("#server/lib/email/qstash", () => ({
  publishEmailJob: vi.fn<() => Promise<{ messageId: string }>>().mockResolvedValue({
    messageId: "mock_qstash_msg_123",
  }),
  verifyQStashSignature: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
}));

vi.mock("#server/lib/geocoding", async importOriginal => {
  const original = await importOriginal<typeof import("#server/lib/geocoding")>();
  return {
    ...original,
    geocodeAddress: () => Promise.resolve({ latitude: 1.2956, longitude: 103.7764 }),
  };
});

const { mockStorage } = vi.hoisted(() => ({
  mockStorage: {
    objects: new Map<string, { size: number; type: string }>(),
    put(key: string, size: number, type: string) {
      this.objects.set(key, { size, type });
    },
    stat(key: string) {
      return this.objects.get(key) ?? null;
    },
  },
}));

vi.mock("#server/lib/media-storage", () => ({
  mediaStorageConfigured: () => true,
  presignUploadUrl: (key: string, contentType: string) =>
    `https://storage.test/${key}?type=${encodeURIComponent(contentType)}`,
  presignDownloadUrl: (key: string) => `https://storage.test/${key}`,
  statObject: async (key: string) => mockStorage.stat(key),
  deleteObject: async (key: string) => {
    mockStorage.objects.delete(key);
  },
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
  expect(rows.length).toBe(1);
  return rows[0].id;
};

let uenCounter = 100;
const createTestListing = async (
  ownerId: string,
  input: {
    name: string;
    category: string;
    description?: string | null;
    address: string;
    postalCode?: string;
    latitude?: number | null;
    longitude?: number | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    paymentOptions?: string[] | null;
    priceRange?: string | null;
    status?: ListingStatus;
    hours?: Array<{ day: number; is24h: boolean; openMinute?: number; closeMinute?: number }>;
    photos?: Array<{
      id: string;
      key: string;
      contentType: string;
      size: number;
      status: "pending" | "active";
    }>;
  }
) => {
  const uen = `202${String(uenCounter++).padStart(7, "0")}`;
  const [biz] = await db.insert(business).values({ uen, ownerId }).returning({ id: business.id });
  const [row] = await db
    .insert(listing)
    .values({
      businessId: biz.id,
      status: input.status ?? "published",
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      address: input.address,
      postalCode: input.postalCode ?? "123456",
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      paymentOptions: input.paymentOptions ?? null,
      priceRange: input.priceRange ?? null,
    })
    .returning({ id: listing.id });

  if (input.hours && input.hours.length > 0) {
    for (const h of input.hours) {
      await db.insert(businessHours).values({
        businessId: biz.id,
        day: h.day,
        is24h: h.is24h,
        openMinute: h.openMinute ?? null,
        closeMinute: h.closeMinute ?? null,
      });
    }
  }

  if (input.photos && input.photos.length > 0) {
    for (const p of input.photos) {
      await db.insert(mediaObject).values({
        id: p.id,
        key: p.key,
        ownerId,
        businessId: biz.id,
        purpose: "listing_photo",
        contentType: p.contentType,
        size: p.size,
        status: p.status,
      });
      mockStorage.put(p.key, p.size, p.contentType);
    }
  }

  return { listingId: row.id, businessId: biz.id, uen };
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

describe("PRS-188: Listing detail page integration", () => {
  let ownerId: string;
  let ownerCookie: string;

  beforeAll(async () => {
    ownerCookie = await signUp("Detail Owner", "detail.owner@example.com");
    await verifyEmail("detail.owner@example.com");
    ownerId = await userId("detail.owner@example.com");
  });

  describe("GET /api/listings/:id — published listing", () => {
    it("returns complete canonical listing data with joined UEN, hours, and active photos", async () => {
      const { listingId, businessId, uen } = await createTestListing(ownerId, {
        name: "Artisan Coffee House",
        category: "Cafe",
        description: "Specialty coffee and house-made pastries in Tanjong Pagar.",
        address: "75 Tanjong Pagar Road",
        postalCode: "088496",
        latitude: 1.2778,
        longitude: 103.8428,
        phone: "+65 6222 3333",
        email: "contact@artisancoffee.sg",
        website: "https://artisancoffee.sg",
        paymentOptions: ["Cash", "PayNow", "NETS"],
        priceRange: "$10-$20",
        hours: [
          { day: 0, is24h: false, openMinute: 480, closeMinute: 1080 },
          { day: 1, is24h: true },
        ],
        photos: [
          {
            id: "photo_active_1",
            key: "listing-photos/biz_1/photo1.jpg",
            contentType: "image/jpeg",
            size: 150000,
            status: "active",
          },
          {
            id: "photo_pending_1",
            key: "listing-photos/biz_1/photo_pending.jpg",
            contentType: "image/jpeg",
            size: 120000,
            status: "pending",
          },
        ],
      });

      const res = await testApp.request(`/api/listings/${listingId}`);
      expect(res.status).toBe(200);

      const body = publicListingDetailSchema.parse(await res.json());
      expect(body.id).toBe(listingId);
      expect(body.businessId).toBe(businessId);
      expect(body.uen).toBe(uen);
      expect(body.name).toBe("Artisan Coffee House");
      expect(body.category).toBe("Cafe");
      expect(body.description).toBe("Specialty coffee and house-made pastries in Tanjong Pagar.");
      expect(body.address).toBe("75 Tanjong Pagar Road");
      expect(body.postalCode).toBe("088496");
      expect(body.latitude).toBe(1.2778);
      expect(body.longitude).toBe(103.8428);
      expect(body.phone).toBe("+65 6222 3333");
      expect(body.email).toBe("contact@artisancoffee.sg");
      expect(body.website).toBe("https://artisancoffee.sg");
      expect(body.paymentOptions).toEqual(["Cash", "PayNow", "NETS"]);
      expect(body.priceRange).toBe("$10-$20");

      // Hours schedule parsed
      expect(body.hours).toHaveLength(2);
      expect(body.hours[0]).toEqual({
        day: 0,
        is24h: false,
        openTime: "08:00",
        closeTime: "18:00",
      });
      expect(body.hours[1]).toEqual({ day: 1, is24h: true });

      // Photos contain only active photos with controlled application URLs
      expect(body.photos).toHaveLength(1);
      expect(body.photos[0]).toEqual({
        id: "photo_active_1",
        contentType: "image/jpeg",
        size: 150000,
        url: "/api/media/photo_active_1",
      });
    });

    it("accepts minimal published listing with absent optional fields", async () => {
      const { listingId, uen } = await createTestListing(ownerId, {
        name: "Bare Minimum Kiosk",
        category: "Retail",
        address: "1 Simple Way",
        postalCode: "111222",
        latitude: null,
        longitude: null,
      });

      const res = await testApp.request(`/api/listings/${listingId}`);
      expect(res.status).toBe(200);

      const body = publicListingDetailSchema.parse(await res.json());
      expect(body.id).toBe(listingId);
      expect(body.uen).toBe(uen);
      expect(body.description).toBeNull();
      expect(body.latitude).toBeNull();
      expect(body.longitude).toBeNull();
      expect(body.phone).toBeNull();
      expect(body.email).toBeNull();
      expect(body.website).toBeNull();
      expect(body.paymentOptions).toBeNull();
      expect(body.priceRange).toBeNull();
      expect(body.hours).toEqual([]);
      expect(body.photos).toEqual([]);
    });
  });

  describe("GET /api/listings/:id — unpublished isolation", () => {
    it("returns 404 for draft listing", async () => {
      const { listingId } = await createTestListing(ownerId, {
        name: "Draft Place",
        category: "Food",
        address: "10 Draft Lane",
        status: "draft",
      });

      const res = await testApp.request(`/api/listings/${listingId}`);
      expect(res.status).toBe(404);
      const body = errorEnvelopeSchema.parse(await res.json());
      expect(body.error.code).toBe("not_found");
    });

    it("returns 404 for pending_review listing", async () => {
      const { listingId } = await createTestListing(ownerId, {
        name: "Pending Place",
        category: "Food",
        address: "11 Pending Lane",
        status: "pending_review",
      });

      const res = await testApp.request(`/api/listings/${listingId}`);
      expect(res.status).toBe(404);
    });

    it("returns 404 for rejected listing", async () => {
      const { listingId } = await createTestListing(ownerId, {
        name: "Rejected Place",
        category: "Food",
        address: "12 Rejected Lane",
        status: "rejected",
      });

      const res = await testApp.request(`/api/listings/${listingId}`);
      expect(res.status).toBe(404);
    });

    it("returns 404 for suspended listing", async () => {
      const { listingId } = await createTestListing(ownerId, {
        name: "Suspended Place",
        category: "Food",
        address: "13 Suspended Lane",
        status: "suspended",
      });

      const res = await testApp.request(`/api/listings/${listingId}`);
      expect(res.status).toBe(404);
    });

    it("returns 404 for non-existent listing ID", async () => {
      const res = await testApp.request("/api/listings/lst_non_existent_123");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/media/:id — public and owner photo access", () => {
    let publishedPhotoId: string;
    let draftPhotoId: string;

    beforeAll(async () => {
      await createTestListing(ownerId, {
        name: "Pub Photo Cafe",
        category: "Cafe",
        address: "1 Photo Street",
        status: "published",
        photos: [
          {
            id: "photo_public_live",
            key: "listing-photos/pub/photo_live.jpg",
            contentType: "image/jpeg",
            size: 200000,
            status: "active",
          },
        ],
      });
      publishedPhotoId = "photo_public_live";

      await createTestListing(ownerId, {
        name: "Draft Photo Cafe",
        category: "Cafe",
        address: "2 Draft Photo Street",
        status: "draft",
        photos: [
          {
            id: "photo_draft_private",
            key: "listing-photos/draft/photo_priv.jpg",
            contentType: "image/jpeg",
            size: 200000,
            status: "active",
          },
        ],
      });
      draftPhotoId = "photo_draft_private";
    });

    it("allows anonymous public 302 redirect for active photo of published listing", async () => {
      const res = await testApp.request(`/api/media/${publishedPhotoId}`);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(
        "https://storage.test/listing-photos/pub/photo_live.jpg"
      );
    });

    it("denies 404 for anonymous request to active photo of draft listing", async () => {
      const res = await testApp.request(`/api/media/${draftPhotoId}`);
      expect(res.status).toBe(404);
    });

    it("allows owner 302 redirect to active photo of their own draft listing", async () => {
      const res = await testApp.request(`/api/media/${draftPhotoId}`, {
        headers: {
          cookie: ownerCookie,
        },
      });
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(
        "https://storage.test/listing-photos/draft/photo_priv.jpg"
      );
    });
  });

  describe("Query batching assertion", () => {
    it("fetches listing detail, hours, and photos with bounded batched queries", async () => {
      const { listingId } = await createTestListing(ownerId, {
        name: "Batched Listing",
        category: "Cafe",
        address: "99 Batch Road",
        status: "published",
        hours: [
          { day: 0, is24h: false, openMinute: 540, closeMinute: 1080 },
          { day: 1, is24h: false, openMinute: 540, closeMinute: 1080 },
          { day: 2, is24h: false, openMinute: 540, closeMinute: 1080 },
        ],
        photos: [
          {
            id: "photo_batch_1",
            key: "listing-photos/batch/p1.jpg",
            contentType: "image/jpeg",
            size: 10000,
            status: "active",
          },
          {
            id: "photo_batch_2",
            key: "listing-photos/batch/p2.jpg",
            contentType: "image/jpeg",
            size: 10000,
            status: "active",
          },
        ],
      });

      const unsafe = vi.spyOn(db.$client, "unsafe");
      unsafe.mockClear();

      const res = await testApp.request(`/api/listings/${listingId}`);
      expect(res.status).toBe(200);

      // Exactly 3 queries: 1 for listing + business join, 1 for hours, 1 for media
      expect(unsafe).toHaveBeenCalledTimes(3);

      unsafe.mockRestore();
    });
  });
});
