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
import { listing } from "#server/database/listing";
import { review } from "#server/database/reviews";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import { reviewItemSchema, reviewsResponseSchema } from "#shared/contracts/reviews";

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
    messageId: "mock_qstash_msg_reviews",
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

async function seedBusiness(ownerId: string, name: string, uen: string) {
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
    status: "published",
    name,
    category: "Food & Beverage",
    address: "123 Orchard Road",
    postalCode: "238888",
    createdAt: now,
    updatedAt: now,
  });

  return { bizId, listingId };
}

describe("Public reviews read — anonymous visitor", () => {
  let ownerId: string;
  let bizId: string;

  beforeAll(async () => {
    ownerId = await registerAndGetId({
      name: "Owner 1",
      email: "owner1.rev@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Kaya Toast Central", "199000001A");
    bizId = seeded.bizId;
  });

  it("returns empty items and null average rating for a business without reviews", async () => {
    const res = await testApp.request(`/api/businesses/${bizId}/reviews`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      items: [],
      nextCursor: null,
      aggregate: {
        averageRating: null,
        totalCount: 0,
      },
    });
  });

  it("returns not_found for an unknown business id", async () => {
    const res = await testApp.request("/api/businesses/biz_unknown/reviews");
    expect(res.status).toBe(404);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("not_found");
  });
});

describe("Review publishing — authentication and verification constraints", () => {
  let ownerId: string;
  let bizId: string;
  let unverifiedCookie: string;
  let verifiedUserId: string;
  let verifiedCookie: string;

  beforeAll(async () => {
    ownerId = await registerAndGetId({
      name: "Owner 2",
      email: "owner2.rev@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Bak Kut Teh Haven", "199000002B");
    bizId = seeded.bizId;

    await registerAndGetId({
      name: "Unverified User",
      email: "unverified.rev@example.com",
      password: "Password123!",
    });
    unverifiedCookie = await signIn("unverified.rev@example.com");

    verifiedUserId = await registerAndGetId({
      name: "Verified Reviewer",
      email: "verified.rev@example.com",
      password: "Password123!",
    });
    await verifyEmail(verifiedUserId);
    verifiedCookie = await signIn("verified.rev@example.com");
  });

  it("rejects unauthenticated review creation with 401", async () => {
    const res = await testApp.request(`/api/businesses/${bizId}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rating: 5, content: "Great food!" }),
    });

    expect(res.status).toBe(401);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("unauthorized");
  });

  it("rejects unverified user review creation with 403 forbidden", async () => {
    const res = await testApp.request(`/api/businesses/${bizId}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: unverifiedCookie },
      body: JSON.stringify({ rating: 5, content: "Great food!" }),
    });

    expect(res.status).toBe(403);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("forbidden");
  });

  it("rejects business owner reviewing their own business with 403 forbidden", async () => {
    const ownerCookie = await signIn("owner2.rev@example.com");
    const res = await testApp.request(`/api/businesses/${bizId}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: ownerCookie },
      body: JSON.stringify({ rating: 5, content: "I love my own business!" }),
    });

    expect(res.status).toBe(403);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("forbidden");
    expect(err.error.message).toContain("Business owners cannot review their own business");
  });

  it("allows verified user to publish a review", async () => {
    const res = await testApp.request(`/api/businesses/${bizId}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: verifiedCookie },
      body: JSON.stringify({ rating: 5, content: "Outstanding broth and tender ribs!" }),
    });

    expect(res.status).toBe(201);
    const body = reviewItemSchema.parse(await res.json());
    expect(body).toMatchObject({
      businessId: bizId,
      userId: verifiedUserId,
      rating: 5,
      content: "Outstanding broth and tender ribs!",
      author: {
        id: verifiedUserId,
        displayName: "Verified Reviewer",
      },
    });
    expect(body.id).toBeDefined();
    expect(body.createdAt).toBeDefined();
  });
});

describe("Rating bounds and input validation", () => {
  let bizId: string;
  let reviewerCookie: string;

  beforeAll(async () => {
    const ownerId = await registerAndGetId({
      name: "Owner 3",
      email: "owner3.rev@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Satay Street", "199000003C");
    bizId = seeded.bizId;

    const reviewerId = await registerAndGetId({
      name: "Validator User",
      email: "val.rev@example.com",
      password: "Password123!",
    });
    await verifyEmail(reviewerId);
    reviewerCookie = await signIn("val.rev@example.com");
  });

  it("rejects ratings outside 1-5 with 400 invalid_request", async () => {
    for (const invalidRating of [0, 6, -1, 3.5]) {
      const res = await testApp.request(`/api/businesses/${bizId}/reviews`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: reviewerCookie },
        body: JSON.stringify({ rating: invalidRating, content: "Testing rating bounds" }),
      });

      expect(res.status).toBe(400);
      const err = errorEnvelopeSchema.parse(await res.json());
      expect(err.error.code).toBe("invalid_request");
    }
  });

  it("rejects empty or whitespace content with 400 invalid_request", async () => {
    const res = await testApp.request(`/api/businesses/${bizId}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: reviewerCookie },
      body: JSON.stringify({ rating: 5, content: "   " }),
    });

    expect(res.status).toBe(400);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("invalid_request");
  });
});

describe("Uniqueness constraint & concurrency protection", () => {
  let bizId: string;
  let reviewerId: string;
  let reviewerCookie: string;

  beforeAll(async () => {
    const ownerId = await registerAndGetId({
      name: "Owner 4",
      email: "owner4.rev@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Rojak Royale", "199000004D");
    bizId = seeded.bizId;

    reviewerId = await registerAndGetId({
      name: "Concurrent Reviewer",
      email: "concurrent.rev@example.com",
      password: "Password123!",
    });
    await verifyEmail(reviewerId);
    reviewerCookie = await signIn("concurrent.rev@example.com");
  });

  it("enforces one review per user and business under sequential attempts (returns 409 conflict)", async () => {
    const first = await testApp.request(`/api/businesses/${bizId}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: reviewerCookie },
      body: JSON.stringify({ rating: 4, content: "First review!" }),
    });
    expect(first.status).toBe(201);

    const second = await testApp.request(`/api/businesses/${bizId}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: reviewerCookie },
      body: JSON.stringify({ rating: 5, content: "Second review should fail!" }),
    });
    expect(second.status).toBe(409);
    const err = errorEnvelopeSchema.parse(await second.json());
    expect(err.error.code).toBe("conflict");
  });

  it("handles high-concurrency simultaneous create attempts gracefully: exactly one succeeds", async () => {
    // Create a new business and reviewer for pure concurrency test
    const ownerId = await registerAndGetId({
      name: "Owner Concurrency",
      email: "owner.concurrent@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Laksa Legends", "199000005E");

    const concurrentUserId = await registerAndGetId({
      name: "Multi Thread User",
      email: "multithread@example.com",
      password: "Password123!",
    });
    await verifyEmail(concurrentUserId);
    const cookie = await signIn("multithread@example.com");

    const attempts = 8;
    const promises = Array.from({ length: attempts }, async (_, i) =>
      testApp.request(`/api/businesses/${seeded.bizId}/reviews`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ rating: 5, content: `Concurrent attempt #${i}` }),
      })
    );

    const results = await Promise.all(promises);
    const statusCodes = results.map(r => r.status);

    const successCount = statusCodes.filter(s => s === 201).length;
    const conflictCount = statusCodes.filter(s => s === 409).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(attempts - 1);

    // Verify only 1 review row was written to the database
    const dbReviews = await db.select().from(review).where(eq(review.businessId, seeded.bizId));
    expect(dbReviews.length).toBe(1);
  });
});

describe("Author-only review editing & deletion", () => {
  let bizId: string;
  let reviewId: string;
  let authorCookie: string;
  let otherUserCookie: string;

  beforeAll(async () => {
    const ownerId = await registerAndGetId({
      name: "Owner 5",
      email: "owner5.rev@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Chilli Crab King", "199000006F");
    bizId = seeded.bizId;

    const authorId = await registerAndGetId({
      name: "Author User",
      email: "author.rev@example.com",
      password: "Password123!",
    });
    await verifyEmail(authorId);
    authorCookie = await signIn("author.rev@example.com");

    const otherUserId = await registerAndGetId({
      name: "Other User",
      email: "other.rev@example.com",
      password: "Password123!",
    });
    await verifyEmail(otherUserId);
    otherUserCookie = await signIn("other.rev@example.com");

    const createRes = await testApp.request(`/api/businesses/${bizId}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: authorCookie },
      body: JSON.stringify({ rating: 4, content: "Good crab." }),
    });
    if (createRes.status !== 201) {
      throw new Error("Failed to create seed review");
    }
    const body = reviewItemSchema.parse(await createRes.json());
    reviewId = body.id;
  });

  it("rejects non-author attempts to edit a review with 403 forbidden", async () => {
    const res = await testApp.request(`/api/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: otherUserCookie },
      body: JSON.stringify({ rating: 1, content: "Hacked!" }),
    });

    expect(res.status).toBe(403);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("forbidden");
  });

  it("allows the review author to edit rating and content", async () => {
    const res = await testApp.request(`/api/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: authorCookie },
      body: JSON.stringify({ rating: 5, content: "Actually, it was incredible crab!" }),
    });

    expect(res.status).toBe(200);
    const body = reviewItemSchema.parse(await res.json());
    expect(body.rating).toBe(5);
    expect(body.content).toBe("Actually, it was incredible crab!");
  });

  it("rejects non-author attempts to delete a review with 403 forbidden", async () => {
    const res = await testApp.request(`/api/reviews/${reviewId}`, {
      method: "DELETE",
      headers: { cookie: otherUserCookie },
    });

    expect(res.status).toBe(403);
  });

  it("allows author to delete their own review", async () => {
    const res = await testApp.request(`/api/reviews/${reviewId}`, {
      method: "DELETE",
      headers: { cookie: authorCookie },
    });

    expect(res.status).toBe(204);

    // Verify it is gone from business reviews
    const listRes = await testApp.request(`/api/businesses/${bizId}/reviews`);
    const listBody = reviewsResponseSchema.parse(await listRes.json());
    expect(listBody.items.length).toBe(0);
    expect(listBody.aggregate?.totalCount).toBe(0);
  });

  it("allows platform administrator to delete a user review", async () => {
    // Author creates a new review
    const createRes = await testApp.request(`/api/businesses/${bizId}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: authorCookie },
      body: JSON.stringify({ rating: 3, content: "Review to be deleted by admin" }),
    });
    expect(createRes.status).toBe(201);
    const created = reviewItemSchema.parse(await createRes.json());

    // Register admin user
    const adminId = await registerAndGetId({
      name: "Platform Admin",
      email: "admin.rev@example.com",
      password: "Password123!",
    });
    await verifyEmail(adminId);
    await db.insert(administrator).values({ userId: adminId });
    const adminCookie = await signIn("admin.rev@example.com");

    const deleteRes = await testApp.request(`/api/reviews/${created.id}`, {
      method: "DELETE",
      headers: { cookie: adminCookie },
    });
    expect(deleteRes.status).toBe(204);

    // Verify gone
    const verifyRes = await testApp.request(`/api/reviews/${created.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: authorCookie },
      body: JSON.stringify({ rating: 4, content: "Does not exist" }),
    });
    expect(verifyRes.status).toBe(404);
  });
});

describe("Derived aggregate ratings & pagination", () => {
  let bizId: string;

  beforeAll(async () => {
    const ownerId = await registerAndGetId({
      name: "Owner 6",
      email: "owner6.rev@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Hainanese Chicken Rice", "199000007G");
    bizId = seeded.bizId;

    await Promise.all(
      [
        {
          name: "Reviewer 1",
          email: "reviewer1.agg@example.com",
          rating: 5,
          content: "Review content 1",
        },
        {
          name: "Reviewer 2",
          email: "reviewer2.agg@example.com",
          rating: 4,
          content: "Review content 2",
        },
        {
          name: "Reviewer 3",
          email: "reviewer3.agg@example.com",
          rating: 3,
          content: "Review content 3",
        },
      ].map(async r => {
        const id = await registerAndGetId({
          name: r.name,
          email: r.email,
          password: "Password123!",
        });
        await verifyEmail(id);
        const cookie = await signIn(r.email);
        const res = await testApp.request(`/api/businesses/${bizId}/reviews`, {
          method: "POST",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ rating: r.rating, content: r.content }),
        });
        if (res.status !== 201) {
          throw new Error("Failed to seed review");
        }
      })
    );
  });

  it("derives average rating (4.0) and total count (3) correctly", async () => {
    const res = await testApp.request(`/api/businesses/${bizId}/reviews`);
    expect(res.status).toBe(200);
    const body = reviewsResponseSchema.parse(await res.json());
    expect(body.items.length).toBe(3);
    expect(body.aggregate).toEqual({
      averageRating: 4,
      totalCount: 3,
    });
  });

  it("paginates reviews using keyset cursor", async () => {
    const page1Res = await testApp.request(`/api/businesses/${bizId}/reviews?limit=2`);
    expect(page1Res.status).toBe(200);
    const page1 = reviewsResponseSchema.parse(await page1Res.json());
    expect(page1.items.length).toBe(2);
    expect(page1.nextCursor).toBeTruthy();

    const cursorParam = String(page1.nextCursor);
    const page2Res = await testApp.request(
      `/api/businesses/${bizId}/reviews?limit=2&cursor=${encodeURIComponent(cursorParam)}`
    );
    expect(page2Res.status).toBe(200);
    const page2 = reviewsResponseSchema.parse(await page2Res.json());
    expect(page2.items.length).toBe(1);
    expect(page2.nextCursor).toBeNull();
  });
});

describe("Public profile review feed", () => {
  let reviewerId: string;
  let reviewerCookie: string;
  let bizId: string;

  beforeAll(async () => {
    const ownerId = await registerAndGetId({
      name: "Owner 7",
      email: "owner7.rev@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Prata Palace", "199000008H");
    bizId = seeded.bizId;

    reviewerId = await registerAndGetId({
      name: "Public Contributor",
      email: "public.contrib@example.com",
      password: "Password123!",
    });
    await verifyEmail(reviewerId);
    reviewerCookie = await signIn("public.contrib@example.com");

    const res = await testApp.request(`/api/businesses/${bizId}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: reviewerCookie },
      body: JSON.stringify({ rating: 5, content: "Crispy coin prata!" }),
    });
    if (res.status !== 201) {
      throw new Error("Failed to create seed review");
    }
  });

  it("serves user's public review stream with business metadata", async () => {
    const res = await testApp.request(`/api/users/${reviewerId}/reviews`);
    expect(res.status).toBe(200);
    const body = reviewsResponseSchema.parse(await res.json());
    expect(body.items.length).toBe(1);
    expect(body.items[0]).toMatchObject({
      userId: reviewerId,
      rating: 5,
      content: "Crispy coin prata!",
      business: {
        id: bizId,
        name: "Prata Palace",
      },
    });
  });
});
