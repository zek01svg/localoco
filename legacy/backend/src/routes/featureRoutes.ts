import { Router } from "express";
import FeatureController from "../controllers/featureController.js";

const featureRouter = Router()

// ---------------------------------------------------- ROUTES FOR THE BUSINESS REVIEWS FEATURE ------------------------------------------
// this route fetches all the reviews for a business
featureRouter.get('/api/reviews', FeatureController.getBusinessReviews.bind(FeatureController))

// this route handles submissions for user reviews for businesses
featureRouter.post('/api/submit-review', FeatureController.newReview.bind(FeatureController))

// this route handles submissions for updated user reviews for businesses
featureRouter.post('/api/update-review', FeatureController.updateReview.bind(FeatureController))

// this route handles deletion of user reviews
featureRouter.post('/api/delete-review', FeatureController.deleteReview.bind(FeatureController))

// this route updates the likes for reviews
featureRouter.post('/api/like-review', FeatureController.updateReviewLikes.bind(FeatureController))


// ---------------------------------------------------- ROUTES FOR THE FORUM FEATURE ----------------------------------------------------
// this route fetches all the posts for the forum page
featureRouter.get('/api/forum-posts', FeatureController.getAllForumPosts.bind(FeatureController))
featureRouter.get('/api/forum-posts/business', FeatureController.getForumPostsByBusinessUEN.bind(FeatureController))
featureRouter.post('/api/forum-posts', FeatureController.createForumPost.bind(FeatureController))
featureRouter.post('/api/forum-replies', FeatureController.createForumReply.bind(FeatureController))
featureRouter.put('/api/forum-posts/likes', FeatureController.updatePostLikes.bind(FeatureController))
featureRouter.put('/api/forum-replies/likes', FeatureController.updateReplyLikes.bind(FeatureController))

// this route handles submissions for forum posts
featureRouter.post('/api/submit-post', FeatureController.newForumPost.bind(FeatureController))

// this route handles submissions for replies to forum posts
featureRouter.post('/api/submit-post-reply', FeatureController.newForumPostReply.bind(FeatureController))

// this route updates the likes for forum posts 
featureRouter.post('/api/like-forum-post', FeatureController.updatePostLikes.bind(FeatureController))

// this route updates the likes for forum replies
featureRouter.post('/api/like-forum-reply', FeatureController.updateReplyLikes.bind(FeatureController))


// ---------------------------------------------------- ROUTES FOR THE ANNOUNCEMENT FEATURE -----------------------------------------------
// this route fetches all the announcements for the newsletter
featureRouter.get('/api/newsletter', FeatureController.getAllAnnouncements.bind(FeatureController))

// this route fetches all the announcements for a business
featureRouter.post('/api/announcements', FeatureController.getAnnouncementsByUEN.bind(FeatureController))

// this route handles submissions for announcements
featureRouter.post('/api/new-announcement', FeatureController.newAnnouncement.bind(FeatureController))

// this route handles submissions to update announcements
featureRouter.post('/api/update-announcement', FeatureController.updateAnnouncement.bind(FeatureController))

// this route handles deletions for announcements
featureRouter.post('/api/delete-announcement', FeatureController.deleteAnnouncement.bind(FeatureController))

// ---------------------------------------------------- ROUTES FOR THE BOOKMARKS FEATURE ------------------------------------------

// this route gets all the bookmarked businesses of a user
featureRouter.post('/api/user/bookmarks', FeatureController.getUserBookmarks.bind(FeatureController))

// this route handles a bookmark button click
featureRouter.post('/api/update-bookmark', FeatureController.updateBookmarks.bind(FeatureController))

export default featureRouter