import ForumService from "services/forum.service";
import { Context } from "hono"
import { createForumPostSchema, createForumReplySchema, getForumPostsByUENSchema, updatePostLikesSchema } from "../../shared/zod-schemas/forum.schema";

class ForumController {
    
    /**
     * Creates a new forum post in the database.
     *
     * @param {Omit<ForumPost, 'id' | 'replies' | 'businessName' | 'createdAt' >} post - The post object.
     * @returns {Promise<void>} Resolves on success.
     * @throws {Error} Throws an error if the database insertion fails.
     */
    static async createForumPost(c: Context): Promise<Response> {

        const payload = c.req.json()
        const validationResult = createForumPostSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const postData = validationResult.data

        await ForumService.newForumPost(postData);
        return c.json({ 
            message: 'Forum post created successfully' 
        }, 201);
    }

    /**
     * Creates a new reply to a forum post.
     *
     * @param {Omit<ForumPostReply, 'id' | 'createdAt'>} reply - The reply object.
     * @returns {Promise<void>} Resolves on success.
     * @throws {Error} Throws an error if the database insertion fails.
     */
    static async createForumReply(c: Context): Promise<Response> {

        const payload = c.req.json()
        const validationResult = createForumReplySchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const replyData = validationResult.data

        await ForumService.newForumReply(replyData);
        return c.json({ 
            message: 'Reply to forum post created successfully' 
        }, 201);
    }

    /**
     * Retrieves all forum posts from the service.
     * @param {Context} c - The Hono context.
     * @returns {Promise<Response>} A JSON response containing an array of all forum posts.
     */
    static async getAllForumPosts(c: Context): Promise<Response> {
            
        const forumPosts = await ForumService.getAllForumPosts();
        return c.json(forumPosts, 200)
    }

    /**
     * Retrieves all forum posts for a specific business UEN.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the UEN parameter fails validation.
     * @returns {Promise<Response>} A JSON response containing an array of forum posts for the specified business.
     */
    static async getForumPostsByBusinessUEN(c: Context): Promise<Response> {
        
        const payload = c.req.param('uen');
        const validationResult = getForumPostsByUENSchema.safeParse({uen: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }

        const uen = validationResult.data.uen

        const forumPosts = await ForumService.getForumPostsByBusinessUen(uen);
        return c.json(forumPosts, 200);
    }

    /**
     * Updates the like count for a forum post.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with the updated post and a success message.
     */
    static async updatePostLikes(c: Context): Promise<Response> {

        const payload = c.req.json()
        const validationResult = updatePostLikesSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const postId = validationResult.data.postId
        const clicked = validationResult.data.clicked

        const updatedPost = await ForumService.updatePostLikes(postId, clicked);
        return c.json({
            updatedPost: updatedPost,
            message: "Post likes updated successfully"
        }, 200);
    }

    /**
     * Updates the like count for a forum post reply.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with the updated reply and a success message.
     */
    static async updateReplyLikes(c: Context): Promise<Response> {

        const payload = c.req.json()
        const validationResult = updatePostLikesSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const replyId = validationResult.data.postId
        const clicked = validationResult.data.clicked

        const updatedPostReply = await ForumService.updateReplyLikes(replyId, clicked);
        return c.json({
            updatedPostReply: updatedPostReply,
            message: "Post reply likes updated successfully"
        }, 200);
    }
}

export default ForumController