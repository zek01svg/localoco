import type {
  CreateForumPost,
  CreateForumReply,
  ForumPostItem,
  ForumQuery,
  ForumRepliesResponse,
  ForumReplyItem,
  UpdateForumPost,
  UpdateForumReply,
} from "#shared/contracts/forum";
import type { SQL } from "drizzle-orm";
import type { Context } from "hono";

import { and, asc, desc, eq, gt, lt, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";

import { user } from "#server/database/auth";
import { business } from "#server/database/business";
import {
  forumPost,
  forumReply,
  publiclyVisiblePost,
  publiclyVisibleReply,
} from "#server/database/forum";
import { listing } from "#server/database/listing";
import { requireVerified, resolveAuth } from "#server/lib/auth-middleware";
import { db } from "#server/lib/db";
import { HttpError, onValidationError } from "#server/lib/errors";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  createForumPostSchema,
  createForumReplySchema,
  forumFeedResponseSchema,
  forumPostItemSchema,
  forumQuerySchema,
  forumRepliesResponseSchema,
  forumReplyItemSchema,
  updateForumPostSchema,
  updateForumReplySchema,
} from "#shared/contracts/forum";

const publicErrorResponses = {
  400: {
    description: "Request parameters failed validation",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  404: {
    description: "Resource not found",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  429: {
    description: "Too many requests",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  503: {
    description: "Database is temporarily unavailable",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
};

const authenticatedErrorResponses = {
  ...publicErrorResponses,
  401: {
    description: "Authentication required",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  403: {
    description:
      "Action forbidden (e.g. unverified user, not the author, or includeDeleted without the administrator role)",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
};

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}_${id}`).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const str = Buffer.from(cursor, "base64url").toString("utf8");
    const idx = str.indexOf("_");
    if (idx === -1) throw new Error("Malformed cursor");
    const iso = str.slice(0, idx);
    const id = str.slice(idx + 1);
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()) || !id) throw new Error("Malformed cursor");
    return { createdAt: date, id };
  } catch {
    throw new HttpError(400, "invalid_request", "Invalid pagination cursor");
  }
}

// Feed pagination walks newest-first.
function postCursorCondition(decoded: { createdAt: Date; id: string }) {
  return or(
    lt(forumPost.createdAt, decoded.createdAt),
    and(eq(forumPost.createdAt, decoded.createdAt), lt(forumPost.id, decoded.id))
  );
}

// Reply pagination walks oldest-first, matching the chronological reading order.
function replyCursorCondition(decoded: { createdAt: Date; id: string }) {
  return or(
    gt(forumReply.createdAt, decoded.createdAt),
    and(eq(forumReply.createdAt, decoded.createdAt), gt(forumReply.id, decoded.id))
  );
}

// Batched reply count embedded in every post read via a correlated subquery,
// so feed and detail stay single-query while counts reuse the public-visibility
// predicate — they never advertise replies a visitor could not actually see.
// Administrators reading deleted content get the true count instead, so the
// count agrees with the deleted replies their response also lists.
function buildPostRowSelect(includeDeleted: boolean) {
  return {
    id: forumPost.id,
    businessId: forumPost.businessId,
    userId: forumPost.userId,
    title: forumPost.title,
    body: forumPost.body,
    deletedAt: forumPost.deletedAt,
    createdAt: forumPost.createdAt,
    updatedAt: forumPost.updatedAt,
    replyCount: sql<number>`(select count(*)::int from ${forumReply} where ${forumReply.postId} = ${forumPost.id} and ${
      includeDeleted ? sql`true` : publiclyVisibleReply()
    })`,
    authorId: user.id,
    authorDisplayName: user.name,
    authorAvatarUrl: user.image,
    businessName: listing.name,
    businessCategory: listing.category,
  };
}

interface PostRow {
  id: string;
  businessId: string;
  userId: string;
  title: string;
  body: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  replyCount: number;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  businessName: string | null;
  businessCategory: string | null;
}

function mapPostRow(row: PostRow): ForumPostItem {
  return {
    id: row.id,
    businessId: row.businessId,
    userId: row.userId,
    title: row.title,
    body: row.body,
    author: {
      id: row.authorId,
      displayName: row.authorDisplayName,
      avatarUrl: row.authorAvatarUrl,
    },
    business: {
      id: row.businessId,
      name: row.businessName ?? "Business",
      category: row.businessCategory ?? undefined,
    },
    replyCount: row.replyCount,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function fetchPostRow(conditions: SQL[], includeDeleted = false): Promise<PostRow | null> {
  const rows = await db
    .select(buildPostRowSelect(includeDeleted))
    .from(forumPost)
    .innerJoin(user, eq(forumPost.userId, user.id))
    .leftJoin(listing, eq(forumPost.businessId, listing.businessId))
    .where(and(...conditions))
    .limit(1);
  return rows.length > 0 ? rows[0] : null;
}

async function fetchFeed(query: ForumQuery, includeDeleted: boolean) {
  const conditions: SQL[] = [];
  if (!includeDeleted) conditions.push(publiclyVisiblePost());
  if (query.cursor) {
    const cursorCondition = postCursorCondition(decodeCursor(query.cursor));
    if (cursorCondition) conditions.push(cursorCondition);
  }

  const rows = await db
    .select(buildPostRowSelect(includeDeleted))
    .from(forumPost)
    .innerJoin(user, eq(forumPost.userId, user.id))
    .leftJoin(listing, eq(forumPost.businessId, listing.businessId))
    .where(and(...conditions))
    .orderBy(desc(forumPost.createdAt), desc(forumPost.id))
    .limit(query.limit + 1);

  const hasMore = rows.length > query.limit;
  const items = (hasMore ? rows.slice(0, query.limit) : rows).map(mapPostRow);

  const lastItem = items.length > 0 ? items.at(-1) : null;
  const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

  return { items, nextCursor };
}

async function fetchPostDetail(id: string, includeDeleted: boolean): Promise<ForumPostItem> {
  const conditions: SQL[] = [eq(forumPost.id, id)];
  if (!includeDeleted) conditions.push(publiclyVisiblePost());
  const row = await fetchPostRow(conditions, includeDeleted);
  if (!row) {
    throw new HttpError(404, "not_found", "Forum post not found");
  }
  return mapPostRow(row);
}

async function fetchReplies(
  postId: string,
  query: ForumQuery,
  includeDeleted: boolean
): Promise<ForumRepliesResponse> {
  const postConditions: SQL[] = [eq(forumPost.id, postId)];
  if (!includeDeleted) postConditions.push(publiclyVisiblePost());
  const postRows = await db
    .select({ id: forumPost.id })
    .from(forumPost)
    .where(and(...postConditions))
    .limit(1);
  if (postRows.length === 0) {
    throw new HttpError(404, "not_found", "Forum post not found");
  }

  const conditions: SQL[] = [eq(forumReply.postId, postId)];
  if (!includeDeleted) conditions.push(publiclyVisibleReply());
  if (query.cursor) {
    const cursorCondition = replyCursorCondition(decodeCursor(query.cursor));
    if (cursorCondition) conditions.push(cursorCondition);
  }

  const rows = await db
    .select({
      id: forumReply.id,
      postId: forumReply.postId,
      userId: forumReply.userId,
      body: forumReply.body,
      deletedAt: forumReply.deletedAt,
      createdAt: forumReply.createdAt,
      updatedAt: forumReply.updatedAt,
      authorId: user.id,
      authorDisplayName: user.name,
      authorAvatarUrl: user.image,
    })
    .from(forumReply)
    .innerJoin(user, eq(forumReply.userId, user.id))
    .where(and(...conditions))
    .orderBy(asc(forumReply.createdAt), asc(forumReply.id))
    .limit(query.limit + 1);

  const hasMore = rows.length > query.limit;
  const items = (hasMore ? rows.slice(0, query.limit) : rows).map(r => ({
    id: r.id,
    postId: r.postId,
    userId: r.userId,
    body: r.body,
    author: {
      id: r.authorId,
      displayName: r.authorDisplayName,
      avatarUrl: r.authorAvatarUrl,
    },
    deletedAt: r.deletedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  const lastItem = items.length > 0 ? items.at(-1) : null;
  const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

  return { items, nextCursor };
}

async function insertPost(body: CreateForumPost, userId: string): Promise<ForumPostItem> {
  const bizRows = await db
    .select({ id: business.id })
    .from(business)
    .where(eq(business.id, body.businessId))
    .limit(1);
  if (bizRows.length === 0) {
    throw new HttpError(404, "not_found", "Business not found");
  }

  const now = new Date();
  const postId = crypto.randomUUID();
  await db.insert(forumPost).values({
    id: postId,
    businessId: body.businessId,
    userId,
    title: body.title,
    body: body.body,
    createdAt: now,
    updatedAt: now,
  });

  const row = await fetchPostRow([eq(forumPost.id, postId)]);
  if (!row) {
    throw new HttpError(404, "not_found", "Forum post not found");
  }
  return mapPostRow(row);
}

async function updatePost(
  id: string,
  body: UpdateForumPost,
  userId: string
): Promise<ForumPostItem> {
  const rows = await db
    .select({ id: forumPost.id, userId: forumPost.userId, deletedAt: forumPost.deletedAt })
    .from(forumPost)
    .where(eq(forumPost.id, id))
    .limit(1);
  if (rows.length === 0 || rows[0].deletedAt !== null) {
    throw new HttpError(404, "not_found", "Forum post not found");
  }
  if (rows[0].userId !== userId) {
    throw new HttpError(403, "forbidden", "Only the author can edit this forum post");
  }

  await db
    .update(forumPost)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(forumPost.id, id));

  const row = await fetchPostRow([eq(forumPost.id, id)]);
  if (!row) {
    throw new HttpError(404, "not_found", "Forum post not found");
  }
  return mapPostRow(row);
}

async function softDeletePost(id: string, userId: string): Promise<void> {
  const rows = await db
    .select({ id: forumPost.id, userId: forumPost.userId, deletedAt: forumPost.deletedAt })
    .from(forumPost)
    .where(eq(forumPost.id, id))
    .limit(1);
  if (rows.length === 0 || rows[0].deletedAt !== null) {
    throw new HttpError(404, "not_found", "Forum post not found");
  }
  if (rows[0].userId !== userId) {
    throw new HttpError(403, "forbidden", "Only the author can delete this forum post");
  }

  await db.update(forumPost).set({ deletedAt: new Date() }).where(eq(forumPost.id, id));
}

async function fetchReplyRow(replyId: string) {
  const rows = await db
    .select({
      id: forumReply.id,
      postId: forumReply.postId,
      userId: forumReply.userId,
      body: forumReply.body,
      deletedAt: forumReply.deletedAt,
      createdAt: forumReply.createdAt,
      updatedAt: forumReply.updatedAt,
      authorId: user.id,
      authorDisplayName: user.name,
      authorAvatarUrl: user.image,
    })
    .from(forumReply)
    .innerJoin(user, eq(forumReply.userId, user.id))
    .where(eq(forumReply.id, replyId))
    .limit(1);
  return rows.length > 0 ? rows[0] : null;
}

function mapReplyRow(row: {
  id: string;
  postId: string;
  userId: string;
  body: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
}): ForumReplyItem {
  return {
    id: row.id,
    postId: row.postId,
    userId: row.userId,
    body: row.body,
    author: {
      id: row.authorId,
      displayName: row.authorDisplayName,
      avatarUrl: row.authorAvatarUrl,
    },
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function insertReply(
  postId: string,
  body: CreateForumReply,
  userId: string
): Promise<ForumReplyItem> {
  const postRows = await db
    .select({ id: forumPost.id })
    .from(forumPost)
    .where(and(eq(forumPost.id, postId), publiclyVisiblePost()))
    .limit(1);
  if (postRows.length === 0) {
    throw new HttpError(404, "not_found", "Forum post not found");
  }

  const now = new Date();
  const replyId = crypto.randomUUID();
  await db.insert(forumReply).values({
    id: replyId,
    postId,
    userId,
    body: body.body,
    createdAt: now,
    updatedAt: now,
  });

  const row = await fetchReplyRow(replyId);
  if (!row) {
    throw new HttpError(404, "not_found", "Reply not found");
  }
  return mapReplyRow(row);
}

async function updateReply(
  id: string,
  body: UpdateForumReply,
  userId: string
): Promise<ForumReplyItem> {
  const rows = await db
    .select({ id: forumReply.id, userId: forumReply.userId, deletedAt: forumReply.deletedAt })
    .from(forumReply)
    .where(eq(forumReply.id, id))
    .limit(1);
  if (rows.length === 0 || rows[0].deletedAt !== null) {
    throw new HttpError(404, "not_found", "Reply not found");
  }
  if (rows[0].userId !== userId) {
    throw new HttpError(403, "forbidden", "Only the author can edit this reply");
  }

  await db
    .update(forumReply)
    .set({ body: body.body, updatedAt: new Date() })
    .where(eq(forumReply.id, id));

  const row = await fetchReplyRow(id);
  if (!row) {
    throw new HttpError(404, "not_found", "Reply not found");
  }
  return mapReplyRow(row);
}

async function softDeleteReply(id: string, userId: string): Promise<void> {
  const rows = await db
    .select({ id: forumReply.id, userId: forumReply.userId, deletedAt: forumReply.deletedAt })
    .from(forumReply)
    .where(eq(forumReply.id, id))
    .limit(1);
  if (rows.length === 0 || rows[0].deletedAt !== null) {
    throw new HttpError(404, "not_found", "Reply not found");
  }
  if (rows[0].userId !== userId) {
    throw new HttpError(403, "forbidden", "Only the author can delete this reply");
  }

  await db.update(forumReply).set({ deletedAt: new Date() }).where(eq(forumReply.id, id));
}

// includeDeleted is the administrator read path into soft-deleted content.
// Public reads never see it; anyone without the administrator role is refused.
function requireAdminForIncludeDeleted(c: Context, query: ForumQuery): boolean {
  if (query.includeDeleted) {
    const actor = c.get("auth");
    if (!actor?.emailVerified || !actor.isAdmin) {
      throw new HttpError(403, "forbidden", "Administrator role required to view deleted content");
    }
    return true;
  }
  return false;
}

const publicReadErrorResponses = {
  ...publicErrorResponses,
  403: {
    description: "includeDeleted requested without the administrator role",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
};

export const forumRoutes = new Hono()
  .get(
    "/forum/posts",
    resolveAuth,
    describeRoute({
      operationId: "getForumFeed",
      tags: ["forum"],
      summary: "Get the public Forum feed",
      description:
        "Public endpoint returning cursor-paginated Forum posts newest-first with batched reply counts. Soft-deleted posts are excluded. Administrators may pass includeDeleted=true to read soft-deleted content.",
      responses: {
        200: {
          description: "List of forum posts",
          content: { "application/json": { schema: resolver(forumFeedResponseSchema) } },
        },
        ...publicReadErrorResponses,
      },
    }),
    validator("query", forumQuerySchema, onValidationError),
    async c => {
      const query = c.req.valid("query");
      const includeDeleted = requireAdminForIncludeDeleted(c, query);
      const result = await fetchFeed(query, includeDeleted);
      return c.json(result);
    }
  )
  .post(
    "/forum/posts",
    requireVerified,
    describeRoute({
      operationId: "createForumPost",
      tags: ["forum"],
      summary: "Create a Forum post about a Business",
      description:
        "Publishes a Forum post referencing an existing Business. Requires a verified User. The Business association is required and never nullable.",
      responses: {
        201: {
          description: "The created Forum post",
          content: { "application/json": { schema: resolver(forumPostItemSchema) } },
        },
        ...authenticatedErrorResponses,
      },
    }),
    validator("json", createForumPostSchema, onValidationError),
    async c => {
      const body = c.req.valid("json");
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }
      const result = await insertPost(body, actor.userId);
      return c.json(result, 201);
    }
  )
  .get(
    "/forum/posts/:id",
    resolveAuth,
    describeRoute({
      operationId: "getForumPost",
      tags: ["forum"],
      summary: "Get a Forum post by ID",
      description:
        "Public endpoint returning a single Forum post with its Business reference and batched reply count. Soft-deleted posts answer 404 unless an administrator passes includeDeleted=true.",
      responses: {
        200: {
          description: "The Forum post",
          content: { "application/json": { schema: resolver(forumPostItemSchema) } },
        },
        ...publicReadErrorResponses,
      },
    }),
    validator("query", forumQuerySchema, onValidationError),
    async c => {
      const { id } = c.req.param();
      const query = c.req.valid("query");
      const includeDeleted = requireAdminForIncludeDeleted(c, query);
      const result = await fetchPostDetail(id, includeDeleted);
      return c.json(result);
    }
  )
  .patch(
    "/forum/posts/:id",
    requireVerified,
    describeRoute({
      operationId: "updateForumPost",
      tags: ["forum"],
      summary: "Edit a Forum post",
      description: "Updates a Forum post's title and/or body. Only the author can edit it.",
      responses: {
        200: {
          description: "The updated Forum post",
          content: { "application/json": { schema: resolver(forumPostItemSchema) } },
        },
        ...authenticatedErrorResponses,
      },
    }),
    validator("json", updateForumPostSchema, onValidationError),
    async c => {
      const { id } = c.req.param();
      const body = c.req.valid("json");
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }
      const result = await updatePost(id, body, actor.userId);
      return c.json(result);
    }
  )
  .delete(
    "/forum/posts/:id",
    requireVerified,
    describeRoute({
      operationId: "deleteForumPost",
      tags: ["forum"],
      summary: "Soft-delete a Forum post",
      description:
        "Marks a Forum post as soft-deleted. Only the author can delete it. The post stops appearing in public reads while the row remains available to administrators.",
      responses: {
        204: {
          description: "Forum post soft-deleted",
        },
        ...authenticatedErrorResponses,
      },
    }),
    async c => {
      const { id } = c.req.param();
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }
      await softDeletePost(id, actor.userId);
      return c.body(null, 204);
    }
  )
  .get(
    "/forum/posts/:id/replies",
    resolveAuth,
    describeRoute({
      operationId: "getForumReplies",
      tags: ["forum"],
      summary: "Get Replies to a Forum post",
      description:
        "Public endpoint returning cursor-paginated Replies to a Forum post in chronological order. Soft-deleted replies are excluded. Soft-deleted posts answer 404 unless an administrator passes includeDeleted=true.",
      responses: {
        200: {
          description: "List of replies",
          content: { "application/json": { schema: resolver(forumRepliesResponseSchema) } },
        },
        ...publicReadErrorResponses,
      },
    }),
    validator("query", forumQuerySchema, onValidationError),
    async c => {
      const { id } = c.req.param();
      const query = c.req.valid("query");
      const includeDeleted = requireAdminForIncludeDeleted(c, query);
      const result = await fetchReplies(id, query, includeDeleted);
      return c.json(result);
    }
  )
  .post(
    "/forum/posts/:id/replies",
    requireVerified,
    describeRoute({
      operationId: "createForumReply",
      tags: ["forum"],
      summary: "Reply to a Forum post",
      description:
        "Publishes a Reply to a Forum post. Requires a verified User. Soft-deleted posts answer 404.",
      responses: {
        201: {
          description: "The created Reply",
          content: { "application/json": { schema: resolver(forumReplyItemSchema) } },
        },
        ...authenticatedErrorResponses,
      },
    }),
    validator("json", createForumReplySchema, onValidationError),
    async c => {
      const { id } = c.req.param();
      const body = c.req.valid("json");
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }
      const result = await insertReply(id, body, actor.userId);
      return c.json(result, 201);
    }
  )
  .patch(
    "/forum/replies/:id",
    requireVerified,
    describeRoute({
      operationId: "updateForumReply",
      tags: ["forum"],
      summary: "Edit a Reply",
      description: "Updates a Reply's body. Only the author can edit it.",
      responses: {
        200: {
          description: "The updated Reply",
          content: { "application/json": { schema: resolver(forumReplyItemSchema) } },
        },
        ...authenticatedErrorResponses,
      },
    }),
    validator("json", updateForumReplySchema, onValidationError),
    async c => {
      const { id } = c.req.param();
      const body = c.req.valid("json");
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }
      const result = await updateReply(id, body, actor.userId);
      return c.json(result);
    }
  )
  .delete(
    "/forum/replies/:id",
    requireVerified,
    describeRoute({
      operationId: "deleteForumReply",
      tags: ["forum"],
      summary: "Soft-delete a Reply",
      description:
        "Marks a Reply as soft-deleted. Only the author can delete it. The reply stops appearing in public reads while the row remains available to administrators.",
      responses: {
        204: {
          description: "Reply soft-deleted",
        },
        ...authenticatedErrorResponses,
      },
    }),
    async c => {
      const { id } = c.req.param();
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }
      await softDeleteReply(id, actor.userId);
      return c.body(null, 204);
    }
  );
