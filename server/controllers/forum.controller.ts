import ForumService from "services/forum.service";
import { Context } from "hono"
import { createForumPostSchema, createForumReplySchema, getForumPostsByUENSchema, newForumPostReplySchema, newForumPostSchema, updatePostLikesSchema } from "../../shared/zod-schemas/forum.schema";

class ForumController {

    static async getAllForumPosts(c: Context): Promise<void> {
            
        const forumPosts = await ForumService.getAllForumPosts();
        c.json(forumPosts, 200)
        
    }

    static async getForumPostsByBusinessUEN(c: Context): Promise<void> {
        
        const payload = c.req.param('uen');
        const validationResult = getForumPostsByUENSchema.safeParse({uen: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }

        const uen = validationResult.data.uen

        const forumPosts = await ForumService.getForumPostsByBusinessUen(uen);
        c.json(forumPosts, 200);
        
    }

    static async createForumPost(c: Context): Promise<void> {

        const payload = c.req.json()
        const validationResult = createForumPostSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const postData = validationResult.data

        await ForumService.newForumPost(postData);
        c.json({ 
            message: 'Forum post created successfully' 
        }, 201);

    }

    static async createForumReply(c: Context): Promise<void> {

        const payload = c.req.json()
        const validationResult = createForumReplySchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const replyData = validationResult.data

        await ForumService.newForumReply(replyData);
        c.json({ 
            message: 'Reply to forum post created successfully' 
        }, 201);
    }

    static async updatePostLikes(c: Context): Promise<void> {

        const payload = c.req.json()
        const validationResult = updatePostLikesSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const postId = validationResult.data.postId
        const clicked = validationResult.data.clicked

        const updatedPost = await ForumService.updatePostLikes(postId, clicked);
        c.json({
            updatedPost: updatedPost,
            message: "Post likes updated successfully"
        }, 200);
        
    }

    static async updateReplyLikes(c: Context): Promise<void> {

        const payload = c.req.json()
        const validationResult = updatePostLikesSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const replyId = validationResult.data.postId
        const clicked = validationResult.data.clicked

        const updatedPostReply = await ForumService.updateReplyLikes(replyId, clicked);
        c.json({
            updatedPostReply: updatedPostReply,
            message: "Post reply likes updated successfully"
        }, 200);

    }

    static async newForumPost(c: Context): Promise<void> {
        
        const payload = c.req.json()
        const validationResult = newForumPostSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const post = validationResult.data

        await ForumService.newForumPost(post);
        c.json({
            message: "Forum post created successfully",
            pointsEarned: 5
        }, 201);
        
    }

    static async newForumPostReply(c: Context): Promise<void> {

        const payload = c.req.json()
        const validationResult = newForumPostReplySchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }
        const postReply = validationResult.data

        await ForumService.newForumPostReply(postReply);
        c.json({
            message: "Forum post reply added successfully",
            pointsEarned: 2
        }, 201);
        
    }
}

export default ForumController