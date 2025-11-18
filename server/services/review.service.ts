import checkDbResult from 'utils/check-db-result';
import { Review, UpdateReviewData } from '../../shared/types/review.types';
import db from '../database/db'
import { businessReviews, user } from '../database/schema';
import { eq, getTableColumns } from 'drizzle-orm';

class ReviewService {
    
    /**
     * Creates a new review for a business.
     *
     * @param {Omit<Review, 'id' | 'createdAt'>} review - The review object.
     * @returns {Promise<void>} Resolves on success.
     * @throws {Error} Throws an error if the database insertion fails.
     */
    public static async newReview (review: Omit<Review, 'id' | 'createdAt'>): Promise<void | Error>{
        
        const rawResult = await db.insert(businessReviews).values({
            email: review.email,
            uen: review.uen,
            rating: review.rating,
            body: review.body,
            likeCount: review.likeCount,

        } as typeof businessReviews.$inferInsert)

        if (!checkDbResult(rawResult)) {
            throw new Error('Failed to create new review')
        }
    }

    /**
     * Retrieves all reviews for a specific business, joined with author's user data.
     *
     * Fetches all reviews matching the UEN and performs a left join
     * with the `user` table (on email) to include the `userName`
     * and `userImage` for each review.
     *
     * @param {string} uen - The Unique Entity Number (UEN) of the business.
     * @returns {Promise<Review[]>} A promise that resolves to an array of review objects, each augmented with `userName` and `userImage`.
     */
    public static async getBusinessReviews(uen: string):Promise<Review[]> {
    
        const reviewsWithUserData = await db.select({
            ...getTableColumns(businessReviews), 
            userName: user.name,               
            userImage: user.imageUrl              
        })
        .from(businessReviews)
        .leftJoin(user, eq(businessReviews.email, user.email))
        .where(eq(businessReviews.uen, uen));

        return reviewsWithUserData;
    }
    
    /**
     * Updates an existing review's rating and body.
     *
     * @param {number} id - The ID of the review to update.
     * @param {UpdateReviewData} updatedReview - The updated review data.
     * @returns {Promise<void>} Resolves on success.
     * @throws {Error} Throws an error if the database update fails.
     */
    public static async updateReview(id:number, updatedReview:UpdateReviewData):Promise<void | Error> {
        const rawResult = await db.update(businessReviews).set(updatedReview).where(eq(businessReviews.id, id))
        if (!checkDbResult(rawResult)) {
            throw new Error('Failed to update review')
        }
    }    
    
    /**
     * Deletes a review by its ID.
     *
     * @param {number} id - The ID of the review to delete.
     * @returns {Promise<void>} Resolves on success.
     * @throws {Error} Throws an error if the database deletion fails.
     */
    public static async deleteReview(id:number):Promise<void | Error> {
        const rawResult = await db.delete(businessReviews).where(eq(businessReviews.id, id))
        if (!checkDbResult(rawResult)) {
            throw new Error('Failed to update review')
        }
    }    
    
    /**
     * Updates the like count for a specific review.
     *
     * Increments the like count by one if `clicked` is true, or decrements
     * (to a minimum of 0) [cite_start]if `clicked` is false
     *
     * @param {number} reviewId - The unique identifier of the review to update
     * @param {boolean} clicked - `true` to increment likes, `false` to decrement
     * @returns {Promise<Object>} A promise that resolves to the updated review object with the new like count
     * @throws {Error} Throws an error if the review is not found or the database update fails
     */
    public static async updateReviewLikes(reviewId: number, clicked: boolean = false): Promise<Object> {
        const [review] = await db.select().from(businessReviews).where(eq(businessReviews.id, reviewId))

        if (!review) {
            throw new Error(`Reply with ID ${reviewId} not found.`)
        }

        const newLikeCount = clicked
            ? (review.likeCount ?? 0) + 1
            : Math.max((review.likeCount ?? 0) - 1, 0);

        const rawResult = await db.update(businessReviews)
            .set({ likeCount: newLikeCount })
            .where(eq(businessReviews.id, reviewId));

        if (!checkDbResult(rawResult)) {
            throw new Error('Failed to update review likes')
        }
        
        return { 
            ...review, 
            likeCount: newLikeCount,
        }
    }
}

export default ReviewService