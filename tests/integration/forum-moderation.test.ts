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
import { forumModerationAudit, forumPost, forumReply } from "#server/database/forum";
import { listing } from "#server/database/listing";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  forumFeedResponseSchema,
  forumModerationAuditsResponseSchema,
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
    messageId: "mock_qstash_msg_forum_mod",
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
    body: `${title} — body content`,
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

describe("PRS-194: Administrator Moderation of Forum Content", () => {
  let adminId: string;
  let adminCookie: string;
  let ownerId: string;
  let ownerCookie: string;
  let authorId: string;
  let authorCookie: string;
  let otherUserId: string;
  let otherUserCookie: string;
  let bizId: string;

  beforeAll(async () => {
    adminId = await registerAndGetId({
      name: "Mod Admin",
      email: "mod.admin@example.com",
      password: "Password123!",
    });
    await verifyEmail(adminId);
    await db.insert(administrator).values({ userId: adminId });
    adminCookie = await signIn("mod.admin@example.com");

    ownerId = await registerAndGetId({
      name: "Biz Owner",
      email: "mod.owner@example.com",
      password: "Password123!",
    });
    await verifyEmail(ownerId);
    ownerCookie = await signIn("mod.owner@example.com");

    const seeded = await seedBusiness(ownerId, "Moderation Test Cafe", "199200001A");
    bizId = seeded.bizId;

    authorId = await registerAndGetId({
      name: "Post Author",
      email: "mod.author@example.com",
      password: "Password123!",
    });
    await verifyEmail(authorId);
    authorCookie = await signIn("mod.author@example.com");

    otherUserId = await registerAndGetId({
      name: "Other User",
      email: "mod.other@example.com",
      password: "Password123!",
    });
    await verifyEmail(otherUserId);
    otherUserCookie = await signIn("mod.other@example.com");
  });

  describe("Administrative Moderation of Forum Posts", () => {
    it("allows an administrator to moderate a forum post with a required reason", async () => {
      const postId = await seedPost(authorId, bizId, "Abusive Post 1");

      const res = await testApp.request(`/api/forum/posts/${postId}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ reason: "Violates community standards against abuse" }),
      });

      expect(res.status).toBe(200);
      const body = forumPostItemSchema.parse(await res.json());
      expect(body.id).toBe(postId);
      expect(body.moderatedAt).not.toBeNull();

      // Verify database row
      const [postRow] = await db.select().from(forumPost).where(eq(forumPost.id, postId));
      expect(postRow.moderatedAt).not.toBeNull();

      // Verify audit record
      const audits = await db
        .select()
        .from(forumModerationAudit)
        .where(eq(forumModerationAudit.targetId, postId));
      expect(audits).toHaveLength(1);
      expect(audits[0].actorId).toBe(adminId);
      expect(audits[0].targetType).toBe("post");
      expect(audits[0].reason).toBe("Violates community standards against abuse");
      expect(audits[0].originalTitle).toBe("Abusive Post 1");
      expect(audits[0].originalBody).toBe("Abusive Post 1 — body content");
      expect(audits[0].originalAuthorId).toBe(authorId);
    });

    it("rejects moderation without a reason or with empty reason with 400 invalid_request", async () => {
      const postId = await seedPost(authorId, bizId, "Post For Validation Check");

      const resMissing = await testApp.request(`/api/forum/posts/${postId}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({}),
      });
      expect(resMissing.status).toBe(400);
      const errMissing = errorEnvelopeSchema.parse(await resMissing.json());
      expect(errMissing.error.code).toBe("invalid_request");

      const resEmpty = await testApp.request(`/api/forum/posts/${postId}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ reason: "    " }),
      });
      expect(resEmpty.status).toBe(400);
      const errEmpty = errorEnvelopeSchema.parse(await resEmpty.json());
      expect(errEmpty.error.code).toBe("invalid_request");
    });

    it("answers 404 not_found when moderating a non-existent post", async () => {
      const res = await testApp.request(`/api/forum/posts/non-existent-id/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ reason: "Valid reason" }),
      });
      expect(res.status).toBe(404);
      const err = errorEnvelopeSchema.parse(await res.json());
      expect(err.error.code).toBe("not_found");
    });

    it("answers 409 conflict when moderating an already moderated post", async () => {
      const postId = await seedPost(authorId, bizId, "Already Moderated Post");
      await testApp.request(`/api/forum/posts/${postId}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ reason: "First moderation" }),
      });

      const res2 = await testApp.request(`/api/forum/posts/${postId}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ reason: "Second moderation attempt" }),
      });
      expect(res2.status).toBe(409);
      const err = errorEnvelopeSchema.parse(await res2.json());
      expect(err.error.code).toBe("conflict");
    });
  });

  describe("Administrative Moderation of Forum Replies", () => {
    it("allows an administrator to moderate a forum reply with a required reason", async () => {
      const postId = await seedPost(authorId, bizId, "Host Post For Reply Mod");
      const replyId = await seedReply(otherUserId, postId, "Abusive reply text");

      const res = await testApp.request(`/api/forum/replies/${replyId}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ reason: "Targeted harassment" }),
      });

      expect(res.status).toBe(200);
      const body = forumReplyItemSchema.parse(await res.json());
      expect(body.id).toBe(replyId);
      expect(body.moderatedAt).not.toBeNull();

      // Verify database row
      const [replyRow] = await db.select().from(forumReply).where(eq(forumReply.id, replyId));
      expect(replyRow.moderatedAt).not.toBeNull();

      // Verify audit record
      const audits = await db
        .select()
        .from(forumModerationAudit)
        .where(eq(forumModerationAudit.targetId, replyId));
      expect(audits).toHaveLength(1);
      expect(audits[0].actorId).toBe(adminId);
      expect(audits[0].targetType).toBe("reply");
      expect(audits[0].reason).toBe("Targeted harassment");
      expect(audits[0].originalTitle).toBeNull();
      expect(audits[0].originalBody).toBe("Abusive reply text");
      expect(audits[0].originalAuthorId).toBe(otherUserId);
    });

    it("rejects reply moderation missing a reason with 400", async () => {
      const postId = await seedPost(authorId, bizId, "Host Post 2");
      const replyId = await seedReply(otherUserId, postId, "Reply 2");

      const res = await testApp.request(`/api/forum/replies/${replyId}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ reason: "" }),
      });
      expect(res.status).toBe(400);
      const err = errorEnvelopeSchema.parse(await res.json());
      expect(err.error.code).toBe("invalid_request");
    });

    it("answers 409 conflict when moderating an already moderated reply", async () => {
      const postId = await seedPost(authorId, bizId, "Host Post 3");
      const replyId = await seedReply(otherUserId, postId, "Reply 3");
      await testApp.request(`/api/forum/replies/${replyId}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ reason: "First mod" }),
      });

      const res2 = await testApp.request(`/api/forum/replies/${replyId}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ reason: "Second mod" }),
      });
      expect(res2.status).toBe(409);
    });
  });

  describe("Distinguishability in Data (Author Soft-Deletion vs Administrative Moderation)", () => {
    it("distinguishes author soft-deletion from administrative moderation in data and audit presence", async () => {
      const softDeletedPostId = await seedPost(authorId, bizId, "Soft Deleted By Author");
      const moderatedPostId = await seedPost(authorId, bizId, "Moderated By Admin");

      // Author soft-deletes their post
      const deleteRes = await testApp.request(`/api/forum/posts/${softDeletedPostId}`, {
        method: "DELETE",
        headers: { cookie: authorCookie },
      });
      expect(deleteRes.status).toBe(204);

      // Admin moderates post
      const modRes = await testApp.request(`/api/forum/posts/${moderatedPostId}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ reason: "Prohibited advertising" }),
      });
      expect(modRes.status).toBe(200);

      // Check soft-deleted row: deletedAt is set, moderatedAt is null, 0 audit rows
      const [softRow] = await db
        .select()
        .from(forumPost)
        .where(eq(forumPost.id, softDeletedPostId));
      expect(softRow.deletedAt).not.toBeNull();
      expect(softRow.moderatedAt).toBeNull();
      const softAudits = await db
        .select()
        .from(forumModerationAudit)
        .where(eq(forumModerationAudit.targetId, softDeletedPostId));
      expect(softAudits).toHaveLength(0);

      // Check moderated row: moderatedAt is set, 1 audit row with reason and author
      const [modRow] = await db.select().from(forumPost).where(eq(forumPost.id, moderatedPostId));
      expect(modRow.moderatedAt).not.toBeNull();
      const modAudits = await db
        .select()
        .from(forumModerationAudit)
        .where(eq(forumModerationAudit.targetId, moderatedPostId));
      expect(modAudits).toHaveLength(1);
      expect(modAudits[0].reason).toBe("Prohibited advertising");
    });
  });

  describe("Access Control Matrix (Non-administrators cannot moderate)", () => {
    let targetPostId: string;
    let targetReplyId: string;

    beforeAll(async () => {
      targetPostId = await seedPost(authorId, bizId, "Access Control Post Target");
      targetReplyId = await seedReply(authorId, targetPostId, "Access Control Reply Target");
    });

    it("rejects anonymous callers with 401 unauthorized", async () => {
      const postRes = await testApp.request(`/api/forum/posts/${targetPostId}/moderate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Spam" }),
      });
      expect(postRes.status).toBe(401);

      const replyRes = await testApp.request(`/api/forum/replies/${targetReplyId}/moderate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Spam" }),
      });
      expect(replyRes.status).toBe(401);
    });

    it("rejects regular verified users with 403 forbidden", async () => {
      const postRes = await testApp.request(`/api/forum/posts/${targetPostId}/moderate`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: otherUserCookie },
        body: JSON.stringify({ reason: "Spam" }),
      });
      expect(postRes.status).toBe(403);
      const err = errorEnvelopeSchema.parse(await postRes.json());
      expect(err.error.code).toBe("forbidden");
    });

    it("rejects the post author with 403 forbidden", async () => {
      const postRes = await testApp.request(`/api/forum/posts/${targetPostId}/moderate`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: authorCookie },
        body: JSON.stringify({ reason: "Spam" }),
      });
      expect(postRes.status).toBe(403);
    });

    it("rejects the Business owner of the business the post concerns with 403 forbidden", async () => {
      const postRes = await testApp.request(`/api/forum/posts/${targetPostId}/moderate`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: ownerCookie },
        body: JSON.stringify({ reason: "Spam" }),
      });
      expect(postRes.status).toBe(403);
    });
  });

  describe("Public Read Filtering and Direct URL Unreachability", () => {
    let modPostId: string;

    beforeAll(async () => {
      modPostId = await seedPost(authorId, bizId, "Post To Hide Publicly");
      await seedReply(authorId, modPostId, "Reply To Hide Publicly");
      await seedReply(otherUserId, modPostId, "Another Reply");

      // Moderate post
      await testApp.request(`/api/forum/posts/${modPostId}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ reason: "Moderated post" }),
      });
    });

    it("excludes moderated posts from the public feed", async () => {
      const res = await testApp.request("/api/forum/posts");
      expect(res.status).toBe(200);
      const feed = forumFeedResponseSchema.parse(await res.json());
      expect(feed.items.map(p => p.id)).not.toContain(modPostId);
    });

    it("answers 404 on direct public GET /api/forum/posts/:id", async () => {
      const res = await testApp.request(`/api/forum/posts/${modPostId}`);
      expect(res.status).toBe(404);
      const err = errorEnvelopeSchema.parse(await res.json());
      expect(err.error.code).toBe("not_found");
    });

    it("answers 404 on direct public GET /api/forum/posts/:id/replies", async () => {
      const res = await testApp.request(`/api/forum/posts/${modPostId}/replies`);
      expect(res.status).toBe(404);
    });

    it("answers 404 when attempting to create a reply to a moderated post", async () => {
      const res = await testApp.request(`/api/forum/posts/${modPostId}/replies`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: otherUserCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ body: "Should fail" }),
      });
      expect(res.status).toBe(404);
    });

    it("blocks author from editing or deleting a moderated post with 404", async () => {
      const editRes = await testApp.request(`/api/forum/posts/${modPostId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie: authorCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ title: "New Title" }),
      });
      expect(editRes.status).toBe(404);

      const delRes = await testApp.request(`/api/forum/posts/${modPostId}`, {
        method: "DELETE",
        headers: { cookie: authorCookie },
      });
      expect(delRes.status).toBe(404);
    });

    it("excludes moderated reply from public replies list inside an active post", async () => {
      const activePostId = await seedPost(authorId, bizId, "Active Post Host");
      const badReplyId = await seedReply(authorId, activePostId, "Abusive reply to moderate");
      const goodReplyId = await seedReply(otherUserId, activePostId, "Good reply");

      // Moderate bad reply
      await testApp.request(`/api/forum/replies/${badReplyId}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ reason: "Inappropriate language" }),
      });

      const res = await testApp.request(`/api/forum/posts/${activePostId}/replies`);
      expect(res.status).toBe(200);
      const body = forumRepliesResponseSchema.parse(await res.json());
      const replyIds = body.items.map(r => r.id);
      expect(replyIds).toContain(goodReplyId);
      expect(replyIds).not.toContain(badReplyId);

      // Public post detail reply count excludes moderated reply
      const detailRes = await testApp.request(`/api/forum/posts/${activePostId}`);
      expect(detailRes.status).toBe(200);
      const postDetail = forumPostItemSchema.parse(await detailRes.json());
      expect(postDetail.replyCount).toBe(1);
    });
  });

  describe("Administrator Visibility with includeDeleted & Audit History", () => {
    let modPostId: string;
    let modReplyId: string;

    beforeAll(async () => {
      modPostId = await seedPost(authorId, bizId, "Admin Audit Post");
      modReplyId = await seedReply(authorId, modPostId, "Admin Audit Reply");

      await testApp.request(`/api/forum/posts/${modPostId}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ reason: "Post audit reason test" }),
      });

      await testApp.request(`/api/forum/replies/${modReplyId}/moderate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: adminCookie,
          origin: "http://localhost:4000",
        },
        body: JSON.stringify({ reason: "Reply audit reason test" }),
      });
    });

    it("allows administrators to read moderated posts via includeDeleted=true", async () => {
      const res = await testApp.request("/api/forum/posts?includeDeleted=true", {
        headers: { cookie: adminCookie },
      });
      expect(res.status).toBe(200);
      const feed = forumFeedResponseSchema.parse(await res.json());
      const item = feed.items.find(p => p.id === modPostId);
      expect(item).toBeDefined();
      expect(item?.moderatedAt).not.toBeNull();
    });

    it("serves moderated post detail to administrators via includeDeleted=true", async () => {
      const res = await testApp.request(`/api/forum/posts/${modPostId}?includeDeleted=true`, {
        headers: { cookie: adminCookie },
      });
      expect(res.status).toBe(200);
      const post = forumPostItemSchema.parse(await res.json());
      expect(post.moderatedAt).not.toBeNull();
    });

    it("serves post moderation audit history via GET /api/forum/posts/:id/audit", async () => {
      const res = await testApp.request(`/api/forum/posts/${modPostId}/audit`, {
        headers: { cookie: adminCookie },
      });
      expect(res.status).toBe(200);
      const body = forumModerationAuditsResponseSchema.parse(await res.json());
      expect(body.items).toHaveLength(1);
      expect(body.items[0].targetType).toBe("post");
      expect(body.items[0].targetId).toBe(modPostId);
      expect(body.items[0].actorId).toBe(adminId);
      expect(body.items[0].reason).toBe("Post audit reason test");
      expect(body.items[0].originalTitle).toBe("Admin Audit Post");
      expect(body.items[0].originalAuthorId).toBe(authorId);
      expect(body.items[0].actorDisplayName).toBe("Mod Admin");
    });

    it("serves reply moderation audit history via GET /api/forum/replies/:id/audit", async () => {
      const res = await testApp.request(`/api/forum/replies/${modReplyId}/audit`, {
        headers: { cookie: adminCookie },
      });
      expect(res.status).toBe(200);
      const body = forumModerationAuditsResponseSchema.parse(await res.json());
      expect(body.items).toHaveLength(1);
      expect(body.items[0].targetType).toBe("reply");
      expect(body.items[0].targetId).toBe(modReplyId);
      expect(body.items[0].actorId).toBe(adminId);
      expect(body.items[0].reason).toBe("Reply audit reason test");
      expect(body.items[0].originalTitle).toBeNull();
      expect(body.items[0].originalBody).toBe("Admin Audit Reply");
      expect(body.items[0].originalAuthorId).toBe(authorId);
    });

    it("rejects non-administrators from audit endpoints with 403", async () => {
      const postAuditRes = await testApp.request(`/api/forum/posts/${modPostId}/audit`, {
        headers: { cookie: authorCookie },
      });
      expect(postAuditRes.status).toBe(403);

      const replyAuditRes = await testApp.request(`/api/forum/replies/${modReplyId}/audit`, {
        headers: { cookie: authorCookie },
      });
      expect(replyAuditRes.status).toBe(403);
    });
  });
});
