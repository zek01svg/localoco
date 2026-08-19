import { describe, expect, it } from "vitest";

import {
  createReviewSchema,
  ratingSchema,
  reviewAggregateSchema,
  reviewItemSchema,
  reviewsQuerySchema,
  updateReviewSchema,
} from "#shared/contracts/reviews";

describe("ratingSchema", () => {
  it("accepts integers from 1 through 5", () => {
    for (let r = 1; r <= 5; r++) {
      expect(ratingSchema.parse(r)).toBe(r);
    }
  });

  it("rejects ratings below 1, above 5, non-integers, and null", () => {
    expect(ratingSchema.safeParse(0).success).toBe(false);
    expect(ratingSchema.safeParse(6).success).toBe(false);
    expect(ratingSchema.safeParse(-1).success).toBe(false);
    expect(ratingSchema.safeParse(3.5).success).toBe(false);
    expect(ratingSchema.safeParse(null).success).toBe(false);
    expect(ratingSchema.safeParse("5").success).toBe(false);
  });
});

describe("createReviewSchema", () => {
  it("accepts valid rating and content", () => {
    const parsed = createReviewSchema.parse({
      rating: 5,
      content: "Great food and service!",
    });
    expect(parsed).toEqual({
      rating: 5,
      content: "Great food and service!",
    });
  });

  it("trims whitespace from content", () => {
    const parsed = createReviewSchema.parse({
      rating: 4,
      content: "   Delicious drinks!   ",
    });
    expect(parsed.content).toBe("Delicious drinks!");
  });

  it("rejects empty or whitespace-only content", () => {
    expect(createReviewSchema.safeParse({ rating: 5, content: "" }).success).toBe(false);
    expect(createReviewSchema.safeParse({ rating: 5, content: "   " }).success).toBe(false);
  });

  it("rejects content exceeding 2000 characters", () => {
    const longContent = "a".repeat(2001);
    expect(createReviewSchema.safeParse({ rating: 5, content: longContent }).success).toBe(false);
  });
});

describe("updateReviewSchema", () => {
  it("accepts updating rating only, content only, or both", () => {
    expect(updateReviewSchema.parse({ rating: 3 })).toEqual({ rating: 3 });
    expect(updateReviewSchema.parse({ content: "Updated content" })).toEqual({
      content: "Updated content",
    });
    expect(updateReviewSchema.parse({ rating: 4, content: "Updated both" })).toEqual({
      rating: 4,
      content: "Updated both",
    });
  });

  it("rejects an empty update object", () => {
    expect(updateReviewSchema.safeParse({}).success).toBe(false);
  });
});

describe("reviewsQuerySchema", () => {
  it("defaults limit to 20", () => {
    const parsed = reviewsQuerySchema.parse({});
    expect(parsed.limit).toBe(20);
  });

  it("accepts limit between 1 and 100", () => {
    expect(reviewsQuerySchema.parse({ limit: "50" }).limit).toBe(50);
    expect(reviewsQuerySchema.parse({ limit: "1" }).limit).toBe(1);
    expect(reviewsQuerySchema.parse({ limit: "100" }).limit).toBe(100);
  });

  it("rejects limit below 1 or above 100", () => {
    expect(reviewsQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(reviewsQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(reviewsQuerySchema.safeParse({ limit: "abc" }).success).toBe(false);
  });
});

describe("reviewItemSchema & reviewAggregateSchema", () => {
  it("parses dates correctly with z.coerce.date()", () => {
    const item = reviewItemSchema.parse({
      id: "rev_1",
      businessId: "biz_1",
      userId: "usr_1",
      rating: 5,
      content: "Superb!",
      author: {
        id: "usr_1",
        displayName: "Alice Tan",
        avatarUrl: null,
      },
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    });

    expect(item.createdAt).toBeInstanceOf(Date);
    expect(item.updatedAt).toBeInstanceOf(Date);
    expect(item.rating).toBe(5);
  });

  it("parses reviewAggregateSchema with null average when 0 reviews", () => {
    const aggregate = reviewAggregateSchema.parse({
      averageRating: null,
      totalCount: 0,
    });
    expect(aggregate.averageRating).toBeNull();
    expect(aggregate.totalCount).toBe(0);
  });
});
