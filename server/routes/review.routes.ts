import { Hono } from "hono";
import ReviewController from "controllers/review.controller";
import protectRoute from "../middleware/protect-route";
const reviewRouter = new Hono()

// this route fetches all the reviews for a business
reviewRouter.get('/:uen/reviews', ReviewController.getBusinessReviews)

// this route handles submissions for user reviews for businesses
reviewRouter.post('/submit-review', protectRoute, ReviewController.newReview)

// this route handles submissions for updated user reviews for businesses
reviewRouter.post('/update-review', protectRoute, ReviewController.updateReview)

// this route handles deletion of user reviews
reviewRouter.put('/delete-review', protectRoute, ReviewController.deleteReview)

// this route updates the likes for reviews
reviewRouter.put('/like-review', protectRoute, ReviewController.updateReviewLikes)

export default reviewRouter