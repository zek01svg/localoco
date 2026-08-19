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
import { forumPost, forumReply } from "#server/database/forum";
import { listing } from "#server/database/listing";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  forumFeedResponseSchema,
  forumPostItemSchema,
  forumRepliesResponseSchema,
  forumReplyItemSchema,
} from "#shared/contracts/forum";

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
    messageId: "mock_qstash_msg_forum",
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

async function seedPost(userId: string, bizId: string, title: string, createdAt = new Date()) {
  const postId = crypto.randomUUID();
  await db.insert(forumPost).values({
    id: postId,
    businessId: bizId,
    userId,
    title,
    body: `${title} — body`,
    createdAt,
    updatedAt: createdAt,
  });
  return postId;
}

async function seedReply(userId: string, postId: string, body: string, createdAt = new Date()) {
  const replyId = crypto.randomUUID();
  await db.insert(forumReply).values({
    id: replyId,
    postId,
    userId,
    body,
    createdAt,
    updatedAt: createdAt,
  });
  return replyId;
}

describe("Public forum read — anonymous visitor", () => {
  let ownerId: string;
  let bizId: string;
  let authorId: string;
  let postId: string;

  beforeAll(async () => {
    ownerId = await registerAndGetId({
      name: "Forum Owner 1",
      email: "forum.owner1@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Kaya Toast Central", "199100001A");
    bizId = seeded.bizId;

    authorId = await registerAndGetId({
      name: "Forum Author 1",
      email: "forum.author1@example.com",
      password: "Password123!",
    });
    await verifyEmail(authorId);
    postId = await seedPost(authorId, bizId, "Weekend crowd?");
  });

  it("serves the public feed to a visitor without any session", async () => {
    const res = await testApp.request("/api/forum/posts");
    expect(res.status).toBe(200);
    const body = forumFeedResponseSchema.parse(await res.json());
    expect(body.nextCursor).toBeNull();
    expect(body.items.length).toBeGreaterThanOrEqual(1);
    const post = body.items.find(p => p.id === postId);
    expect(post).toBeDefined();
    expect(post?.title).toBe("Weekend crowd?");
    expect(post?.author.displayName).toBe("Forum Author 1");
    expect(post?.business).toMatchObject({ id: bizId, name: "Kaya Toast Central" });
    expect(post?.replyCount).toBe(0);
  });

  it("serves a post detail to a visitor without any session", async () => {
    const res = await testApp.request(`/api/forum/posts/${postId}`);
    expect(res.status).toBe(200);
    const post = forumPostItemSchema.parse(await res.json());
    expect(post.id).toBe(postId);
    expect(post.business.id).toBe(bizId);
    expect(post.deletedAt).toBeNull();
  });

  it("returns not_found for an unknown post id", async () => {
    const res = await testApp.request("/api/forum/posts/post_unknown");
    expect(res.status).toBe(404);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("not_found");
  });

  it("returns empty replies for a post without replies", async () => {
    const res = await testApp.request(`/api/forum/posts/${postId}/replies`);
    expect(res.status).toBe(200);
    const body = forumRepliesResponseSchema.parse(await res.json());
    expect(body).toEqual({ items: [], nextCursor: null });
  });

  it("returns not_found for replies of an unknown post", async () => {
    const res = await testApp.request("/api/forum/posts/post_unknown/replies");
    expect(res.status).toBe(404);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("not_found");
  });
});

describe("Forum publishing — authentication and verification constraints", () => {
  let bizId: string;
  let unverifiedCookie: string;
  let verifiedUserId: string;
  let verifiedCookie: string;

  beforeAll(async () => {
    const ownerId = await registerAndGetId({
      name: "Forum Owner 2",
      email: "forum.owner2@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Bak Kut Teh Haven", "199100002B");
    bizId = seeded.bizId;

    await registerAndGetId({
      name: "Unverified Forum User",
      email: "forum.unverified@example.com",
      password: "Password123!",
    });
    unverifiedCookie = await signIn("forum.unverified@example.com");

    verifiedUserId = await registerAndGetId({
      name: "Verified Forum User",
      email: "forum.verified@example.com",
      password: "Password123!",
    });
    await verifyEmail(verifiedUserId);
    verifiedCookie = await signIn("forum.verified@example.com");
  });

  const payload = {
    businessId: "will-be-replaced",
    title: "Is the laksa worth it?",
    body: "Planning a visit this weekend.",
  };

  it("rejects unauthenticated post creation with 401", async () => {
    const res = await testApp.request("/api/forum/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, businessId: bizId }),
    });
    expect(res.status).toBe(401);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("unauthorized");
  });

  it("rejects unverified user post creation with 403 forbidden", async () => {
    const res = await testApp.request("/api/forum/posts", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: unverifiedCookie },
      body: JSON.stringify({ ...payload, businessId: bizId }),
    });
    expect(res.status).toBe(403);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("forbidden");
  });

  it("rejects unauthenticated reply creation with 401", async () => {
    const res = await testApp.request("/api/forum/posts/some_post/replies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: "Sneaking a reply in" }),
    });
    expect(res.status).toBe(401);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("unauthorized");
  });

  it("rejects unverified user reply creation with 403 forbidden", async () => {
    const res = await testApp.request("/api/forum/posts/some_post/replies", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: unverifiedCookie },
      body: JSON.stringify({ body: "Sneaking a reply in" }),
    });
    expect(res.status).toBe(403);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("forbidden");
  });

  it("rejects post creation for an unknown business with 404", async () => {
    const res = await testApp.request("/api/forum/posts", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: verifiedCookie },
      body: JSON.stringify({ ...payload, businessId: "biz_unknown" }),
    });
    expect(res.status).toBe(404);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("not_found");
  });

  it("allows a verified user to publish a post referencing a business", async () => {
    const res = await testApp.request("/api/forum/posts", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: verifiedCookie },
      body: JSON.stringify({ ...payload, businessId: bizId }),
    });

    expect(res.status).toBe(201);
    const post = forumPostItemSchema.parse(await res.json());
    expect(post).toMatchObject({
      businessId: bizId,
      userId: verifiedUserId,
      title: "Is the laksa worth it?",
      body: "Planning a visit this weekend.",
      replyCount: 0,
      author: { id: verifiedUserId, displayName: "Verified Forum User" },
    });
    expect(post.id).toBeDefined();

    const rows = await db
      .select({ businessId: forumPost.businessId })
      .from(forumPost)
      .where(eq(forumPost.id, post.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].businessId).toBe(bizId);
  });

  it("allows a verified user to reply to a published post", async () => {
    const authorCookie = verifiedCookie;
    const created = await testApp.request("/api/forum/posts", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: authorCookie },
      body: JSON.stringify({ ...payload, businessId: bizId, title: "Reply target" }),
    });
    const createdPost = forumPostItemSchema.parse(await created.json());

    const res = await testApp.request(`/api/forum/posts/${createdPost.id}/replies`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: authorCookie },
      body: JSON.stringify({ body: "Tried it last week — great!" }),
    });

    expect(res.status).toBe(201);
    const reply = forumReplyItemSchema.parse(await res.json());
    expect(reply).toMatchObject({
      postId: createdPost.id,
      userId: verifiedUserId,
      body: "Tried it last week — great!",
      author: { id: verifiedUserId, displayName: "Verified Forum User" },
    });
    expect(reply.deletedAt).toBeNull();
  });
});

describe("Forum input validation", () => {
  let bizId: string;
  let authorCookie: string;

  beforeAll(async () => {
    const ownerId = await registerAndGetId({
      name: "Forum Owner 3",
      email: "forum.owner3@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Satay Street", "199100003C");
    bizId = seeded.bizId;

    const authorId = await registerAndGetId({
      name: "Forum Validator",
      email: "forum.validator@example.com",
      password: "Password123!",
    });
    await verifyEmail(authorId);
    authorCookie = await signIn("forum.validator@example.com");
  });

  it("rejects a missing businessId with 400 invalid_request", async () => {
    const res = await testApp.request("/api/forum/posts", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: authorCookie },
      body: JSON.stringify({ title: "T", body: "B" }),
    });
    expect(res.status).toBe(400);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("invalid_request");
  });

  it("rejects empty or whitespace-only titles and bodies with 400", async () => {
    for (const bad of [
      { title: "   ", body: "ok body" },
      { title: "ok title", body: "   " },
      { title: "a".repeat(201), body: "ok body" },
      { title: "ok title", body: "a".repeat(4001) },
    ]) {
      const res = await testApp.request("/api/forum/posts", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: authorCookie },
        body: JSON.stringify({ ...bad, businessId: bizId }),
      });
      expect(res.status).toBe(400);
      const err = errorEnvelopeSchema.parse(await res.json());
      expect(err.error.code).toBe("invalid_request");
    }
  });

  it("rejects empty reply bodies with 400", async () => {
    const res = await testApp.request("/api/forum/posts/some_post/replies", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: authorCookie },
      body: JSON.stringify({ body: "" }),
    });
    expect(res.status).toBe(400);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("invalid_request");
  });
});

describe("Public read filtering — soft deletion stays out of public reads", () => {
  let authorId: string;
  let bizId: string;
  let livePostId: string;
  let deletedPostId: string;
  let deletedReplyId: string;
  let liveReplyId: string;

  beforeAll(async () => {
    const ownerId = await registerAndGetId({
      name: "Forum Owner 4",
      email: "forum.owner4@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Teh Tarik Corner", "199100004D");
    bizId = seeded.bizId;

    authorId = await registerAndGetId({
      name: "Forum Author 4",
      email: "forum.author4@example.com",
      password: "Password123!",
    });
    await verifyEmail(authorId);

    livePostId = await seedPost(authorId, bizId, "Still public");
    deletedPostId = await seedPost(authorId, bizId, "Author deleted me");
    liveReplyId = await seedReply(authorId, livePostId, "Visible reply");
    deletedReplyId = await seedReply(authorId, livePostId, "Deleted reply");

    await db
      .update(forumPost)
      .set({ deletedAt: new Date() })
      .where(eq(forumPost.id, deletedPostId));
    await db
      .update(forumReply)
      .set({ deletedAt: new Date() })
      .where(eq(forumReply.id, deletedReplyId));
  });

  it("excludes soft-deleted posts from the public feed", async () => {
    const res = await testApp.request("/api/forum/posts");
    expect(res.status).toBe(200);
    const body = forumFeedResponseSchema.parse(await res.json());
    const ids = body.items.map(p => p.id);
    expect(ids).toContain(livePostId);
    expect(ids).not.toContain(deletedPostId);
  });

  it("answers 404 for the detail of a soft-deleted post", async () => {
    const res = await testApp.request(`/api/forum/posts/${deletedPostId}`);
    expect(res.status).toBe(404);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("not_found");
  });

  it("answers 404 for replies of a soft-deleted post", async () => {
    const res = await testApp.request(`/api/forum/posts/${deletedPostId}/replies`);
    expect(res.status).toBe(404);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("not_found");
  });

  it("excludes soft-deleted replies from the replies feed", async () => {
    const res = await testApp.request(`/api/forum/posts/${livePostId}/replies`);
    expect(res.status).toBe(200);
    const body = forumRepliesResponseSchema.parse(await res.json());
    const ids = body.items.map(r => r.id);
    expect(ids).toContain(liveReplyId);
    expect(ids).not.toContain(deletedReplyId);
  });

  it("counts only publicly visible replies in feed and detail replyCount", async () => {
    const feed = await testApp.request("/api/forum/posts");
    const feedBody = forumFeedResponseSchema.parse(await feed.json());
    const feedPost = feedBody.items.find(p => p.id === livePostId);
    expect(feedPost?.replyCount).toBe(1);

    const detail = await testApp.request(`/api/forum/posts/${livePostId}`);
    const detailBody = forumPostItemSchema.parse(await detail.json());
    expect(detailBody.replyCount).toBe(1);
  });

  it("refuses reply creation on a soft-deleted post with 404", async () => {
    const replierId = await registerAndGetId({
      name: "Forum Replier",
      email: "forum.replier4@example.com",
      password: "Password123!",
    });
    await verifyEmail(replierId);
    const cookie = await signIn("forum.replier4@example.com");

    const res = await testApp.request(`/api/forum/posts/${deletedPostId}/replies`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ body: "Can I revive this?" }),
    });
    expect(res.status).toBe(404);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("not_found");
  });
});

describe("Author-only edit and soft delete", () => {
  let authorId: string;
  let otherUserId: string;
  let bizId: string;
  let postId: string;
  let replyId: string;
  let authorCookie: string;
  let otherCookie: string;

  beforeAll(async () => {
    const ownerId = await registerAndGetId({
      name: "Forum Owner 5",
      email: "forum.owner5@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Dim Sum Palace", "199100005E");
    bizId = seeded.bizId;

    authorId = await registerAndGetId({
      name: "Forum Author 5",
      email: "forum.author5@example.com",
      password: "Password123!",
    });
    await verifyEmail(authorId);
    authorCookie = await signIn("forum.author5@example.com");

    otherUserId = await registerAndGetId({
      name: "Forum Intruder",
      email: "forum.intruder5@example.com",
      password: "Password123!",
    });
    await verifyEmail(otherUserId);
    otherCookie = await signIn("forum.intruder5@example.com");

    postId = await seedPost(authorId, bizId, "Original title");
    replyId = await seedReply(authorId, postId, "Original reply body");
  });

  it("rejects another user editing the post with 403", async () => {
    const res = await testApp.request(`/api/forum/posts/${postId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: otherCookie },
      body: JSON.stringify({ title: "Vandalized title" }),
    });
    expect(res.status).toBe(403);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("forbidden");
  });

  it("rejects another user editing the reply with 403", async () => {
    const res = await testApp.request(`/api/forum/replies/${replyId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: otherCookie },
      body: JSON.stringify({ body: "Vandalized reply" }),
    });
    expect(res.status).toBe(403);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("forbidden");
  });

  it("rejects another user soft-deleting the post with 403", async () => {
    const res = await testApp.request(`/api/forum/posts/${postId}`, {
      method: "DELETE",
      headers: { cookie: otherCookie },
    });
    expect(res.status).toBe(403);
  });

  it("rejects another user soft-deleting the reply with 403", async () => {
    const res = await testApp.request(`/api/forum/replies/${replyId}`, {
      method: "DELETE",
      headers: { cookie: otherCookie },
    });
    expect(res.status).toBe(403);
  });

  it("rejects unauthenticated edits and deletes with 401", async () => {
    const edit = await testApp.request(`/api/forum/posts/${postId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Sneaky" }),
    });
    expect(edit.status).toBe(401);

    const del = await testApp.request(`/api/forum/posts/${postId}`, { method: "DELETE" });
    expect(del.status).toBe(401);
  });

  it("lets the author edit title and body", async () => {
    const res = await testApp.request(`/api/forum/posts/${postId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: authorCookie },
      body: JSON.stringify({ title: "Edited title", body: "Edited body" }),
    });
    expect(res.status).toBe(200);
    const post = forumPostItemSchema.parse(await res.json());
    expect(post.title).toBe("Edited title");
    expect(post.body).toBe("Edited body");
  });

  it("lets the author edit a reply", async () => {
    const res = await testApp.request(`/api/forum/replies/${replyId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: authorCookie },
      body: JSON.stringify({ body: "Edited reply body" }),
    });
    expect(res.status).toBe(200);
    const reply = forumReplyItemSchema.parse(await res.json());
    expect(reply.body).toBe("Edited reply body");
  });

  it("soft-deletes a reply: hidden from public reads but the row remains", async () => {
    const res = await testApp.request(`/api/forum/replies/${replyId}`, {
      method: "DELETE",
      headers: { cookie: authorCookie },
    });
    expect(res.status).toBe(204);

    const rows = await db
      .select({ deletedAt: forumReply.deletedAt })
      .from(forumReply)
      .where(eq(forumReply.id, replyId));
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();

    const publicReplies = await testApp.request(`/api/forum/posts/${postId}/replies`);
    const body = forumRepliesResponseSchema.parse(await publicReplies.json());
    expect(body.items.map(r => r.id)).not.toContain(replyId);
  });

  it("refuses to edit or delete a soft-deleted reply with 404", async () => {
    const patch = await testApp.request(`/api/forum/replies/${replyId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: authorCookie },
      body: JSON.stringify({ body: "Resurrected?" }),
    });
    expect(patch.status).toBe(404);

    const del = await testApp.request(`/api/forum/replies/${replyId}`, {
      method: "DELETE",
      headers: { cookie: authorCookie },
    });
    expect(del.status).toBe(404);
  });

  it("soft-deletes a post: hidden from public feed and detail", async () => {
    const res = await testApp.request(`/api/forum/posts/${postId}`, {
      method: "DELETE",
      headers: { cookie: authorCookie },
    });
    expect(res.status).toBe(204);

    const rows = await db
      .select({ deletedAt: forumPost.deletedAt })
      .from(forumPost)
      .where(eq(forumPost.id, postId));
    expect(rows).toHaveLength(1);
    expect(rows[0].deletedAt).not.toBeNull();

    const detail = await testApp.request(`/api/forum/posts/${postId}`);
    expect(detail.status).toBe(404);

    const feed = await testApp.request("/api/forum/posts");
    const feedBody = forumFeedResponseSchema.parse(await feed.json());
    expect(feedBody.items.map(p => p.id)).not.toContain(postId);
  });

  it("refuses to edit a soft-deleted post with 404", async () => {
    const res = await testApp.request(`/api/forum/posts/${postId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: authorCookie },
      body: JSON.stringify({ title: "Resurrected?" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("Pagination and ordering", () => {
  let authorId: string;
  let bizId: string;
  let postId: string;
  const base = new Date("2099-08-01T00:00:00.000Z");

  beforeAll(async () => {
    const ownerId = await registerAndGetId({
      name: "Forum Owner 6",
      email: "forum.owner6@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Roti Prata House", "199100006F");
    bizId = seeded.bizId;

    authorId = await registerAndGetId({
      name: "Forum Author 6",
      email: "forum.author6@example.com",
      password: "Password123!",
    });
    await verifyEmail(authorId);

    for (let i = 0; i < 5; i++) {
      await seedPost(authorId, bizId, `Feed post ${i}`, new Date(base.getTime() + i * 60_000));
    }
    postId = await seedPost(
      authorId,
      bizId,
      "Threaded post",
      new Date(base.getTime() + 5 * 60_000)
    );
    for (let i = 0; i < 5; i++) {
      await seedReply(authorId, postId, `Reply ${i}`, new Date(base.getTime() + i * 60_000));
    }
  });

  it("pages the feed newest-first without duplicates", async () => {
    const page1Res = await testApp.request("/api/forum/posts?limit=2");
    expect(page1Res.status).toBe(200);
    const page1 = forumFeedResponseSchema.parse(await page1Res.json());
    expect(page1.items).toHaveLength(2);
    expect(page1.nextCursor).not.toBeNull();
    expect(page1.items[0].title).toBe("Threaded post");
    expect(page1.items[1].title).toBe("Feed post 4");

    const page2Res = await testApp.request(`/api/forum/posts?limit=2&cursor=${page1.nextCursor}`);
    const page2 = forumFeedResponseSchema.parse(await page2Res.json());
    expect(page2.items).toHaveLength(2);
    expect(page2.items[0].title).toBe("Feed post 3");
    expect(page2.items[1].title).toBe("Feed post 2");

    const page3Res = await testApp.request(`/api/forum/posts?limit=2&cursor=${page2.nextCursor}`);
    const page3 = forumFeedResponseSchema.parse(await page3Res.json());
    expect(page3.items).toHaveLength(2);
    expect(page3.items[0].title).toBe("Feed post 1");
    expect(page3.items[1].title).toBe("Feed post 0");

    const seen = new Set([
      ...page1.items.map(p => p.id),
      ...page2.items.map(p => p.id),
      ...page3.items.map(p => p.id),
    ]);
    expect(seen.size).toBe(6);
  });

  it("pages replies oldest-first without duplicates", async () => {
    const page1Res = await testApp.request(`/api/forum/posts/${postId}/replies?limit=2`);
    const page1 = forumRepliesResponseSchema.parse(await page1Res.json());
    expect(page1.items).toHaveLength(2);
    expect(page1.nextCursor).not.toBeNull();
    expect(page1.items[0].body).toBe("Reply 0");
    expect(page1.items[1].body).toBe("Reply 1");

    const page2Res = await testApp.request(
      `/api/forum/posts/${postId}/replies?limit=2&cursor=${page1.nextCursor}`
    );
    const page2 = forumRepliesResponseSchema.parse(await page2Res.json());
    expect(page2.items).toHaveLength(2);
    expect(page2.items[0].body).toBe("Reply 2");
    expect(page2.items[1].body).toBe("Reply 3");

    const page3Res = await testApp.request(
      `/api/forum/posts/${postId}/replies?limit=2&cursor=${page2.nextCursor}`
    );
    const page3 = forumRepliesResponseSchema.parse(await page3Res.json());
    expect(page3.items).toHaveLength(1);
    expect(page3.items[0].body).toBe("Reply 4");
    expect(page3.nextCursor).toBeNull();

    const seen = new Set([
      ...page1.items.map(r => r.id),
      ...page2.items.map(r => r.id),
      ...page3.items.map(r => r.id),
    ]);
    expect(seen.size).toBe(5);
  });
});

describe("Query batching assertion", () => {
  let authorId: string;
  let bizId: string;
  let postId: string;

  beforeAll(async () => {
    const ownerId = await registerAndGetId({
      name: "Forum Owner 7",
      email: "forum.owner7@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Batch Bakery", "199100007G");
    bizId = seeded.bizId;

    authorId = await registerAndGetId({
      name: "Forum Author 7",
      email: "forum.author7@example.com",
      password: "Password123!",
    });
    await verifyEmail(authorId);

    for (let i = 0; i < 10; i++) {
      const p = await seedPost(authorId, bizId, `Batch post ${i}`);
      if (i % 2 === 0) {
        await seedReply(authorId, p, "batched reply");
      }
    }
    postId = await seedPost(authorId, bizId, "Batch replies host");
    for (let i = 0; i < 10; i++) {
      await seedReply(authorId, postId, `Batch reply ${i}`);
    }
  });

  it("serves the feed with a single query regardless of post count", async () => {
    const unsafe = vi.spyOn(db.$client, "unsafe");
    unsafe.mockClear();

    const res = await testApp.request("/api/forum/posts?limit=10");
    expect(res.status).toBe(200);
    const body = forumFeedResponseSchema.parse(await res.json());
    expect(body.items.length).toBeGreaterThan(0);

    expect(unsafe).toHaveBeenCalledTimes(1);

    unsafe.mockRestore();
  });

  it("serves post detail with a single query", async () => {
    const unsafe = vi.spyOn(db.$client, "unsafe");
    unsafe.mockClear();

    const res = await testApp.request(`/api/forum/posts/${postId}`);
    expect(res.status).toBe(200);

    expect(unsafe).toHaveBeenCalledTimes(1);

    unsafe.mockRestore();
  });

  it("serves a page of replies with exactly two queries (visibility check + batch)", async () => {
    const unsafe = vi.spyOn(db.$client, "unsafe");
    unsafe.mockClear();

    const res = await testApp.request(`/api/forum/posts/${postId}/replies?limit=10`);
    expect(res.status).toBe(200);
    const body = forumRepliesResponseSchema.parse(await res.json());
    expect(body.items).toHaveLength(10);

    expect(unsafe).toHaveBeenCalledTimes(2);

    unsafe.mockRestore();
  });
});

describe("Administrator visibility of soft-deleted content", () => {
  let adminId: string;
  let adminCookie: string;
  let authorId: string;
  let bizId: string;
  let deletedPostId: string;
  let deletedReplyId: string;

  beforeAll(async () => {
    adminId = await registerAndGetId({
      name: "Forum Admin",
      email: "forum.admin@example.com",
      password: "Password123!",
    });
    await verifyEmail(adminId);
    await db.insert(administrator).values({ userId: adminId });
    adminCookie = await signIn("forum.admin@example.com");

    const ownerId = await registerAndGetId({
      name: "Forum Owner 8",
      email: "forum.owner8@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    const seeded = await seedBusiness(ownerId, "Admin Watch Cafe", "199100008H");
    bizId = seeded.bizId;

    authorId = await registerAndGetId({
      name: "Forum Author 8",
      email: "forum.author8@example.com",
      password: "Password123!",
    });
    await verifyEmail(authorId);
    deletedPostId = await seedPost(authorId, bizId, "Moderation candidate");
    deletedReplyId = await seedReply(authorId, deletedPostId, "Candidate reply");
    await db
      .update(forumPost)
      .set({ deletedAt: new Date() })
      .where(eq(forumPost.id, deletedPostId));
    await db
      .update(forumReply)
      .set({ deletedAt: new Date() })
      .where(eq(forumReply.id, deletedReplyId));
  });

  it("rejects includeDeleted for anonymous visitors with 403", async () => {
    const res = await testApp.request("/api/forum/posts?includeDeleted=true");
    expect(res.status).toBe(403);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("forbidden");
  });

  it("rejects includeDeleted for verified non-administrators with 403", async () => {
    const authorCookie = await signIn("forum.author8@example.com");
    const res = await testApp.request("/api/forum/posts?includeDeleted=true", {
      headers: { cookie: authorCookie },
    });
    expect(res.status).toBe(403);
    const err = errorEnvelopeSchema.parse(await res.json());
    expect(err.error.code).toBe("forbidden");
  });

  it("shows soft-deleted posts to an administrator with includeDeleted", async () => {
    const res = await testApp.request("/api/forum/posts?includeDeleted=true", {
      headers: { cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const body = forumFeedResponseSchema.parse(await res.json());
    const post = body.items.find(p => p.id === deletedPostId);
    expect(post).toBeDefined();
    expect(post?.deletedAt).not.toBeNull();
  });

  it("serves soft-deleted post detail and its replies to an administrator", async () => {
    const detail = await testApp.request(`/api/forum/posts/${deletedPostId}?includeDeleted=true`, {
      headers: { cookie: adminCookie },
    });
    expect(detail.status).toBe(200);
    const post = forumPostItemSchema.parse(await detail.json());
    expect(post.deletedAt).not.toBeNull();

    const replies = await testApp.request(
      `/api/forum/posts/${deletedPostId}/replies?includeDeleted=true`,
      { headers: { cookie: adminCookie } }
    );
    expect(replies.status).toBe(200);
    const body = forumRepliesResponseSchema.parse(await replies.json());
    const reply = body.items.find(r => r.id === deletedReplyId);
    expect(reply).toBeDefined();
    expect(reply?.deletedAt).not.toBeNull();

    const publicDetail = await testApp.request(`/api/forum/posts/${deletedPostId}`);
    expect(publicDetail.status).toBe(404);
  });

  it("counts deleted replies for administrators so count and list agree", async () => {
    const publicReplies = await testApp.request(`/api/forum/posts/${deletedPostId}/replies`);
    expect(publicReplies.status).toBe(404);

    const detail = await testApp.request(`/api/forum/posts/${deletedPostId}?includeDeleted=true`, {
      headers: { cookie: adminCookie },
    });
    const post = forumPostItemSchema.parse(await detail.json());
    const adminReplies = await testApp.request(
      `/api/forum/posts/${deletedPostId}/replies?includeDeleted=true`,
      { headers: { cookie: adminCookie } }
    );
    const body = forumRepliesResponseSchema.parse(await adminReplies.json());
    expect(post.replyCount).toBe(body.items.length);
  });

  it("keeps deleted posts out of the administrator feed without includeDeleted", async () => {
    const res = await testApp.request("/api/forum/posts", {
      headers: { cookie: adminCookie },
    });
    expect(res.status).toBe(200);
    const body = forumFeedResponseSchema.parse(await res.json());
    expect(body.items.map(p => p.id)).not.toContain(deletedPostId);
  });

  it("answers 404 for a deleted post detail without includeDeleted even for admins", async () => {
    const res = await testApp.request(`/api/forum/posts/${deletedPostId}`, {
      headers: { cookie: adminCookie },
    });
    expect(res.status).toBe(404);
  });
});
