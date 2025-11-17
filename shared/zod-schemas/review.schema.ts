import { z } from 'zod';

// for newReview
export const newReviewSchema = z.object({
    userEmail: z.string().email("Invalid email address"),
    businessUEN: z.string().min(1, "Business UEN is required"),
    title: z.string().min(1, "Review title is required"),
    body: z.string().min(1, "Review body is required"),
    rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
});

// for getBusinessReviews
export const getBusinessReviewsSchema = z.object({
    uen: z.string().min(1, "UEN is required"),
});

// for updateReview
export const updateReviewSchema = z.object({
    id: z.number().int().positive("Review ID must be a positive number"),
    rating: z.number().int().min(1).max(5),
    body: z.string().min(1, "Review body is required"),
});

// for deleteReview
export const deleteReviewSchema = z.object({
    id: z.number().int().positive("Review ID must be a positive number"),
});

// for updateReviewLikes
export const updateReviewLikesSchema = z.object({
    reviewId: z.number().int().positive("Review ID must be a positive number"),
    clicked: z.boolean(),
});