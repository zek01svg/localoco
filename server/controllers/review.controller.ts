import { deleteReviewSchema, getBusinessReviewsSchema, newReviewSchema, updateReviewLikesSchema, updateReviewSchema } from "../../shared/zod-schemas/review.schema";
import ReviewModel from "../services/review.service";
import { Context } from "hono";

class ReviewController {

    /**
     * Creates a new review for a business and returns points earned.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with a success message and points earned.
     */
    static async newReview (c: Context): Promise<Response> {

        const payload = c.req.json()
        const validationResult = newReviewSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }
        
        const review = validationResult.data

        await ReviewModel.newReview(review);
        return c.json({
            message: "Review added successfully",
            pointsEarned: 5
        }, 201);
    }
    
    /**
     * Retrieves all reviews for a specific business UEN.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the UEN parameter fails validation.
     * @returns {Promise<Response>} A JSON response containing an array of reviews.
     */
    static async getBusinessReviews(c: Context): Promise<Response> {

        const payload = c.req.param('uen')
        const validationResult = getBusinessReviewsSchema.safeParse({uen: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }
        const uen = validationResult.data.uen

        const reviews = await ReviewModel.getBusinessReviews(uen);
        return c.json(reviews, 200)
    }

    /**
     * Updates an existing review.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with a success message.
     */
    static async updateReview(c: Context): Promise<Response> {

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
        return c.json({
            message: 'Review updated successfully'
        }, 200)
    }

    /**
     * Deletes a review by its ID.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with a success message.
     */
    static async deleteReview (c: Context): Promise<Response> {

        const payload = c.req.json()
        const validationResult = deleteReviewSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const id = validationResult.data.id

        await ReviewModel.deleteReview(id);
        return c.json({ 
            message: "Review deleted successfully" 
        }, 200);
    
    }

    /**
     * Updates the like count for a review.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with the updated review and a success message.
     */
    static async updateReviewLikes(c: Context): Promise<Response> {

        const payload = c.req.json()
        const validationResult = updateReviewLikesSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }
        
        const reviewId = validationResult.data.reviewId
        const clicked = validationResult.data.clicked;
        
        const updatedReview = await ReviewModel.updateReviewLikes(reviewId, clicked);
        return c.json({
            updatedReview: updatedReview,
            message: "Review likes updated successfully",
        }, 200);
        
    }
}

export default ReviewController