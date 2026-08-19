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
import { business } from "#server/database/business";
import { forumPostLike, reviewLike } from "#server/database/likes";
import { listing } from "#server/database/listing";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  forumFeedResponseSchema,
  forumPostItemSchema,
  forumRepliesResponseSchema,
} from "#shared/contracts/forum";
import { likeActionResponseSchema } from "#shared/contracts/likes";
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
    messageId: "mock_qstash_msg_likes",
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

describe("Likes — Reviews", () => {
  it("enforces authentication and email verification for liking reviews", async () => {
    const ownerId = await registerAndGetId({
      name: "Owner One",
      email: "owner1@likes.test",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const { bizId } = await seedBusiness(ownerId, "Like Cafe", "199000001L");

    const reviewerId = await registerAndGetId({
      name: "Reviewer One",
      email: "reviewer1@likes.test",
      password: "Password123!",
    });
    await verifyEmail(reviewerId);
    const reviewerCookie = await signIn("reviewer1@likes.test");

    await registerAndGetId({
      name: "Unverified One",
      email: "unverified1@likes.test",
      password: "Password123!",
    });
    const unverifiedCookie = await signIn("unverified1@likes.test");

    // Create a review
    const reviewRes = await testApp.request(`/api/businesses/${bizId}/reviews`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: reviewerCookie,
      },
      body: JSON.stringify({ rating: 5, content: "Great coffee!" }),
    });
    expect(reviewRes.status).toBe(201);
    const createdReview = reviewItemSchema.parse(await reviewRes.json());
    const reviewId = createdReview.id;

    // Anonymous like rejected
    const anonLike = await testApp.request(`/api/reviews/${reviewId}/like`, { method: "POST" });
    expect(anonLike.status).toBe(401);

    // Unverified like rejected with 403
    const unverifiedLike = await testApp.request(`/api/reviews/${reviewId}/like`, {
      method: "POST",
      headers: { cookie: unverifiedCookie },
    });
    expect(unverifiedLike.status).toBe(403);
    const unverifiedErr = errorEnvelopeSchema.parse(await unverifiedLike.json());
    expect(unverifiedErr.error.code).toBe("forbidden");

    // Verified user can like
    const verifiedLike = await testApp.request(`/api/reviews/${reviewId}/like`, {
      method: "POST",
      headers: { cookie: reviewerCookie },
    });
    expect(verifiedLike.status).toBe(200);
    const likeData = likeActionResponseSchema.parse(await verifiedLike.json());
    expect(likeData).toEqual({
      status: "liked",
      liked: true,
      likeCount: 1,
    });

    // Idempotent like by same user returns 200 with likeCount: 1
    const secondLike = await testApp.request(`/api/reviews/${reviewId}/like`, {
      method: "POST",
      headers: { cookie: reviewerCookie },
    });
    expect(secondLike.status).toBe(200);
    const secondLikeData = likeActionResponseSchema.parse(await secondLike.json());
    expect(secondLikeData).toEqual({
      status: "liked",
      liked: true,
      likeCount: 1,
    });

    // Another verified user likes review -> likeCount becomes 2
    const secondUserId = await registerAndGetId({
      name: "Second User",
      email: "user2@likes.test",
      password: "Password123!",
    });
    await verifyEmail(secondUserId);
    const secondUserCookie = await signIn("user2@likes.test");

    const user2Like = await testApp.request(`/api/reviews/${reviewId}/like`, {
      method: "POST",
      headers: { cookie: secondUserCookie },
    });
    expect(user2Like.status).toBe(200);
    const user2LikeData = likeActionResponseSchema.parse(await user2Like.json());
    expect(user2LikeData).toEqual({
      status: "liked",
      liked: true,
      likeCount: 2,
    });

    // Review feed query reflects batched likeCount and isLiked for authenticated user
    const feedWithAuth = await testApp.request(`/api/businesses/${bizId}/reviews`, {
      headers: { cookie: reviewerCookie },
    });
    expect(feedWithAuth.status).toBe(200);
    const feedAuthData = reviewsResponseSchema.parse(await feedWithAuth.json());
    expect(feedAuthData.items[0].likeCount).toBe(2);
    expect(feedAuthData.items[0].isLiked).toBe(true);

    // Anonymous feed read reflects likeCount: 2, isLiked: false
    const anonFeed = await testApp.request(`/api/businesses/${bizId}/reviews`);
    expect(anonFeed.status).toBe(200);
    const anonFeedData = reviewsResponseSchema.parse(await anonFeed.json());
    expect(anonFeedData.items[0].likeCount).toBe(2);
    expect(anonFeedData.items[0].isLiked).toBe(false);

    // Unliking review
    const unlikeRes = await testApp.request(`/api/reviews/${reviewId}/like`, {
      method: "DELETE",
      headers: { cookie: reviewerCookie },
    });
    expect(unlikeRes.status).toBe(200);
    const unlikeData = likeActionResponseSchema.parse(await unlikeRes.json());
    expect(unlikeData).toEqual({
      status: "unliked",
      liked: false,
      likeCount: 1,
    });

    // Idempotent unlike
    const secondUnlikeRes = await testApp.request(`/api/reviews/${reviewId}/like`, {
      method: "DELETE",
      headers: { cookie: reviewerCookie },
    });
    expect(secondUnlikeRes.status).toBe(200);
    const secondUnlikeData = likeActionResponseSchema.parse(await secondUnlikeRes.json());
    expect(secondUnlikeData).toEqual({
      status: "unliked",
      liked: false,
      likeCount: 1,
    });

    // 404 for non-existent review
    const notFoundLike = await testApp.request(`/api/reviews/${crypto.randomUUID()}/like`, {
      method: "POST",
      headers: { cookie: reviewerCookie },
    });
    expect(notFoundLike.status).toBe(404);
  });
});

describe("Likes — Forum Posts and Replies", () => {
  it("allows liking and unliking forum posts and replies with soft-deletion safeguards", async () => {
    const ownerId = await registerAndGetId({
      name: "Forum Author",
      email: "forumauthor@likes.test",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const authorCookie = await signIn("forumauthor@likes.test");
    const { bizId } = await seedBusiness(ownerId, "Forum Bakery", "199000002L");

    // Create a forum post
    const postRes = await testApp.request("/api/forum/posts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie,
      },
      body: JSON.stringify({
        businessId: bizId,
        title: "Best bread?",
        body: "Which sourdough is best?",
      }),
    });
    expect(postRes.status).toBe(201);
    const postData = forumPostItemSchema.parse(await postRes.json());
    const postId = postData.id;

    // Create a reply
    const replyRes = await testApp.request(`/api/forum/posts/${postId}/replies`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: authorCookie,
      },
      body: JSON.stringify({ body: "Country sourdough is top tier." }),
    });
    expect(replyRes.status).toBe(201);
    const replyData = forumRepliesResponseSchema.parse({
      items: [await replyRes.json()],
      nextCursor: null,
    });
    const replyId = replyData.items[0].id;

    // Like forum post
    const likePostRes = await testApp.request(`/api/forum/posts/${postId}/like`, {
      method: "POST",
      headers: { cookie: authorCookie },
    });
    expect(likePostRes.status).toBe(200);
    const postLikePayload = likeActionResponseSchema.parse(await likePostRes.json());
    expect(postLikePayload).toEqual({
      status: "liked",
      liked: true,
      likeCount: 1,
    });

    // Check feed and detail reads
    const detailRes = await testApp.request(`/api/forum/posts/${postId}`, {
      headers: { cookie: authorCookie },
    });
    expect(detailRes.status).toBe(200);
    const detailData = forumPostItemSchema.parse(await detailRes.json());
    expect(detailData.likeCount).toBe(1);
    expect(detailData.isLiked).toBe(true);

    const feedRes = await testApp.request("/api/forum/posts", {
      headers: { cookie: authorCookie },
    });
    expect(feedRes.status).toBe(200);
    const feedData = forumFeedResponseSchema.parse(await feedRes.json());
    expect(feedData.items.find(p => p.id === postId)?.likeCount).toBe(1);
    expect(feedData.items.find(p => p.id === postId)?.isLiked).toBe(true);

    // Like reply
    const likeReplyRes = await testApp.request(`/api/forum/replies/${replyId}/like`, {
      method: "POST",
      headers: { cookie: authorCookie },
    });
    expect(likeReplyRes.status).toBe(200);
    const replyLikePayload = likeActionResponseSchema.parse(await likeReplyRes.json());
    expect(replyLikePayload).toEqual({
      status: "liked",
      liked: true,
      likeCount: 1,
    });

    // Check replies feed
    const repliesFeed = await testApp.request(`/api/forum/posts/${postId}/replies`, {
      headers: { cookie: authorCookie },
    });
    expect(repliesFeed.status).toBe(200);
    const repliesFeedData = forumRepliesResponseSchema.parse(await repliesFeed.json());
    expect(repliesFeedData.items[0].likeCount).toBe(1);
    expect(repliesFeedData.items[0].isLiked).toBe(true);

    // Unlike reply
    const unlikeReplyRes = await testApp.request(`/api/forum/replies/${replyId}/like`, {
      method: "DELETE",
      headers: { cookie: authorCookie },
    });
    expect(unlikeReplyRes.status).toBe(200);
    expect(likeActionResponseSchema.parse(await unlikeReplyRes.json())).toEqual({
      status: "unliked",
      liked: false,
      likeCount: 0,
    });

    // Soft-delete the reply
    const deleteReplyRes = await testApp.request(`/api/forum/replies/${replyId}`, {
      method: "DELETE",
      headers: { cookie: authorCookie },
    });
    expect(deleteReplyRes.status).toBe(204);

    // Non-admin attempting to like soft-deleted reply receives 404
    const likeDeletedReply = await testApp.request(`/api/forum/replies/${replyId}/like`, {
      method: "POST",
      headers: { cookie: authorCookie },
    });
    expect(likeDeletedReply.status).toBe(404);

    // Soft-delete the post
    const deletePostRes = await testApp.request(`/api/forum/posts/${postId}`, {
      method: "DELETE",
      headers: { cookie: authorCookie },
    });
    expect(deletePostRes.status).toBe(204);

    // Non-admin attempting to like soft-deleted post receives 404
    const likeDeletedPost = await testApp.request(`/api/forum/posts/${postId}/like`, {
      method: "POST",
      headers: { cookie: authorCookie },
    });
    expect(likeDeletedPost.status).toBe(404);
  });
});

describe("Likes — Concurrency & Database Constraints", () => {
  it("handles 10 simultaneous like requests from the same user with exactly 1 like row created", async () => {
    const userId = await registerAndGetId({
      name: "Concurrent User",
      email: "concurrent@likes.test",
      password: "Password123!",
    });
    await verifyEmail(userId);
    const userCookie = await signIn("concurrent@likes.test");
    const { bizId } = await seedBusiness(userId, "Concurrency Bistro", "199000003L");

    const postRes = await testApp.request("/api/forum/posts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: userCookie,
      },
      body: JSON.stringify({
        businessId: bizId,
        title: "Concurrency Test",
        body: "Testing race conditions in liking.",
      }),
    });
    const post = forumPostItemSchema.parse(await postRes.json());
    const postId = post.id;

    // Launch 10 simultaneous like requests for the same post from the same user
    const promises = Array.from({ length: 10 }, async () =>
      testApp.request(`/api/forum/posts/${postId}/like`, {
        method: "POST",
        headers: { cookie: userCookie },
      })
    );

    const responses = await Promise.all(promises);
    for (const res of responses) {
      expect(res.status).toBe(200);
      const data = likeActionResponseSchema.parse(await res.json());
      expect(data.liked).toBe(true);
      expect(data.likeCount).toBe(1);
    }

    // Direct database verification: exactly 1 row exists in forum_post_like
    const dbLikes = await db.select().from(forumPostLike).where(eq(forumPostLike.postId, postId));
    expect(dbLikes.length).toBe(1);
    expect(dbLikes[0].userId).toBe(userId);
  });

  it("handles 10 simultaneous like requests from 10 distinct users producing exactly 10 likes", async () => {
    const ownerId = await registerAndGetId({
      name: "Owner Distinct",
      email: "distinctowner@likes.test",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const ownerCookie = await signIn("distinctowner@likes.test");
    const { bizId } = await seedBusiness(ownerId, "Distinct Bistro", "199000004L");

    const postRes = await testApp.request("/api/forum/posts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: ownerCookie,
      },
      body: JSON.stringify({
        businessId: bizId,
        title: "Popular Thread",
        body: "Everyone loves this!",
      }),
    });
    const post = forumPostItemSchema.parse(await postRes.json());
    const postId = post.id;

    // Register & sign in 10 distinct users
    const userCookies: string[] = [];
    for (let i = 0; i < 10; i++) {
      const email = `distinct_user_${i}@likes.test`;
      const id = await registerAndGetId({
        name: `Distinct User ${i}`,
        email,
        password: "Password123!",
      });
      await verifyEmail(id);
      userCookies.push(await signIn(email));
    }

    // Fire 10 simultaneous requests from all 10 users
    const promises = userCookies.map(async cookie =>
      testApp.request(`/api/forum/posts/${postId}/like`, {
        method: "POST",
        headers: { cookie },
      })
    );

    const responses = await Promise.all(promises);
    for (const res of responses) {
      expect(res.status).toBe(200);
    }

    // Verify exactly 10 rows exist in the DB
    const dbLikes = await db.select().from(forumPostLike).where(eq(forumPostLike.postId, postId));
    expect(dbLikes.length).toBe(10);
  }, 60_000);

  it("cascades deletion properly when target entity or user is deleted", async () => {
    const ownerId = await registerAndGetId({
      name: "Cascade Owner",
      email: "cascadeowner@likes.test",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const { bizId } = await seedBusiness(ownerId, "Cascade Cafe", "199000005L");

    const reviewerId = await registerAndGetId({
      name: "Cascade Reviewer",
      email: "cascadereviewer@likes.test",
      password: "Password123!",
    });
    await verifyEmail(reviewerId);
    const reviewerCookie = await signIn("cascadereviewer@likes.test");

    // Create review & like it
    const reviewRes = await testApp.request(`/api/businesses/${bizId}/reviews`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: reviewerCookie,
      },
      body: JSON.stringify({ rating: 5, content: "Cascade review" }),
    });
    expect(reviewRes.status).toBe(201);
    const createdReview = reviewItemSchema.parse(await reviewRes.json());
    const reviewId = createdReview.id;

    const likeRes = await testApp.request(`/api/reviews/${reviewId}/like`, {
      method: "POST",
      headers: { cookie: reviewerCookie },
    });
    expect(likeRes.status).toBe(200);

    const likesBefore = await db.select().from(reviewLike).where(eq(reviewLike.reviewId, reviewId));
    expect(likesBefore.length).toBe(1);

    // Hard delete the review row in DB (e.g. DELETE /api/reviews/:id)
    const deleteReviewRes = await testApp.request(`/api/reviews/${reviewId}`, {
      method: "DELETE",
      headers: { cookie: reviewerCookie },
    });
    expect(deleteReviewRes.status).toBe(204);

    // review_like should be cascaded to 0 rows, user should remain intact
    const likesAfter = await db.select().from(reviewLike).where(eq(reviewLike.reviewId, reviewId));
    expect(likesAfter.length).toBe(0);

    const userRows = await db.select().from(user).where(eq(user.id, reviewerId));
    expect(userRows.length).toBe(1);
  });
});
