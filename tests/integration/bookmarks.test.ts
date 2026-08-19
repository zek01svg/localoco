/**
 * @vitest-environment node
 */
import type { db as dbInstance } from "#server/lib/db";
import type { BusinessCreationResponse } from "#shared/contracts/business";
import type { TestAppEnv } from "./auth-helpers";
import type { Context, Hono, Next } from "hono";

import { eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { user } from "#server/database/auth";
import { bookmark } from "#server/database/bookmark";
import { business } from "#server/database/business";
import { emailDelivery } from "#server/database/email";
import { listing } from "#server/database/listing";
import {
  bookmarkActionResponseSchema,
  bookmarksResponseSchema,
  bookmarkStatusResponseSchema,
} from "#shared/contracts/bookmarks";
import { businessCreationResponseSchema } from "#shared/contracts/business";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import { listingsResponseSchema } from "#shared/contracts/listings";
import { publicProfileSchema } from "#shared/contracts/profiles";

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
let testApp: Hono<TestAppEnv>;
let db: typeof dbInstance;

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
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  expect(row, `no user for ${email}`).toBeTruthy();
  return row.id;
};

const createBusinessWithListing = async (
  ownerCookie: string,
  uen: string,
  name: string,
  category = "Food & Beverage",
  status: "draft" | "published" = "published"
): Promise<BusinessCreationResponse> => {
  const res = await testApp.request("/api/businesses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: ownerCookie,
    },
    body: JSON.stringify({
      uen,
      listing: {
        name,
        category,
        address: "123 Maxwell Road",
        postalCode: "069111",
      },
    }),
  });
  expect(res.status).toBe(201);
  const data = businessCreationResponseSchema.parse(await res.json());

  if (status === "published") {
    await db.update(listing).set({ status: "published" }).where(eq(listing.businessId, data.id));
  }

  return data;
};

const getBookmarks = async (cookie?: string, query = ""): Promise<Response> =>
  testApp.request(`/api/bookmarks${query ? `?${query}` : ""}`, {
    headers: cookie ? { cookie } : {},
  });

const addBookmark = async (cookie: string | undefined, body: object): Promise<Response> =>
  testApp.request("/api/bookmarks", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });

const removeBookmark = async (cookie: string | undefined, businessId: string): Promise<Response> =>
  testApp.request(`/api/bookmarks/${businessId}`, {
    method: "DELETE",
    headers: cookie ? { cookie } : {},
  });

const getBookmarkStatus = async (
  cookie: string | undefined,
  businessId: string
): Promise<Response> =>
  testApp.request(`/api/bookmarks/${businessId}`, {
    headers: cookie ? { cookie } : {},
  });

beforeAll(async () => {
  const pg = await startPostgresContainer();
  container = pg.container;
  sql = postgres(pg.databaseUrl);

  process.env.DATABASE_URL = pg.databaseUrl;
  process.env.NODE_ENV = "test";
  process.env.BETTER_AUTH_SECRET = "test-better-auth-secret-min-32-chars-long";
  process.env.BETTER_AUTH_URL = ORIGIN;
  process.env.PORT = "4001";
  process.env.VITE_APP_URL = ORIGIN;

  const { db: loadedDb } = await import("#server/lib/db");
  db = loadedDb;

  const { app: baseApp } = await import("#server/index");
  const { requireAuth: rAuth, requireVerified: rVer } = await import("#server/lib/auth-middleware");

  testApp = await createTestHonoApp(baseApp, rAuth, rVer, {
    warning: () => {},
    error: () => {},
  });
}, 300_000);

afterAll(async () => {
  await sql.end();
  await container.stop();
});

describe("Bookmarks — Authentication & Authorization", () => {
  let verifiedCookie: string;
  let unverifiedCookie: string;
  let otherVerifiedCookie: string;
  let testBusinessId: string;

  beforeAll(async () => {
    verifiedCookie = await signUp("Alice Verified", "alice.bmk.auth@example.com");
    await verifyEmail("alice.bmk.auth@example.com");

    unverifiedCookie = await signUp("Bob Unverified", "bob.bmk.unverified@example.com");

    otherVerifiedCookie = await signUp("Charlie Other", "charlie.bmk.other@example.com");
    await verifyEmail("charlie.bmk.other@example.com");

    const bizOwnerCookie = await signUp("Biz Owner", "owner.bmk.auth@example.com");
    await verifyEmail("owner.bmk.auth@example.com");

    const created = await createBusinessWithListing(
      bizOwnerCookie,
      "T20LL0001A",
      "Maxwell Chicken Rice"
    );
    testBusinessId = created.id;
  });

  it("denies anonymous access to GET /api/bookmarks with 401 unauthorized", async () => {
    const res = await getBookmarks();
    expect(res.status).toBe(401);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("unauthorized");
  });

  it("denies anonymous access to POST /api/bookmarks with 401 unauthorized", async () => {
    const res = await addBookmark(undefined, { businessId: testBusinessId });
    expect(res.status).toBe(401);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("unauthorized");
  });

  it("denies anonymous access to DELETE /api/bookmarks/:businessId with 401 unauthorized", async () => {
    const res = await removeBookmark(undefined, testBusinessId);
    expect(res.status).toBe(401);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("unauthorized");
  });

  it("denies unverified users from adding a bookmark with 403 forbidden", async () => {
    const res = await addBookmark(unverifiedCookie, { businessId: testBusinessId });
    expect(res.status).toBe(403);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("forbidden");
  });

  it("denies unverified users from deleting a bookmark with 403 forbidden", async () => {
    const res = await removeBookmark(unverifiedCookie, testBusinessId);
    expect(res.status).toBe(403);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("forbidden");
  });

  it("allows verified user to bookmark a business and ensures bookmarks are isolated per user", async () => {
    const addRes = await addBookmark(verifiedCookie, { businessId: testBusinessId });
    expect(addRes.status).toBe(200);
    const addData = bookmarkActionResponseSchema.parse(await addRes.json());
    expect(addData.status).toBe("bookmarked");
    expect(addData.bookmark?.businessId).toBe(testBusinessId);

    // Alice sees her bookmark
    const aliceListRes = await getBookmarks(verifiedCookie);
    expect(aliceListRes.status).toBe(200);
    const aliceList = bookmarksResponseSchema.parse(await aliceListRes.json());
    expect(aliceList.items).toHaveLength(1);
    expect(aliceList.items[0].businessId).toBe(testBusinessId);
    expect(aliceList.items[0].business.uen).toBe("T20LL0001A");
    expect(aliceList.items[0].listing?.name).toBe("Maxwell Chicken Rice");

    // Charlie's bookmark list is completely empty
    const charlieListRes = await getBookmarks(otherVerifiedCookie);
    expect(charlieListRes.status).toBe(200);
    const charlieList = bookmarksResponseSchema.parse(await charlieListRes.json());
    expect(charlieList.items).toHaveLength(0);

    // Charlie's status query says not bookmarked
    const charlieStatusRes = await getBookmarkStatus(otherVerifiedCookie, testBusinessId);
    expect(charlieStatusRes.status).toBe(200);
    const charlieStatus = bookmarkStatusResponseSchema.parse(await charlieStatusRes.json());
    expect(charlieStatus.bookmarked).toBe(false);
    expect(charlieStatus.bookmark).toBeNull();
  });
});

describe("Bookmarks — Idempotency & Concurrency", () => {
  let userCookie: string;
  let testUserId: string;
  let businessAId: string;
  let businessBId: string;

  beforeAll(async () => {
    userCookie = await signUp("Idempotent User", "idempotent.bmk@example.com");
    await verifyEmail("idempotent.bmk@example.com");
    testUserId = await userId("idempotent.bmk@example.com");

    const ownerCookie = await signUp("Biz Owner 2", "owner2.bmk@example.com");
    await verifyEmail("owner2.bmk@example.com");

    const bizA = await createBusinessWithListing(ownerCookie, "T20LL0002A", "Biz A");
    businessAId = bizA.id;

    const bizB = await createBusinessWithListing(ownerCookie, "T20LL0003A", "Biz B");
    businessBId = bizB.id;
  });

  it("adding an existing bookmark is idempotent rather than an error", async () => {
    const res1 = await addBookmark(userCookie, { businessId: businessAId });
    expect(res1.status).toBe(200);
    const data1 = bookmarkActionResponseSchema.parse(await res1.json());
    expect(data1.status).toBe("bookmarked");

    // Second tap
    const res2 = await addBookmark(userCookie, { businessId: businessAId });
    expect(res2.status).toBe(200);
    const data2 = bookmarkActionResponseSchema.parse(await res2.json());
    expect(data2.status).toBe("bookmarked");
    expect(data2.bookmark?.id).toBe(data1.bookmark?.id);

    // Assert only one row in database
    const dbRows = await db.select().from(bookmark).where(eq(bookmark.userId, testUserId));
    const forBizA = dbRows.filter(r => r.businessId === businessAId);
    expect(forBizA).toHaveLength(1);
  });

  it("enforces unique constraint under concurrent creation without duplicate rows", async () => {
    // 10 concurrent requests to bookmark Business B
    const results = await Promise.all(
      Array.from({ length: 10 }).map(() => addBookmark(userCookie, { businessId: businessBId }))
    );

    for (const res of results) {
      expect(res.status).toBe(200);
      const data = bookmarkActionResponseSchema.parse(await res.json());
      expect(data.status).toBe("bookmarked");
      expect(data.bookmark?.businessId).toBe(businessBId);
    }

    // Database check: exactly 1 row exists for (user, businessB)
    const rows = await sql<{ count: string }[]>`
      SELECT count(*) as count FROM "bookmark"
      WHERE "user_id" = ${testUserId} AND "business_id" = ${businessBId}
    `;
    expect(Number(rows[0].count)).toBe(1);
  });

  it("removing a bookmark is idempotent and repeated deletion succeeds with 200", async () => {
    // Remove Business A
    const del1 = await removeBookmark(userCookie, businessAId);
    expect(del1.status).toBe(200);
    const delData1 = bookmarkActionResponseSchema.parse(await del1.json());
    expect(delData1.status).toBe("removed");

    // Remove Business A again (already gone)
    const del2 = await removeBookmark(userCookie, businessAId);
    expect(del2.status).toBe(200);
    const delData2 = bookmarkActionResponseSchema.parse(await del2.json());
    expect(delData2.status).toBe("removed");

    // Concurrent removal of Business B
    const delResults = await Promise.all(
      Array.from({ length: 10 }).map(() => removeBookmark(userCookie, businessBId))
    );
    for (const res of delResults) {
      expect(res.status).toBe(200);
      const data = bookmarkActionResponseSchema.parse(await res.json());
      expect(data.status).toBe("removed");
    }

    // Assert both are gone from DB
    const remaining = await db.select().from(bookmark).where(eq(bookmark.userId, testUserId));
    expect(remaining).toHaveLength(0);
  });
});

describe("Bookmarks — Privacy & Data Isolation", () => {
  let targetUserCookie: string;
  let targetUserId: string;
  let bizId: string;

  beforeAll(async () => {
    targetUserCookie = await signUp("Private User", "private.bmk@example.com");
    await verifyEmail("private.bmk@example.com");
    targetUserId = await userId("private.bmk@example.com");

    const ownerCookie = await signUp("Owner Privacy", "owner.privacy.bmk@example.com");
    await verifyEmail("owner.privacy.bmk@example.com");

    const biz = await createBusinessWithListing(ownerCookie, "T20LL0004A", "Secret Cafe");
    bizId = biz.id;

    await addBookmark(targetUserCookie, { businessId: bizId });
  });

  it("bookmarks are never exposed on a public profile response", async () => {
    const res = await testApp.request(`/api/users/${targetUserId}`);
    expect(res.status).toBe(200);
    const json = await res.json();
    const parsed = publicProfileSchema.parse(json);

    expect(parsed.id).toBe(targetUserId);
    expect(parsed.displayName).toBe("Private User");
    // Assert structurally absent
    expect(json).not.toHaveProperty("bookmarks");
    expect(json).not.toHaveProperty("bookmarkCount");
    expect(json).not.toHaveProperty("savedBusinesses");
  });

  it("bookmarks are never exposed or inferable from public listing responses", async () => {
    const res = await testApp.request("/api/listings");
    expect(res.status).toBe(200);
    const parsed = listingsResponseSchema.parse(await res.json());
    for (const item of parsed.items) {
      expect(item).not.toHaveProperty("bookmarkedBy");
      expect(item).not.toHaveProperty("isBookmarked");
      expect(item).not.toHaveProperty("bookmarks");
    }
  });

  it("all bookmark responses carry Cache-Control: private, no-store", async () => {
    const listRes = await getBookmarks(targetUserCookie);
    expect(listRes.headers.get("Cache-Control")).toBe("private, no-store");

    const statusRes = await getBookmarkStatus(targetUserCookie, bizId);
    expect(statusRes.headers.get("Cache-Control")).toBe("private, no-store");

    const addRes = await addBookmark(targetUserCookie, { businessId: bizId });
    expect(addRes.headers.get("Cache-Control")).toBe("private, no-store");

    const delRes = await removeBookmark(targetUserCookie, bizId);
    expect(delRes.headers.get("Cache-Control")).toBe("private, no-store");
  });
});

describe("Bookmarks — Foreign Key Cascades & Not Found", () => {
  let userCookie: string;
  let ownerCookie: string;

  beforeAll(async () => {
    userCookie = await signUp("Cascade User", "cascade.bmk@example.com");
    await verifyEmail("cascade.bmk@example.com");

    ownerCookie = await signUp("Cascade Owner", "owner.cascade@example.com");
    await verifyEmail("owner.cascade@example.com");
  });

  it("returns 404 when bookmarking a nonexistent business", async () => {
    const res = await addBookmark(userCookie, { businessId: "nonexistent-biz-id-123" });
    expect(res.status).toBe(404);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("not_found");
  });

  it("cascades deletion when the underlying Business is deleted", async () => {
    const biz = await createBusinessWithListing(ownerCookie, "T20LL0005A", "Ephemeral Biz");
    await addBookmark(userCookie, { businessId: biz.id });

    // Verify bookmark exists
    const beforeRows = await db.select().from(bookmark).where(eq(bookmark.businessId, biz.id));
    expect(beforeRows).toHaveLength(1);

    // Delete business
    await db.delete(business).where(eq(business.id, biz.id));

    // Assert bookmark was cascade-deleted by PostgreSQL
    const afterRows = await db.select().from(bookmark).where(eq(bookmark.businessId, biz.id));
    expect(afterRows).toHaveLength(0);
  });

  it("cascades deletion when the User is deleted", async () => {
    const tempUserCookie = await signUp("Temp User", "temp.bmk@example.com");
    await verifyEmail("temp.bmk@example.com");
    const tempId = await userId("temp.bmk@example.com");

    const biz = await createBusinessWithListing(ownerCookie, "T20LL0006A", "Cascade Biz 2");
    await addBookmark(tempUserCookie, { businessId: biz.id });

    // Delete user
    await db.delete(user).where(eq(user.id, tempId));

    // Assert bookmark is gone
    const afterRows = await db.select().from(bookmark).where(eq(bookmark.userId, tempId));
    expect(afterRows).toHaveLength(0);
  });
});

describe("Bookmarks — Cursor Pagination", () => {
  let userCookie: string;
  const businessIds: string[] = [];

  beforeAll(async () => {
    userCookie = await signUp("Pagination User", "pagination.bmk@example.com");
    await verifyEmail("pagination.bmk@example.com");

    const ownerCookie = await signUp("Pagination Owner", "owner.pagination@example.com");
    await verifyEmail("owner.pagination@example.com");

    // Seed 25 businesses and bookmark them
    for (let i = 1; i <= 25; i++) {
      const uen = `T20LL${String(i).padStart(4, "0")}P`;
      const created = await createBusinessWithListing(ownerCookie, uen, `Paged Biz ${i}`);
      businessIds.push(created.id);
      await addBookmark(userCookie, { businessId: created.id });
    }
  });

  it("paginates bookmarks in stable order across cursor pages", async () => {
    // Page 1: limit 10
    const res1 = await getBookmarks(userCookie, "limit=10");
    expect(res1.status).toBe(200);
    const page1 = bookmarksResponseSchema.parse(await res1.json());
    expect(page1.items).toHaveLength(10);
    expect(page1.nextCursor).toBeTruthy();

    // Page 2: limit 10 with cursor from page 1
    const res2 = await getBookmarks(userCookie, `limit=10&cursor=${page1.nextCursor}`);
    expect(res2.status).toBe(200);
    const page2 = bookmarksResponseSchema.parse(await res2.json());
    expect(page2.items).toHaveLength(10);
    expect(page2.nextCursor).toBeTruthy();

    // Page 3: limit 10 with cursor from page 2 (remaining 5)
    const res3 = await getBookmarks(userCookie, `limit=10&cursor=${page2.nextCursor}`);
    expect(res3.status).toBe(200);
    const page3 = bookmarksResponseSchema.parse(await res3.json());
    expect(page3.items).toHaveLength(5);
    expect(page3.nextCursor).toBeNull();

    // Verify all 25 items are unique
    const allIds = [...page1.items, ...page2.items, ...page3.items].map(item => item.id);
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(25);
  });
});
