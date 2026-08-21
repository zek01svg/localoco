import type { announcement as announcementType } from "#server/database/announcement";
import type {
  account as accountType,
  session as sessionType,
  user as userType,
} from "#server/database/auth";
import type { bookmark as bookmarkType } from "#server/database/bookmark";
import type { business as businessType } from "#server/database/business";
import type { emailDelivery as emailDeliveryType } from "#server/database/email";
import type { event as eventType } from "#server/database/event";
import type {
  forumPost as forumPostType,
  forumReply as forumReplyType,
} from "#server/database/forum";
import type {
  forumPostLike as forumPostLikeType,
  forumReplyLike as forumReplyLikeType,
  reviewLike as reviewLikeType,
} from "#server/database/likes";
import type { listing as listingType } from "#server/database/listing";
import type { mediaObject as mediaObjectType } from "#server/database/media";
import type { review as reviewType } from "#server/database/reviews";
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

import { errorEnvelopeSchema } from "#shared/contracts/error";
import { accountDeletionResponseSchema, deletionPreviewSchema } from "#shared/contracts/profiles";

import {
  createTestHonoApp,
  extractSessionCookie,
  registerUser,
  startPostgresContainer,
} from "./auth-helpers";

vi.mock("hono/bun", () => ({
  serveStatic: () => (_c: Context, next: Next) => next(),
}));

const { mockPublishEmailJob, mockDeleteObject } = vi.hoisted(() => ({
  mockPublishEmailJob: vi.fn<() => Promise<{ messageId: string }>>().mockResolvedValue({
    messageId: "mock_qstash_msg_123",
  }),
  mockDeleteObject: vi.fn<(key: string) => Promise<void>>().mockResolvedValue(),
}));

vi.mock("#server/lib/email/qstash", () => ({
  publishEmailJob: () => mockPublishEmailJob(),
  verifyQStashSignature: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
}));

vi.mock("#server/lib/media-storage", () => ({
  mediaStorageConfigured: () => true,
  presignUploadUrl: vi.fn<() => Promise<unknown>>(),
  presignDownloadUrl: vi.fn<() => Promise<unknown>>(),
  statObject: vi.fn<() => Promise<unknown>>(),
  deleteObject: (key: string) => mockDeleteObject(key),
}));

let container: Awaited<ReturnType<typeof startPostgresContainer>>["container"];
let sql: ReturnType<typeof postgres>;

let app: AppType;
let testApp: Hono<TestAppEnv>;
let db: typeof dbInstance;
let requireAuth: MiddlewareHandler;
let requireVerified: MiddlewareHandler;

let announcement: typeof announcementType;
let bookmark: typeof bookmarkType;
let business: typeof businessType;
let event: typeof eventType;
let forumPost: typeof forumPostType;
let forumReply: typeof forumReplyType;
let forumPostLike: typeof forumPostLikeType;
let forumReplyLike: typeof forumReplyLikeType;
let reviewLike: typeof reviewLikeType;
let listing: typeof listingType;
let mediaObject: typeof mediaObjectType;
let review: typeof reviewType;
let user: typeof userType;
let session: typeof sessionType;
let account: typeof accountType;
let emailDelivery: typeof emailDeliveryType;

const PASSWORD = "Password123!";
const ORIGIN = "http://localhost:4000";

const signUp = async (name: string, email: string) => {
  const res = await registerUser(testApp, { name, email, password: PASSWORD });
  expect(res.status).toBe(200);
  return extractSessionCookie(res);
};

const signIn = async (email: string, password = PASSWORD) => {
  const res = await testApp.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify({ email, password }),
  });
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
  expect([200, 302]).toContain(res.status);
};

const getUserId = async (email: string) => {
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  expect(row, `no user for ${email}`).toBeTruthy();
  return row.id;
};

beforeAll(async () => {
  const started = await startPostgresContainer();
  container = started.container;
  sql = postgres(started.databaseUrl);

  process.env.DATABASE_URL = started.databaseUrl;
  process.env.BETTER_AUTH_SECRET = "super-secret-test-key-32-chars-long!!";
  process.env.BETTER_AUTH_URL = ORIGIN;
  process.env.NODE_ENV = "test";
  process.env.PORT = "4001";
  process.env.VITE_APP_URL = ORIGIN;

  const authSchema = await import("#server/database/auth");
  user = authSchema.user;
  session = authSchema.session;
  account = authSchema.account;

  const emailSchema = await import("#server/database/email");
  emailDelivery = emailSchema.emailDelivery;

  const bizSchema = await import("#server/database/business");
  business = bizSchema.business;

  const listingSchema = await import("#server/database/listing");
  listing = listingSchema.listing;

  const reviewSchema = await import("#server/database/reviews");
  review = reviewSchema.review;

  const forumSchema = await import("#server/database/forum");
  forumPost = forumSchema.forumPost;
  forumReply = forumSchema.forumReply;

  const likesSchema = await import("#server/database/likes");
  reviewLike = likesSchema.reviewLike;
  forumPostLike = likesSchema.forumPostLike;
  forumReplyLike = likesSchema.forumReplyLike;

  const bookmarkSchema = await import("#server/database/bookmark");
  bookmark = bookmarkSchema.bookmark;

  const eventSchema = await import("#server/database/event");
  event = eventSchema.event;

  const announcementSchema = await import("#server/database/announcement");
  announcement = announcementSchema.announcement;

  const mediaSchema = await import("#server/database/media");
  mediaObject = mediaSchema.mediaObject;

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
  await sql.end();
  await container.stop();
});

describe("GET /api/profile/deletion-preview", () => {
  let aliceCookie: string;
  let aliceId: string;
  let bobId: string;

  beforeAll(async () => {
    aliceCookie = await signUp("Alice Preview", "alice.preview@example.com");
    await verifyEmail("alice.preview@example.com");
    aliceId = await getUserId("alice.preview@example.com");

    await signUp("Bob Preview", "bob.preview@example.com");
    await verifyEmail("bob.preview@example.com");
    bobId = await getUserId("bob.preview@example.com");

    // Seed Alice's data:
    // 1. Business + Listing
    const [biz1] = await db
      .insert(business)
      .values({
        id: crypto.randomUUID(),
        uen: "T20LL0001A",
        ownerId: aliceId,
      })
      .returning();

    await db.insert(listing).values({
      id: crypto.randomUUID(),
      businessId: biz1.id,
      name: "Alice Cafe",
      category: "Food & Beverage",
      address: "10 Orchard Road",
      postalCode: "238888",
      status: "published",
    });

    // 2. Reviews: Alice reviews Biz1 (or another biz), Bob reviews Biz1
    const [aliceReview] = await db
      .insert(review)
      .values({
        id: crypto.randomUUID(),
        businessId: biz1.id,
        userId: aliceId,
        rating: 5,
        content: "My own cafe",
      })
      .returning();

    // 3. Forum post started by Alice
    const [alicePost] = await db
      .insert(forumPost)
      .values({
        id: crypto.randomUUID(),
        businessId: biz1.id,
        userId: aliceId,
        title: "Welcome to Alice Cafe",
        body: "Feel free to discuss our opening menu!",
      })
      .returning();

    // 4. Forum post started by Bob
    const [bobPost] = await db
      .insert(forumPost)
      .values({
        id: crypto.randomUUID(),
        businessId: biz1.id,
        userId: bobId,
        title: "Question about hours",
        body: "Are you open on weekends?",
      })
      .returning();

    // 5. Replies:
    // - Bob replies to Alice's post (third-party reply to Alice's post!)
    await db.insert(forumReply).values({
      id: crypto.randomUUID(),
      postId: alicePost.id,
      userId: bobId,
      body: "Looks delicious!",
    });
    // - Another reply by Bob on Alice's post
    await db.insert(forumReply).values({
      id: crypto.randomUUID(),
      postId: alicePost.id,
      userId: bobId,
      body: "Can't wait to visit!",
    });
    // - Alice replies to her own post (own reply, not third-party)
    await db.insert(forumReply).values({
      id: crypto.randomUUID(),
      postId: alicePost.id,
      userId: aliceId,
      body: "Thanks Bob!",
    });
    // - Alice replies to Bob's post (Alice's authored reply, but on Bob's post)
    await db.insert(forumReply).values({
      id: crypto.randomUUID(),
      postId: bobPost.id,
      userId: aliceId,
      body: "Yes, 9am to 6pm!",
    });

    // 6. Likes by Alice:
    // - Alice likes her review
    await db.insert(reviewLike).values({
      id: crypto.randomUUID(),
      userId: aliceId,
      reviewId: aliceReview.id,
    });
    // - Alice likes Bob's post
    await db.insert(forumPostLike).values({
      id: crypto.randomUUID(),
      userId: aliceId,
      postId: bobPost.id,
    });

    // 7. Bookmark by Alice:
    await db.insert(bookmark).values({
      id: crypto.randomUUID(),
      userId: aliceId,
      businessId: biz1.id,
    });

    // 8. Event by Alice:
    await db.insert(event).values({
      id: crypto.randomUUID(),
      businessId: biz1.id,
      userId: aliceId,
      title: "Grand Opening Tasting",
      description: "Sample our signature coffees",
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 90000000),
    });

    // 9. Announcement by Alice:
    await db.insert(announcement).values({
      id: crypto.randomUUID(),
      businessId: biz1.id,
      userId: aliceId,
      title: "Soft Launch Special",
      content: "20% off all drinks this week!",
    });
  });

  it("rejects unauthenticated visitors with 401 unauthorized", async () => {
    const res = await testApp.request("/api/profile/deletion-preview");
    expect(res.status).toBe(401);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("unauthorized");
  });

  it("returns exact counts of owned listings, authored contributions, forum posts, and third-party replies", async () => {
    const res = await testApp.request("/api/profile/deletion-preview", {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");

    const body = deletionPreviewSchema.parse(await res.json());
    expect(body).toEqual({
      ownedListings: 1, // 1 listing for Alice Cafe
      affectedForumPosts: 1, // 1 forum post started by Alice
      thirdPartyReplies: 2, // 2 replies written by Bob on Alice's post
      // Authored contributions = 1 review + 1 forum post + 2 replies (1 on alicePost, 1 on bobPost) + 1 review like + 1 forum post like + 0 forum reply likes + 1 bookmark + 1 event + 1 announcement = 9
      authoredContributions: 9,
    });
  });

  it("returns zero counts for a fresh User with no contributions or businesses", async () => {
    const freshCookie = await signUp("Fresh User", "fresh.user@example.com");
    const res = await testApp.request("/api/profile/deletion-preview", {
      headers: { cookie: freshCookie },
    });
    expect(res.status).toBe(200);
    const body = deletionPreviewSchema.parse(await res.json());
    expect(body).toEqual({
      ownedListings: 0,
      authoredContributions: 0,
      affectedForumPosts: 0,
      thirdPartyReplies: 0,
    });
  });
});

describe("DELETE /api/profile (Account Deletion & Cascade)", () => {
  let userCookie: string;
  let userIdVal: string;
  let otherIdVal: string;
  let userBizId: string;
  let userListingId: string;
  let userPostId: string;
  let otherPostId: string;
  let otherReplyOnUserPostId: string;
  let userReplyOnOtherPostId: string;
  let mediaKey1: string;
  let mediaKey2: string;

  beforeAll(async () => {
    userCookie = await signUp("Cascade User", "cascade.user@example.com");
    await verifyEmail("cascade.user@example.com");
    userCookie = await signIn("cascade.user@example.com");
    userIdVal = await getUserId("cascade.user@example.com");

    await signUp("Other User", "other.user@example.com");
    await verifyEmail("other.user@example.com");
    otherIdVal = await getUserId("other.user@example.com");

    // 1. Business + Listing owned by user
    userBizId = crypto.randomUUID();
    await db.insert(business).values({
      id: userBizId,
      uen: "T20LL9999Z",
      ownerId: userIdVal,
    });

    userListingId = crypto.randomUUID();
    await db.insert(listing).values({
      id: userListingId,
      businessId: userBizId,
      name: "Cascade Eatery",
      category: "Food & Beverage",
      address: "50 Marina Bay",
      postalCode: "018956",
      status: "published",
    });

    // Business owned by other user
    const [otherBiz] = await db
      .insert(business)
      .values({
        id: crypto.randomUUID(),
        uen: "T20LL8888Y",
        ownerId: otherIdVal,
      })
      .returning();

    // 2. Media objects
    mediaKey1 = `listing_photo/${userBizId}/${crypto.randomUUID()}.jpg`;
    mediaKey2 = `listing_photo/${userBizId}/${crypto.randomUUID()}.png`;
    await db.insert(mediaObject).values([
      {
        id: crypto.randomUUID(),
        key: mediaKey1,
        ownerId: userIdVal,
        businessId: userBizId,
        purpose: "listing_photo",
        contentType: "image/jpeg",
        size: 1024,
        status: "active",
      },
      {
        id: crypto.randomUUID(),
        key: mediaKey2,
        ownerId: userIdVal,
        businessId: userBizId,
        purpose: "listing_photo",
        contentType: "image/png",
        size: 2048,
        status: "active",
      },
    ]);

    // 3. User Review
    await db.insert(review).values({
      id: crypto.randomUUID(),
      businessId: userBizId,
      userId: userIdVal,
      rating: 4,
      content: "Great ambience",
    });

    // 4. Forum post started by User
    userPostId = crypto.randomUUID();
    await db.insert(forumPost).values({
      id: userPostId,
      businessId: userBizId,
      userId: userIdVal,
      title: "Cascade Discussion",
      body: "Let us discuss the cascade",
    });

    // 5. Forum post started by Other User on otherBiz
    otherPostId = crypto.randomUUID();
    await db.insert(forumPost).values({
      id: otherPostId,
      businessId: otherBiz.id,
      userId: otherIdVal,
      title: "Other User Topic",
      body: "Topic by another author",
    });

    // 6. Replies:
    // - Other user writes reply on User's post (must cascade when User is deleted!)
    otherReplyOnUserPostId = crypto.randomUUID();
    await db.insert(forumReply).values({
      id: otherReplyOnUserPostId,
      postId: userPostId,
      userId: otherIdVal,
      body: "Third party reply that should be destroyed with the post",
    });

    // - User writes reply on Other user's post (must be deleted, but Other user's post remains!)
    userReplyOnOtherPostId = crypto.randomUUID();
    await db.insert(forumReply).values({
      id: userReplyOnOtherPostId,
      postId: otherPostId,
      userId: userIdVal,
      body: "User reply on someone else's post",
    });

    // 7. Likes
    await db.insert(forumPostLike).values({
      id: crypto.randomUUID(),
      userId: userIdVal,
      postId: otherPostId,
    });
    await db.insert(forumReplyLike).values({
      id: crypto.randomUUID(),
      userId: userIdVal,
      replyId: otherReplyOnUserPostId,
    });

    // 8. Bookmark
    await db.insert(bookmark).values({
      id: crypto.randomUUID(),
      userId: userIdVal,
      businessId: userBizId,
    });

    // 9. Event & Announcement
    await db.insert(event).values({
      id: crypto.randomUUID(),
      businessId: userBizId,
      userId: userIdVal,
      title: "Cascade Event",
      description: "Event description",
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 90000000),
    });

    await db.insert(announcement).values({
      id: crypto.randomUUID(),
      businessId: userBizId,
      userId: userIdVal,
      title: "Cascade Announcement",
      content: "Announcement content",
    });
  });

  it("rejects unauthenticated requests with 401", async () => {
    const res = await testApp.request("/api/profile", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: PASSWORD, confirmation: "DELETE" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects invalid confirmation string with 400", async () => {
    const res = await testApp.request("/api/profile", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        cookie: userCookie,
      },
      body: JSON.stringify({ password: PASSWORD, confirmation: "delete" }),
    });
    expect(res.status).toBe(400);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("invalid_request");
  });

  it("rejects incorrect password (failed reauthentication) with 401", async () => {
    const res = await testApp.request("/api/profile", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        cookie: userCookie,
      },
      body: JSON.stringify({ password: "WrongPassword999!", confirmation: "DELETE" }),
    });
    expect(res.status).toBe(401);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("unauthorized");
  });

  it("executes account destruction: revokes sessions, deletes R2 objects, and cascades PostgreSQL records", async () => {
    // Also establish a second active session for the same user
    const secondCookie = await signIn("cascade.user@example.com");

    const res = await testApp.request("/api/profile", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        cookie: userCookie,
      },
      body: JSON.stringify({ password: PASSWORD, confirmation: "DELETE" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const resBody = accountDeletionResponseSchema.parse(await res.json());
    expect(resBody.status).toBe("account_deleted");
    expect(resBody.deletedAt).toBeInstanceOf(Date);

    // 1. Session revocation: All existing sessions return 401 on protected paths
    const postCheck1 = await testApp.request("/api/profile", {
      headers: { cookie: userCookie },
    });
    expect(postCheck1.status).toBe(401);

    const postCheck2 = await testApp.request("/api/profile", {
      headers: { cookie: secondCookie },
    });
    expect(postCheck2.status).toBe(401);

    // 2. R2 Storage deletions: Verify deleteObject was called for all media keys
    expect(mockDeleteObject).toHaveBeenCalledWith(mediaKey1);
    expect(mockDeleteObject).toHaveBeenCalledWith(mediaKey2);

    // 3. PostgreSQL Database assertions:
    // User record is completely gone (not soft deleted)
    const userRows = await db.select().from(user).where(eq(user.id, userIdVal));
    expect(userRows).toHaveLength(0);

    // Auth sessions and accounts are gone
    const sessionRows = await db.select().from(session).where(eq(session.userId, userIdVal));
    expect(sessionRows).toHaveLength(0);
    const accountRows = await db.select().from(account).where(eq(account.userId, userIdVal));
    expect(accountRows).toHaveLength(0);

    // Businesses and listings owned by user are gone
    const bizRows = await db.select().from(business).where(eq(business.ownerId, userIdVal));
    expect(bizRows).toHaveLength(0);
    const listingRows = await db.select().from(listing).where(eq(listing.businessId, userBizId));
    expect(listingRows).toHaveLength(0);

    // Media objects are gone from DB
    const mediaDbRows = await db
      .select()
      .from(mediaObject)
      .where(eq(mediaObject.ownerId, userIdVal));
    expect(mediaDbRows).toHaveLength(0);

    // User's reviews, bookmarks, events, announcements are gone
    const reviewRows = await db.select().from(review).where(eq(review.userId, userIdVal));
    expect(reviewRows).toHaveLength(0);
    const bookmarkRows = await db.select().from(bookmark).where(eq(bookmark.userId, userIdVal));
    expect(bookmarkRows).toHaveLength(0);
    const eventRows = await db.select().from(event).where(eq(event.userId, userIdVal));
    expect(eventRows).toHaveLength(0);
    const announcementRows = await db
      .select()
      .from(announcement)
      .where(eq(announcement.userId, userIdVal));
    expect(announcementRows).toHaveLength(0);

    // Likes are gone
    const postLikeRows = await db
      .select()
      .from(forumPostLike)
      .where(eq(forumPostLike.userId, userIdVal));
    expect(postLikeRows).toHaveLength(0);

    // Forum posts started by user are gone
    const userPostRows = await db.select().from(forumPost).where(eq(forumPost.id, userPostId));
    expect(userPostRows).toHaveLength(0);

    // CRITICAL: Third-party reply written by Bob on Alice's post was DESTROYED by cascade!
    const thirdPartyReplyRows = await db
      .select()
      .from(forumReply)
      .where(eq(forumReply.id, otherReplyOnUserPostId));
    expect(thirdPartyReplyRows).toHaveLength(0);

    // User's reply on Other user's post was deleted
    const userReplyOnOtherRows = await db
      .select()
      .from(forumReply)
      .where(eq(forumReply.id, userReplyOnOtherPostId));
    expect(userReplyOnOtherRows).toHaveLength(0);

    // BUT Other user's forum post remains intact
    const otherPostRows = await db.select().from(forumPost).where(eq(forumPost.id, otherPostId));
    expect(otherPostRows).toHaveLength(1);
    expect(otherPostRows[0].userId).toBe(otherIdVal);
  });
});
