import type { AuthContext } from "#server/lib/auth-middleware";
import type {
  CreateReview,
  ReviewItem,
  ReviewsQuery,
  ReviewsResponse,
  UpdateReview,
} from "#shared/contracts/reviews";

import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import postgres from "postgres";

import { user } from "#server/database/auth";
import { business } from "#server/database/business";
import { listing } from "#server/database/listing";
import { review } from "#server/database/reviews";
import { requireVerified } from "#server/lib/auth-middleware";
import { db } from "#server/lib/db";
import { HttpError, onValidationError } from "#server/lib/errors";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  createReviewSchema,
  reviewItemSchema,
  reviewsQuerySchema,
  reviewsResponseSchema,
  updateReviewSchema,
} from "#shared/contracts/reviews";

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
    description: "Action forbidden (e.g. unverified user, self-review, or not author)",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  409: {
    description: "Conflict (e.g. user already reviewed this business)",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
};

const getPostgresError = (cause: unknown): postgres.PostgresError | undefined => {
  if (cause instanceof postgres.PostgresError) return cause;
  if (cause instanceof Error && cause.cause instanceof postgres.PostgresError) return cause.cause;
  return undefined;
};

const isReviewUniqueViolation = (cause: unknown): boolean => {
  const pgErr = getPostgresError(cause);
  return (
    pgErr !== undefined &&
    pgErr.code === "23505" &&
    (pgErr.constraint_name === "review_user_business_unique" ||
      Boolean(pgErr.constraint_name?.includes("review_user_business")))
  );
};

const isReviewCheckViolation = (cause: unknown): boolean => {
  const pgErr = getPostgresError(cause);
  return (
    pgErr !== undefined &&
    pgErr.code === "23514" &&
    (pgErr.constraint_name === "review_rating_range_check" ||
      Boolean(pgErr.constraint_name?.includes("review_rating")))
  );
};

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}_${id}`).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const str = Buffer.from(cursor, "base64url").toString("utf8");
    const idx = str.indexOf("_");
    if (idx === -1) return null;
    const iso = str.slice(0, idx);
    const id = str.slice(idx + 1);
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()) || !id) return null;
    return { createdAt: date, id };
  } catch {
    return null;
  }
}

function buildCursorCondition(decoded: { createdAt: Date; id: string }) {
  return or(
    lt(review.createdAt, decoded.createdAt),
    and(eq(review.createdAt, decoded.createdAt), lt(review.id, decoded.id))
  );
}

async function getAuthorProfile(userId: string) {
  const userRows = await db
    .select({ id: user.id, displayName: user.name, avatarUrl: user.image })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return userRows.length > 0 ? userRows[0] : { id: userId, displayName: "User", avatarUrl: null };
}

async function insertReview(
  businessId: string,
  body: CreateReview,
  userId: string
): Promise<ReviewItem> {
  const bizRows = await db
    .select({ id: business.id, ownerId: business.ownerId })
    .from(business)
    .where(eq(business.id, businessId))
    .limit(1);

  if (bizRows.length === 0) {
    throw new HttpError(404, "not_found", "Business not found");
  }

  if (bizRows[0].ownerId === userId) {
    throw new HttpError(403, "forbidden", "Business owners cannot review their own business");
  }

  const now = new Date();
  const reviewId = crypto.randomUUID();

  try {
    await db.insert(review).values({
      id: reviewId,
      businessId,
      userId,
      rating: body.rating,
      content: body.content,
      createdAt: now,
      updatedAt: now,
    });
  } catch (err: unknown) {
    if (isReviewUniqueViolation(err)) {
      throw new HttpError(409, "conflict", "You have already reviewed this business", undefined, {
        cause: err,
      });
    }
    if (isReviewCheckViolation(err)) {
      throw new HttpError(400, "invalid_request", "Rating must be between 1 and 5", undefined, {
        cause: err,
      });
    }
    throw err;
  }

  const author = await getAuthorProfile(userId);
  return {
    id: reviewId,
    businessId,
    userId,
    rating: body.rating,
    content: body.content,
    author,
    createdAt: now,
    updatedAt: now,
  };
}

async function fetchBusinessReviews(
  businessId: string,
  query: ReviewsQuery
): Promise<ReviewsResponse> {
  const bizRows = await db
    .select({ id: business.id })
    .from(business)
    .where(eq(business.id, businessId))
    .limit(1);

  if (bizRows.length === 0) {
    throw new HttpError(404, "not_found", "Business not found");
  }

  const [statsRow] = await db
    .select({
      totalCount: sql<number>`count(*)::int`,
      averageRating: sql<number | null>`round(avg(${review.rating})::numeric, 1)::float`,
    })
    .from(review)
    .where(eq(review.businessId, businessId));

  const conditions = [eq(review.businessId, businessId)];
  if (query.cursor) {
    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      const cursorCondition = buildCursorCondition(decoded);
      if (cursorCondition) conditions.push(cursorCondition);
    }
  }

  const rows = await db
    .select({
      id: review.id,
      businessId: review.businessId,
      userId: review.userId,
      rating: review.rating,
      content: review.content,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      authorId: user.id,
      authorDisplayName: user.name,
      authorAvatarUrl: user.image,
    })
    .from(review)
    .innerJoin(user, eq(review.userId, user.id))
    .where(and(...conditions))
    .orderBy(desc(review.createdAt), desc(review.id))
    .limit(query.limit + 1);

  const hasMore = rows.length > query.limit;
  const items = (hasMore ? rows.slice(0, query.limit) : rows).map(r => ({
    id: r.id,
    businessId: r.businessId,
    userId: r.userId,
    rating: r.rating,
    content: r.content,
    author: {
      id: r.authorId,
      displayName: r.authorDisplayName,
      avatarUrl: r.authorAvatarUrl,
    },
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  const lastItem = items.length > 0 ? items.at(-1) : null;
  const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

  return {
    items,
    nextCursor,
    aggregate: {
      averageRating: statsRow.averageRating,
      totalCount: statsRow.totalCount,
    },
  };
}

async function modifyReview(id: string, body: UpdateReview, userId: string): Promise<ReviewItem> {
  const reviewRows = await db.select().from(review).where(eq(review.id, id)).limit(1);
  if (reviewRows.length === 0) {
    throw new HttpError(404, "not_found", "Review not found");
  }

  const existing = reviewRows[0];
  if (existing.userId !== userId) {
    throw new HttpError(403, "forbidden", "Only the author can edit this review");
  }

  const now = new Date();
  const updateData: { rating?: number; content?: string; updatedAt: Date } = {
    updatedAt: now,
  };
  if (body.rating !== undefined) updateData.rating = body.rating;
  if (body.content !== undefined) updateData.content = body.content;

  try {
    await db.update(review).set(updateData).where(eq(review.id, id));
  } catch (err: unknown) {
    if (isReviewCheckViolation(err)) {
      throw new HttpError(400, "invalid_request", "Rating must be between 1 and 5", undefined, {
        cause: err,
      });
    }
    throw err;
  }

  const author = await getAuthorProfile(userId);
  return {
    id: existing.id,
    businessId: existing.businessId,
    userId: existing.userId,
    rating: body.rating ?? existing.rating,
    content: body.content ?? existing.content,
    author,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
}

async function removeReview(id: string, actor: AuthContext): Promise<void> {
  const reviewRows = await db.select().from(review).where(eq(review.id, id)).limit(1);
  if (reviewRows.length === 0) {
    throw new HttpError(404, "not_found", "Review not found");
  }

  const existing = reviewRows[0];
  if (existing.userId !== actor.userId && !actor.isAdmin) {
    throw new HttpError(
      403,
      "forbidden",
      "Only the author or an administrator can delete this review"
    );
  }

  await db.delete(review).where(eq(review.id, id));
}

async function fetchUserReviews(
  targetUserId: string,
  query: ReviewsQuery
): Promise<ReviewsResponse> {
  const targetUserRows = await db
    .select({ id: user.id, displayName: user.name, avatarUrl: user.image })
    .from(user)
    .where(eq(user.id, targetUserId))
    .limit(1);

  if (targetUserRows.length === 0) {
    throw new HttpError(404, "not_found", "User not found");
  }

  const conditions = [eq(review.userId, targetUserId)];
  if (query.cursor) {
    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      const cursorCondition = buildCursorCondition(decoded);
      if (cursorCondition) conditions.push(cursorCondition);
    }
  }

  const rows = await db
    .select({
      id: review.id,
      businessId: review.businessId,
      userId: review.userId,
      rating: review.rating,
      content: review.content,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      businessName: listing.name,
      businessCategory: listing.category,
    })
    .from(review)
    .leftJoin(listing, eq(review.businessId, listing.businessId))
    .where(and(...conditions))
    .orderBy(desc(review.createdAt), desc(review.id))
    .limit(query.limit + 1);

  const hasMore = rows.length > query.limit;
  const items = (hasMore ? rows.slice(0, query.limit) : rows).map(r => ({
    id: r.id,
    businessId: r.businessId,
    userId: r.userId,
    rating: r.rating,
    content: r.content,
    author: targetUserRows[0],
    business: {
      id: r.businessId,
      name: r.businessName ?? "Business",
      category: r.businessCategory ?? undefined,
    },
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  const lastItem = items.length > 0 ? items.at(-1) : null;
  const nextCursor = hasMore && lastItem ? encodeCursor(lastItem.createdAt, lastItem.id) : null;

  return {
    items,
    nextCursor,
  };
}

export const reviewsRoutes = new Hono()
  .post(
    "/businesses/:id/reviews",
    requireVerified,
    describeRoute({
      operationId: "createBusinessReview",
      tags: ["reviews"],
      summary: "Create a review for a Business",
      description:
        "Publishes one Review of a Business with an integer Rating (1-5) and content. Requires a verified User. Business owners cannot review their own Business. One review per user and business.",
      responses: {
        201: {
          description: "The created Review",
          content: { "application/json": { schema: resolver(reviewItemSchema) } },
        },
        ...authenticatedErrorResponses,
      },
    }),
    validator("json", createReviewSchema, onValidationError),
    async c => {
      const { id: businessId } = c.req.param();
      const body = c.req.valid("json");
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }
      const result = await insertReview(businessId, body, actor.userId);
      return c.json(result, 201);
    }
  )
  .get(
    "/businesses/:id/reviews",
    describeRoute({
      operationId: "getBusinessReviews",
      tags: ["reviews"],
      summary: "Get reviews and aggregate rating for a Business",
      description:
        "Public endpoint returning cursor-paginated reviews for a Business along with derived aggregate Rating and total count.",
      responses: {
        200: {
          description: "List of reviews and aggregate rating",
          content: { "application/json": { schema: resolver(reviewsResponseSchema) } },
        },
        ...publicErrorResponses,
      },
    }),
    validator("query", reviewsQuerySchema, onValidationError),
    async c => {
      const { id: businessId } = c.req.param();
      const query = c.req.valid("query");
      const result = await fetchBusinessReviews(businessId, query);
      return c.json(result);
    }
  )
  .patch(
    "/reviews/:id",
    requireVerified,
    describeRoute({
      operationId: "updateReview",
      tags: ["reviews"],
      summary: "Edit an existing review",
      description:
        "Updates a review's rating and/or content. Only the author of the review can edit it.",
      responses: {
        200: {
          description: "The updated review",
          content: { "application/json": { schema: resolver(reviewItemSchema) } },
        },
        ...authenticatedErrorResponses,
      },
    }),
    validator("json", updateReviewSchema, onValidationError),
    async c => {
      const { id } = c.req.param();
      const body = c.req.valid("json");
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }
      const result = await modifyReview(id, body, actor.userId);
      return c.json(result);
    }
  )
  .delete(
    "/reviews/:id",
    requireVerified,
    describeRoute({
      operationId: "deleteReview",
      tags: ["reviews"],
      summary: "Delete a review",
      description: "Deletes a review. Allowed only for the author or a platform administrator.",
      responses: {
        204: {
          description: "Review deleted successfully",
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
      await removeReview(id, actor);
      return c.body(null, 204);
    }
  )
  .get(
    "/users/:id/reviews",
    describeRoute({
      operationId: "getUserReviews",
      tags: ["reviews"],
      summary: "Get public reviews written by a User",
      description: "Public endpoint returning cursor-paginated reviews contributed by a User.",
      responses: {
        200: {
          description: "List of user's reviews",
          content: { "application/json": { schema: resolver(reviewsResponseSchema) } },
        },
        ...publicErrorResponses,
      },
    }),
    validator("query", reviewsQuerySchema, onValidationError),
    async c => {
      const { id: targetUserId } = c.req.param();
      const query = c.req.valid("query");
      const result = await fetchUserReviews(targetUserId, query);
      return c.json(result);
    }
  );
