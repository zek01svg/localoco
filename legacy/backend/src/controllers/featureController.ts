import { Request, Response, NextFunction } from "express";
import ReviewModel from "../models/ReviewModel.js";
import ForumModel from "../models/ForumModel.js";
import AnnouncementModel from "../models/AnnouncementModel.js";
import BookmarkModel from "../models/BookmarkModel.js";

class FeatureController {

    // ---------------------- CONTROLLER FUNCTIONS FOR THE BUSINESS REVIEWS FEATURE  ----------------------    
    static async getBusinessReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const reviews = await ReviewModel.getBusinessReviews(String(req.query.uen));
            res.status(200).json(reviews)
        } 
        catch (error) {
            next(error);
        }
    }

    static async newReview (req: Request, res: Response, next: NextFunction): Promise<void> {

        const review = { 
            userEmail: req.body.userEmail, 
            businessUEN: req.body.businessUEN,
            title: req.body.title,
            body: req.body.body,
            rating: req.body.rating,
            createdAt: new Date().toISOString(),
            likeCount: 0
        };

        try {
            await ReviewModel.newReview(review);
            res.status(200).json({
                message: "Review added!",
                pointsEarned: 5
            });
        } 
        catch (error) {
            console.error("❌ Error adding review:", error);
            next(error);
        }
    }

    static async updateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {

            const id = Number(req.body.id)
            const UpdateReviewData = {
                rating: Number(req.body.rating),
                body: String(req.body.body)
            }

            await ReviewModel.updateReview(id, UpdateReviewData);
            res.status(200).json({
                message: 'update successful'
            })
        } 
        catch (error) {
            console.error(`Error updating review: ${error}`);
            next(error);
        }
    }

    static async deleteReview (req: Request, res: Response, next: NextFunction): Promise<void> {

        try {

            const id = Number(req.body.id)

            await ReviewModel.deleteReview(id);
            res.status(200).json({ 
                message: "Review deleted" 
            });
        } 
        catch (error) {
            console.error(`Error deleting review: ${error}`);
            next(error);
        }
    }

    static async updateReviewLikes(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { reviewId, clicked } = req.body;
            const result = await ReviewModel.updateReviewLikes(reviewId, clicked);
            res.status(200).json(result);
        }
        catch (error) {
            console.error(`Error updating review likes: ${error}`);
            next(error);
        }
    }

    // ---------------------- CONTROLLER FUNCTIONS FOR THE FORUM FEATURE  ----------------------

    static async getAllForumPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const forumPosts = await ForumModel.getAllForumPosts();
            res.status(200).json(forumPosts)
        }
        catch (error) {
            next(error);
        }
    }

    static async getForumPostsByBusinessUEN(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const businessUen = String(req.query.uen || '').trim();

            if (!businessUen) {
                res.status(400).json({ error: 'UEN parameter is required' });
                return;
            }

            const forumPosts = await ForumModel.getForumPostsByBusinessUEN(businessUen);
            res.status(200).json(forumPosts);
        }
        catch (error) {
            next(error);
        }
    }

    static async createForumPost(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const postData = req.body;
            await ForumModel.newForumPost(postData);
            res.status(201).json({ message: 'Forum post created successfully' });
        }
        catch (error) {
            next(error);
        }
    }

    static async createForumReply(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const replyData = req.body;
            await ForumModel.newForumReply(replyData);
            res.status(201).json({ message: 'Reply created successfully' });
        }
        catch (error) {
            next(error);
        }
    }

    static async updatePostLikes(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { postId, clicked } = req.body;
            const result = await ForumModel.updatePostLikes(postId, clicked);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }

    static async updateReplyLikes(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { replyId, clicked } = req.body;
            const result = await ForumModel.updateReplyLikes(replyId, clicked);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }

    static async newForumPost(req: Request, res: Response, next: NextFunction): Promise<void> {

        const post = { 
            userEmail: req.body.userEmail, 
            businessUen: req.body.businessUen || null, 
            title: req.body.title || null,
            body: req.body.body,
            createdAt: new Date().toISOString(),
            likeCount: 0
         };

        try {
            await ForumModel.newForumPost(post);
            res.status(200).json({
                message: "Post added!",
                pointsEarned: 5
            });
        } 
        catch (error) {
            console.error(`Error adding post: ${error}`);
            next(error);
        }
    }

    static async newForumPostReply(req: Request, res: Response, next: NextFunction): Promise<void> {

        const postReply = {
            postId: req.body.postId,
            userEmail: req.body.userEmail,
            body: req.body.body,
            createdAt: new Date().toISOString(),
            likeCount: 0
         };

        try {
            await ForumModel.newForumPostReply(postReply);
            res.status(200).json({
                message: "Post reply added!",
                pointsEarned: 2
            });
        }
        catch (error) {
            console.error(`Error adding post: ${error}`);
            next(error);
        }
    }

    // ---------------------- CONTROLLER FUNCTIONS FOR THE ANNOUNCEMENT FEATURE  ----------------------

    static async newAnnouncement(req: Request, res: Response, next: NextFunction): Promise<void> {

        const announcement = { 
            businessUen: req.body.businessUen, 
            title: req.body.title, 
            content: req.body.content,
            imageUrl: req.body.imageUrl,
            createdAt: new Date().toISOString(),
         };

        try {
            await AnnouncementModel.newAnnouncement(announcement);
            res.status(200).json({ 
                message: "Announcement added!" 
            });
        } 
        catch (error) {
            console.error(`Error adding announcement: ${error}`);
            next(error);
        }
    }

    static async getAllAnnouncements(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const announcements = await AnnouncementModel.getAllAnnouncements();
            res.status(200).json(announcements)
        } 
        catch (error) {
            console.error(`Error adding announcement: ${error}`);
            next(error);
        }
    }

    static async getAnnouncementsByUEN(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const uen = String(req.body.uen)
            const announcements = await AnnouncementModel.getAnnouncementsByUEN(uen);
            res.status(200).json(announcements)
        } 
        catch (error) {
            console.error(`Error adding announcement: ${error}`);
            next(error);
        }
    }

    static async updateAnnouncement (req: Request, res: Response, next: NextFunction): Promise<void> {
        try  {
            const announcementId = req.body.announcementId
            const updatedAnnouncement = {
                title: req.body.title,
                content: req.body.content,
                imageUrl: req.body.imageUrl
            }
            await AnnouncementModel.updateAnnouncement(announcementId, updatedAnnouncement)
            res.status(200).json({ message: "Announcement updated!" })
        } 
        catch (err:any){
            console.error(`Error updating announcements: ${err}`)
        }
    } 

    static async deleteAnnouncement (req: Request, res: Response, next: NextFunction): Promise<void> {
        const announcementId = req.body.announcementId
        try  {
            await AnnouncementModel.deleteAnnouncement(announcementId)
            res.status(200).json({ message: "Announcement deleted!" })
        } 
        catch (err:any){
            console.error(`Error deleting announcement: ${err}`)
        }
    } 

    // ---------------------- CONTROLLER FUNCTIONS FOR THE BOOKMARK FEATURE  ----------------------
    static async getUserBookmarks (req: Request, res: Response, next: NextFunction): Promise<void> {
        const userId = req.body.userId

        try  {
            const userBookmarks = await BookmarkModel.getUserBookmarks(userId)
            res.status(200).json(userBookmarks)
        } 
        catch (err:any){
            console.error(`Error getting user bookmakrs: ${err}`)
        }
    }

    static async updateBookmarks (req: Request, res: Response, next: NextFunction): Promise<void> {
        const clicked = req.body.clicked
        const userId = req.body.userId
        const businessUen = req.body.businessUen

        try  {
            await BookmarkModel.updateBookmarks(userId, businessUen, clicked)
            res.status(200).json({ message: "Announcement deleted!" })
        } 
        catch (err:any){
            console.error(`Error updating bookmarks: ${err}`)
        }
    }
}

export default FeatureController