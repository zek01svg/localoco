import { deleteReviewSchema, getBusinessReviewsSchema, newReviewSchema, updateReviewLikesSchema, updateReviewSchema } from "../../shared/zod-schemas/review.schema";
import ReviewModel from "../services/review.service";
import { Context } from "hono";

class ReviewController {

    static async newReview (c: Context): Promise<void> {

        const payload = c.req.json()
        const validationResult = newReviewSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }
        
        const review = validationResult.data

        await ReviewModel.newReview(review);
        c.json({
            message: "Review added successfully",
            pointsEarned: 5
        }, 201);
        
    }
    
    static async getBusinessReviews(c: Context): Promise<void> {

        const payload = c.req.param('uen')
        const validationResult = getBusinessReviewsSchema.safeParse({uen: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }
        const uen = validationResult.data.uen

        const reviews = await ReviewModel.getBusinessReviews(uen);
        c.json(reviews, 200)
    }

    static async updateReview(c: Context): Promise<void> {

        const payload = c.req.json()
        const validationResult = updateReviewSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const id = validationResult.data.id
        const UpdateReviewData = {
            rating: validationResult.data.rating,
            body: validationResult.data.body
        }

        await ReviewModel.updateReview(id, UpdateReviewData);
        c.json({
            message: 'Review updated successfully'
        }, 200)
    }

    static async deleteReview (c: Context): Promise<void> {

        const payload = c.req.json()
        const validationResult = deleteReviewSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const id = validationResult.data.id

        await ReviewModel.deleteReview(id);
        c.json({ 
            message: "Review deleted successfully" 
        }, 200);
    
    }

    static async updateReviewLikes(c: Context): Promise<void> {

        const payload = c.req.json()
        const validationResult = updateReviewLikesSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }
        
        const reviewId = validationResult.data.reviewId
        const clicked = validationResult.data.clicked;
        
        const updatedReview = await ReviewModel.updateReviewLikes(reviewId, clicked);
        c.json({
            updatedReview: updatedReview,
            message: "Review likes updated successfully",
        }, 200);
        
    }
}

export default ReviewController