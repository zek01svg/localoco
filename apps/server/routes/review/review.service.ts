import db from "@server/database/db";
import type {
  deleteReviewSchema,
  newReviewSchema,
  updateReviewLikesSchema,
  updateReviewSchema,
} from "@server/database/schema";
import {
  businesses,
  businessReviews,
  userPoints,
} from "@server/database/schema";
import logger from "@server/lib/pino";
import redis from "@server/lib/redis";
import type { HydratedReview } from "@shared/types/review.types";
import { eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod/v4";

type NewReviewInput = z.infer<typeof newReviewSchema> & { email: string };
type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
type UpdateReviewLikesInput = z.infer<typeof updateReviewLikesSchema>;
type DeleteReviewInput = z.infer<typeof deleteReviewSchema>;

const invalidateCaches = async (uen: string) => {
  const businessResult = await db.query.businesses.findFirst({
    where: eq(businesses.uen, uen),
    columns: { ownerId: true },
  });

  const ownerId = businessResult?.ownerId;

  await redis.del(`reviews:${uen}`);
  await redis.del(`business:${uen}`);
  await redis.del("all-businesses");
  if (ownerId) {
    await redis.del(`business:owned:${ownerId}`);
  }
};

const addPoints = async (email: string, amount: number) => {
  try {
    await db
      .insert(userPoints)
      .values({ email, points: amount })
      .onConflictDoUpdate({
        target: userPoints.email,
        set: { points: sql`${userPoints.points} + ${amount}` },
      });
  } catch (err) {
    logger.error({ err, email }, "Failed to add points");
  }
};

const subtractPoints = async (email: string, amount: number) => {
  try {
    await db
      .update(userPoints)
      .set({ points: sql`GREATEST(0, ${userPoints.points} - ${amount})` })
      .where(eq(userPoints.email, email));
  } catch (err) {
    logger.error({ err, email }, "Failed to subtract points");
  }
};

export async function getReviewsByUen(uen: string): Promise<HydratedReview[]> {
  const cachedReviews = await redis.get<HydratedReview[]>(`reviews:${uen}`);
  if (cachedReviews) {
    logger.info(
      { cacheKey: `reviews:${uen}`, uen },
      "Cache hit for business reviews"
    );
    return cachedReviews;
  }

  const reviews = await db.query.businessReviews.findMany({
    where: eq(businessReviews.uen, uen),
    with: {
      user: { columns: { name: true, image: true } },
    },
  });

  const hydratedReviews: HydratedReview[] = reviews.map((r) => ({
    ...r,
    userName: r.user.name,
    userImage: r.user.image,
  }));

  await redis.set(`reviews:${uen}`, hydratedReviews, { ex: 3600 });
  return hydratedReviews;
}

export async function submitReview(review: NewReviewInput) {
  const [insertedReview] = await db
    .insert(businessReviews)
    .values(review as any)
    .returning();
  if (!insertedReview) {
    throw new HTTPException(500, { message: "Failed to create new review" });
  }

  await addPoints(review.email, 5);
  await invalidateCaches(review.uen);
}

export async function updateReview(payload: UpdateReviewInput) {
  const id = payload.id;
  const updateData = {
    rating: payload.rating,
    body: payload.body,
  };

  const current = await db.query.businessReviews.findFirst({
    where: eq(businessReviews.id, id),
    columns: { uen: true },
  });

  if (!current) {
    throw new HTTPException(404, { message: "Review not found" });
  }

  const [updated] = await db
    .update(businessReviews)
    .set(updateData)
    .where(eq(businessReviews.id, id))
    .returning();

  if (!updated) {
    throw new HTTPException(500, { message: "Failed to update review" });
  }

  await invalidateCaches(current.uen);
}

export async function deleteReview(payload: DeleteReviewInput) {
  const id = payload.id;
  const current = await db.query.businessReviews.findFirst({
    where: eq(businessReviews.id, id),
    columns: { uen: true, email: true },
  });

  if (!current) {
    throw new HTTPException(404, { message: "Review not found" });
  }

  const [deleted] = await db
    .delete(businessReviews)
    .where(eq(businessReviews.id, id))
    .returning();

  if (!deleted) {
    throw new HTTPException(500, { message: "Failed to delete review" });
  }

  await subtractPoints(current.email, 5);
  await invalidateCaches(current.uen);
}

export async function likeReview(payload: UpdateReviewLikesInput) {
  const reviewId = payload.reviewId;
  const clicked = payload.clicked;

  const review = await db.query.businessReviews.findFirst({
    where: eq(businessReviews.id, reviewId),
    with: { user: { columns: { name: true, image: true } } },
  });

  if (!review) {
    throw new HTTPException(404, { message: "Review not found" });
  }

  const newLikeCount = clicked
    ? review.likeCount + 1
    : Math.max(review.likeCount - 1, 0);

  const [updated] = await db
    .update(businessReviews)
    .set({ likeCount: newLikeCount })
    .where(eq(businessReviews.id, reviewId))
    .returning();

  if (!updated) {
    throw new HTTPException(500, { message: "Failed to update review likes" });
  }

  await invalidateCaches(review.uen);

  return {
    ...updated,
    userName: review.user.name,
    userImage: review.user.image,
  };
}
