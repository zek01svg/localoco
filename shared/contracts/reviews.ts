import { z } from "zod/v4";

// Rating is constrained to an integer from 1 through 5, matching the PostgreSQL
// check constraint. Unconstrained or non-integer ratings are rejected.
export const ratingSchema = z
  .number()
  .int({ message: "Rating must be an integer" })
  .min(1, { message: "Rating must be at least 1" })
  .max(5, { message: "Rating must be at most 5" });

// Review text content bounds: non-empty, max 2000 characters.
const reviewContentSchema = z
  .string()
  .trim()
  .min(1, { message: "Review content cannot be empty" })
  .max(2000, { message: "Review content cannot exceed 2000 characters" });

export const createReviewSchema = z.object({
  rating: ratingSchema,
  content: reviewContentSchema,
});
export type CreateReview = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z
  .object({
    rating: ratingSchema.optional(),
    content: reviewContentSchema.optional(),
  })
  .refine(data => data.rating !== undefined || data.content !== undefined, {
    message: "At least one field must be provided",
  });
export type UpdateReview = z.infer<typeof updateReviewSchema>;

const reviewAuthorSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().nullable(),
});

const businessReferenceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
});

export const reviewItemSchema = z.object({
  id: z.string().min(1),
  businessId: z.string().min(1),
  userId: z.string().min(1),
  rating: ratingSchema,
  content: z.string(),
  author: reviewAuthorSchema,
  business: businessReferenceSchema.optional(),
  likeCount: z.number().int().min(0).default(0),
  isLiked: z.boolean().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ReviewItem = z.infer<typeof reviewItemSchema>;

export const reviewAggregateSchema = z.object({
  averageRating: z.number().nullable(),
  totalCount: z.number().int().min(0),
});

export const reviewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).max(256).optional(),
});
export type ReviewsQuery = z.infer<typeof reviewsQuerySchema>;

export const reviewsResponseSchema = z.object({
  items: z.array(reviewItemSchema),
  nextCursor: z.string().nullable(),
  aggregate: reviewAggregateSchema.optional(),
});
export type ReviewsResponse = z.infer<typeof reviewsResponseSchema>;
