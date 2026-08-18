/**
 * @vitest-environment node
 */
import type { db as dbInstance } from "#server/lib/db";
import type { TestAppEnv } from "./auth-helpers";
import type { Context, Hono, Next } from "hono";

import { asc, eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { user } from "#server/database/auth";
import { emailDelivery } from "#server/database/email";
import { mediaObject } from "#server/database/media";
import { businessCreationResponseSchema } from "#shared/contracts/business";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  MAX_PHOTOS_PER_BUSINESS,
  mediaListResponseSchema,
  mediaObjectSchema,
  photoPresignResponseSchema,
} from "#shared/contracts/media";

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

// The fake object store stands in for the real S3 seam: `put` simulates the
// client's presigned PUT, `failDeletes` simulates a storage outage.
const { mockStorage } = vi.hoisted(() => ({
  mockStorage: {
    objects: new Map<string, { size: number; type: string }>(),
    failDeletes: false,
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
    if (mockStorage.failDeletes) {
      throw new Error("simulated storage outage");
    }
    mockStorage.objects.delete(key);
  },
}));

let container: Awaited<ReturnType<typeof startPostgresContainer>>["container"];
let sql: ReturnType<typeof postgres>;
let testApp: Hono<TestAppEnv>;
let db: typeof dbInstance;

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
  const emails = await db
    .select({ htmlBody: emailDelivery.htmlBody })
    .from(emailDelivery)
    .where(eq(emailDelivery.recipient, email));
  const token = emails[0]?.htmlBody.match(/token=([^&"'\s]+)/u)?.[1];
  expect(token, `no verification token for ${email}`).toBeTruthy();
  const res = await testApp.request(`/api/auth/verify-email?token=${token}`, {
    headers: { origin: ORIGIN },
  });
  expect(res.status).toBe(200);
};

const createBusiness = async (cookie: string, uen: string) => {
  const res = await testApp.request("/api/businesses", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      uen,
      listing: {
        name: "Ah Kow Kopitiam",
        category: "Food & Beverage",
        address: "1 Example Street #01-01",
        postalCode: "123456",
      },
    }),
  });
  expect(res.status).toBe(201);
  const body = businessCreationResponseSchema.parse(await res.json());
  return body.id;
};

const presign = async (
  businessId: string,
  cookie: string,
  overrides: Partial<{ contentType: string; size: number; filename: string }> = {}
) => {
  const res = await testApp.request(`/api/businesses/${businessId}/photos`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({
      contentType: "image/jpeg",
      size: 1234,
      filename: "front.jpg",
      ...overrides,
    }),
  });
  return res;
};

const complete = async (mediaId: string, cookie: string) =>
  testApp.request(`/api/media/${mediaId}/complete`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
  });

const mediaRowsFor = (businessId: string) =>
  db
    .select({ id: mediaObject.id, status: mediaObject.status })
    .from(mediaObject)
    .where(eq(mediaObject.businessId, businessId))
    .orderBy(asc(mediaObject.createdAt));

const uploadKeyFor = (grant: { uploadUrl: string }) => new URL(grant.uploadUrl).pathname.slice(1);

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

  db = dbModule.db;
  const logger = {
    warning: vi.fn<(_msg: string, _props: Record<string, unknown>) => void>(),
    error: vi.fn<(_err: Error, _props: Record<string, unknown>) => void>(),
  };
  testApp = await createTestHonoApp(
    serverModule.app,
    authMwModule.requireAuth,
    authMwModule.requireVerified,
    logger
  );
}, 120_000);

afterAll(async () => {
  await sql.end({ timeout: 5 });
  await container.stop();
});

describe("presigning Listing photo uploads", () => {
  let ownerCookie: string;
  let otherCookie: string;
  let bizId: string;

  beforeAll(async () => {
    ownerCookie = await signUp("Alice", "alice.media@example.com");
    await verifyEmail("alice.media@example.com");
    ownerCookie = await signIn("alice.media@example.com");
    otherCookie = await signUp("Bob", "bob.media@example.com");
    await verifyEmail("bob.media@example.com");
    otherCookie = await signIn("bob.media@example.com");
    bizId = await createBusiness(ownerCookie, "202400139R");
  });

  it("issues a short-lived presigned PUT grant and stores a pending row", async () => {
    const res = await presign(bizId, ownerCookie);
    expect(res.status).toBe(201);

    const grant = photoPresignResponseSchema.parse(await res.json());
    expect(grant.headers["content-type"]).toBe("image/jpeg");
    expect(new Date(grant.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(grant).not.toHaveProperty("key");

    const rows = await mediaRowsFor(bizId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("pending");
    expect(mockStorage.objects.size).toBe(0);
  });

  it("rejects malformed requests at the boundary with 400", async () => {
    const badType = await presign(bizId, ownerCookie, { contentType: "image/gif" });
    expect(badType.status).toBe(400);

    const oversized = await presign(bizId, ownerCookie, { size: 9 * 1024 * 1024 });
    expect(oversized.status).toBe(400);

    const mismatched = await presign(bizId, ownerCookie, {
      contentType: "image/png",
      filename: "front.jpg",
    });
    expect(mismatched.status).toBe(400);
  });

  it("answers 401 anonymously, 403 unverified, and 404 for a non-owner", async () => {
    const anonymous = await presign(bizId, "");
    expect(anonymous.status).toBe(401);

    const unverifiedCookie = await signUp("Carol", "carol.media@example.com");
    const unverified = await presign(bizId, unverifiedCookie);
    expect(unverified.status).toBe(403);

    const foreign = await presign(bizId, otherCookie);
    expect(foreign.status).toBe(404);
  });

  it("lists the business's photos oldest first, pending included", async () => {
    const res = await testApp.request(`/api/businesses/${bizId}/photos`, {
      headers: { cookie: ownerCookie },
    });
    expect(res.status).toBe(200);

    const body = mediaListResponseSchema.parse(await res.json());
    const rows = await mediaRowsFor(bizId);
    expect(body.items.map(item => item.id)).toEqual(rows.map(row => row.id));
  });

  it("hides the photo list from a non-owner with 404", async () => {
    const res = await testApp.request(`/api/businesses/${bizId}/photos`, {
      headers: { cookie: otherCookie },
    });
    expect(res.status).toBe(404);
  });

  it("cannot race past the per-Business count limit", async () => {
    const crowded = await createBusiness(ownerCookie, "202400140T");
    for (let i = 0; i < MAX_PHOTOS_PER_BUSINESS; i += 1) {
      const res = await presign(crowded, ownerCookie, { filename: `p${i}.jpg` });
      expect(res.status).toBe(201);
    }

    const eleventh = await presign(crowded, ownerCookie);
    expect(eleventh.status).toBe(422);
    expect(errorEnvelopeSchema.parse(await eleventh.json()).error.code).toBe("validation_failed");

    const rows = await mediaRowsFor(crowded);
    expect(rows).toHaveLength(MAX_PHOTOS_PER_BUSINESS);
  });
});

describe("completing Listing photo uploads", () => {
  let ownerCookie: string;
  let otherCookie: string;
  let bizId: string;

  beforeAll(async () => {
    ownerCookie = await signUp("Dana", "dana.media@example.com");
    await verifyEmail("dana.media@example.com");
    ownerCookie = await signIn("dana.media@example.com");
    otherCookie = await signUp("Erin", "erin.media@example.com");
    await verifyEmail("erin.media@example.com");
    otherCookie = await signIn("erin.media@example.com");
    bizId = await createBusiness(ownerCookie, "202400141V");
  });

  it("activates a photo whose uploaded object matches its declaration", async () => {
    const grant = photoPresignResponseSchema.parse(
      await (await presign(bizId, ownerCookie, { size: 1234 })).json()
    );
    mockStorage.put(uploadKeyFor(grant), 1234, "image/jpeg");

    const res = await complete(grant.id, ownerCookie);
    expect(res.status).toBe(200);
    const media = mediaObjectSchema.parse(await res.json());
    expect(media.status).toBe("active");
    expect(media.size).toBe(1234);

    const again = await complete(grant.id, ownerCookie);
    expect(again.status).toBe(200);
  });

  it("answers 404 and drops the row when the object was never uploaded", async () => {
    const grant = photoPresignResponseSchema.parse(
      await (await presign(bizId, ownerCookie)).json()
    );

    const res = await complete(grant.id, ownerCookie);
    expect(res.status).toBe(404);
    const rows = await mediaRowsFor(bizId);
    expect(rows.some(row => row.id === grant.id)).toBe(false);
  });

  it("rejects a size mismatch with 422 and purges both object and row", async () => {
    const grant = photoPresignResponseSchema.parse(
      await (await presign(bizId, ownerCookie, { size: 5 })).json()
    );
    const key = uploadKeyFor(grant);
    mockStorage.put(key, 6, "image/jpeg");

    const res = await complete(grant.id, ownerCookie);
    expect(res.status).toBe(422);
    expect(errorEnvelopeSchema.parse(await res.json()).error.code).toBe("validation_failed");
    expect(mockStorage.objects.has(key)).toBe(false);
    expect((await mediaRowsFor(bizId)).some(row => row.id === grant.id)).toBe(false);
  });

  it("rejects a content-type mismatch with 422 and purges both object and row", async () => {
    const grant = photoPresignResponseSchema.parse(
      await (await presign(bizId, ownerCookie)).json()
    );
    const key = uploadKeyFor(grant);
    mockStorage.put(key, 1234, "image/png");

    const res = await complete(grant.id, ownerCookie);
    expect(res.status).toBe(422);
    expect(mockStorage.objects.has(key)).toBe(false);
  });

  it("answers 404 for a non-owner completing an upload", async () => {
    const grant = photoPresignResponseSchema.parse(
      await (await presign(bizId, ownerCookie)).json()
    );
    mockStorage.put(uploadKeyFor(grant), 1234, "image/jpeg");

    const res = await complete(grant.id, otherCookie);
    expect(res.status).toBe(404);
  });
});

describe("reading and deleting Listing photos", () => {
  let ownerCookie: string;
  let otherCookie: string;
  let bizId: string;
  let activeId: string;
  let pendingId: string;
  let activeKey: string;

  beforeAll(async () => {
    ownerCookie = await signUp("Frank", "frank.media@example.com");
    await verifyEmail("frank.media@example.com");
    ownerCookie = await signIn("frank.media@example.com");
    otherCookie = await signUp("Grace", "grace.media@example.com");
    await verifyEmail("grace.media@example.com");
    otherCookie = await signIn("grace.media@example.com");
    bizId = await createBusiness(ownerCookie, "202400142W");

    const grant = photoPresignResponseSchema.parse(
      await (await presign(bizId, ownerCookie, { size: 1234 })).json()
    );
    activeId = grant.id;
    activeKey = new URL(grant.uploadUrl).pathname.slice(1);
    mockStorage.put(activeKey, 1234, "image/jpeg");
    await complete(activeId, ownerCookie);

    const pending = photoPresignResponseSchema.parse(
      await (await presign(bizId, ownerCookie)).json()
    );
    pendingId = pending.id;
  });

  it("redirects the owner to a short-lived presigned GET, uncached and private", async () => {
    const res = await testApp.request(`/api/media/${activeId}`, {
      headers: { cookie: ownerCookie },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`https://storage.test/${activeKey}`);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("answers 404 for a pending upload, for a non-owner, and for a missing object", async () => {
    const pending = await testApp.request(`/api/media/${pendingId}`, {
      headers: { cookie: ownerCookie },
    });
    expect(pending.status).toBe(404);

    const foreign = await testApp.request(`/api/media/${activeId}`, {
      headers: { cookie: otherCookie },
    });
    expect(foreign.status).toBe(404);

    const missing = await testApp.request("/api/media/no-such-media", {
      headers: { cookie: ownerCookie },
    });
    expect(missing.status).toBe(404);
  });

  it("purges the object and the row permanently", async () => {
    const res = await testApp.request(`/api/media/${activeId}`, {
      method: "DELETE",
      headers: { cookie: ownerCookie },
    });
    expect(res.status).toBe(204);
    expect(mockStorage.objects.has(activeKey)).toBe(false);
    expect((await mediaRowsFor(bizId)).some(row => row.id === activeId)).toBe(false);

    const again = await testApp.request(`/api/media/${activeId}`, {
      method: "DELETE",
      headers: { cookie: ownerCookie },
    });
    expect(again.status).toBe(404);
  });

  it("keeps the row when the storage delete fails, answering 503", async () => {
    mockStorage.failDeletes = true;
    try {
      const res = await testApp.request(`/api/media/${pendingId}`, {
        method: "DELETE",
        headers: { cookie: ownerCookie },
      });
      expect(res.status).toBe(503);
    } finally {
      mockStorage.failDeletes = false;
    }
    expect((await mediaRowsFor(bizId)).some(row => row.id === pendingId)).toBe(true);
  });

  it("answers 404 for a non-owner deleting a photo", async () => {
    const res = await testApp.request(`/api/media/${pendingId}`, {
      method: "DELETE",
      headers: { cookie: otherCookie },
    });
    expect(res.status).toBe(404);
  });
});

describe("media sweep webhook", () => {
  let ownerCookie: string;
  let bizId: string;
  let ownerId: string;

  const sweepRequest = (body: string, signature?: string) =>
    testApp.request("/api/webhooks/qstash/media-sweep", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(signature ? { "upstash-signature": signature } : {}),
      },
      body,
    });

  beforeAll(async () => {
    ownerCookie = await signUp("Henry", "henry.media@example.com");
    await verifyEmail("henry.media@example.com");
    ownerCookie = await signIn("henry.media@example.com");
    bizId = await createBusiness(ownerCookie, "202400143X");
    const [row] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, "henry.media@example.com"));
    ownerId = row.id;
  });

  it("purges only pending rows older than the threshold, objects first", async () => {
    const [stale] = await db
      .insert(mediaObject)
      .values({
        key: `listing-photos/${bizId}/stale-key`,
        ownerId,
        businessId: bizId,
        purpose: "listing_photo",
        contentType: "image/jpeg",
        size: 1234,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      })
      .returning({ id: mediaObject.id });
    mockStorage.put(`listing-photos/${bizId}/stale-key`, 1234, "image/jpeg");

    const [fresh] = await db
      .insert(mediaObject)
      .values({
        key: `listing-photos/${bizId}/fresh-key`,
        ownerId,
        businessId: bizId,
        purpose: "listing_photo",
        contentType: "image/jpeg",
        size: 1234,
      })
      .returning({ id: mediaObject.id });
    mockStorage.put(`listing-photos/${bizId}/fresh-key`, 1234, "image/jpeg");

    const res = await sweepRequest(JSON.stringify({ job: "media-sweep" }), "valid-signature");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 1 });

    expect(mockStorage.objects.has(`listing-photos/${bizId}/stale-key`)).toBe(false);
    expect(mockStorage.objects.has(`listing-photos/${bizId}/fresh-key`)).toBe(true);
    expect((await mediaRowsFor(bizId)).some(row => row.id === stale.id)).toBe(false);
    expect((await mediaRowsFor(bizId)).some(row => row.id === fresh.id)).toBe(true);
  });

  it("answers 401 without a signature and 400 for a wrong payload", async () => {
    const unsigned = await sweepRequest(JSON.stringify({ job: "media-sweep" }));
    expect(unsigned.status).toBe(401);

    const wrong = await sweepRequest(JSON.stringify({ job: "email-delivery" }), "sig");
    expect(wrong.status).toBe(400);
  });
});
