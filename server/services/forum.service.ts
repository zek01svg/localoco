import checkDbResult from 'server/utils/check-db-result'; 
import { ForumPost, ForumPostReply } from '../../shared/types/forum-post.types';
import db from '../database/db'
import { forumPosts, forumPostsReplies, businesses, user } from '../database/schema';
import { eq, desc, inArray } from 'drizzle-orm';

class ForumService {

    /**
     * Creates a new forum post in the database.
     *
     * @param {Omit<ForumPost, 'id' | 'replies' | 'businessName' | 'createdAt' >} post - The post object containing details like userEmail, businessUen, title, and body.
     * @throws {Error} Throws an error if the process fails.
     * @returns {Promise<void>} Resolves on success.
     */
    public static async newForumPost(post: Omit<ForumPost, 'id' | 'replies' | 'businessName' | 'createdAt' >):Promise<void | Error> {
        
        const rawResult = await db.insert(forumPosts).values({
            email: post.email,
            uen: post.uen,
            title: post.title,
            body: post.body,
            likeCount: 0

        } as typeof forumPosts.$inferInsert)

        if (!checkDbResult(rawResult)) {
            throw new Error('Failed to create new forum post')
        }
    }

    /**
     * Creates a new reply to a forum post.
     *
     * This function inserts a new reply record. The 'likeCount' is not specified,
     * so it is expected to be handled by the database default (implicitly 0).
     *
     * @param {Omit<ForumPostReply, 'id' | 'createdAt' | 'likeCount'>} reply - The reply object containing the `postId`, `userEmail`, and `body`.
     * @throws {Error} Throws an error if the process fails.
     * @returns {Promise<void>} Resolves on success.
     */
    public static async newForumReply(reply: Omit<ForumPostReply, 'id' | 'createdAt'>): Promise<void | Error> {
        
        const rawResult = await db.insert(forumPostsReplies).values({
            postId: reply.postId,
            email: reply.email,
            body: reply.body,
            likeCount: reply.likeCount
        })
        
        if (!checkDbResult(rawResult)) {
            throw new Error('Failed to create new forum reply')
        }
    }

    /**
     * Retrieves all forum posts from the database.
     *
     * This function fetches all main posts (ordered newest first) and then, for each post,
     * it retrieves its associated replies (ordered oldest first). It also enriches both
     * posts and replies with the author's user image and fetches the business name
     * associated with the post's UEN, if available.
     *
     * @returns {Promise<ForumPost[]>} A promise that resolves to an array of fully populated `ForumPost` objects, each including its replies.
     */
    public static async getAllForumPosts(): Promise<ForumPost[]> {

        const posts = await db.select()
            .from(forumPosts)
            .orderBy(desc(forumPosts.createdAt));

        if (posts.length === 0) {
            return [];
        }

        return this._hydrateForumPosts(posts)
    }
    
    /**
     * Retrieves all forum posts associated with a specific business UEN.
     *
     * This function fetches all main posts matching the given UEN (ordered newest first).
     * For each matching post, it retrieves its replies (ordered oldest first),
     * the user images for the post author and reply authors, and the business name.
     *
     * @param {string} uen - The Unique Entity Number (UEN) of the business to filter posts by.
     * @returns {Promise<ForumPost[]>} A promise that resolves to an array of fully populated `ForumPost` objects for the specified business.
     */
    public static async getForumPostsByBusinessUen(uen: string): Promise<ForumPost[]> {

        const posts = await db.select()
            .from(forumPosts)
            .where(eq(forumPosts.uen, uen))
            .orderBy(desc(forumPosts.createdAt));

        return this._hydrateForumPosts(posts)
    }

    /**
     * Updates the like count for a specific forum post.
     *
     * This function increments the post's like count by one if `clicked` is true,
     * or decrements it by one if `clicked` is false. The like count is
     * prevented from going below zero.
     *
     * @param {number} postId - The unique identifier of the post to update.
     * @param {boolean} [clicked=false] - Whether the like action is an increment (true) or decrement (false).
     * @returns {Promise<Object>} A promise resolving to an object containing the post's original data, the new `likeCount`, and an `updateResult` boolean from the database operation.
     * @throws {Error} Throws an error if the post with the specified `postId` is not found.
     */
    public static async updatePostLikes(postId: number, clicked: boolean = false): Promise<Object> {

        const posts  = await db.select().from(forumPosts).where(eq(forumPosts.id, postId))
        const post = posts[0]!

        const newLikeCount = clicked 
            ? (post.likeCount ?? 0) + 1
            : Math.max((post.likeCount ?? 0) - 1, 0); // prevent negative likes

        const rawResult = await db.update(forumPosts)
            .set({ likeCount: newLikeCount })
            .where(eq(forumPosts.id, postId));

        if (!checkDbResult(rawResult)) {
            throw new Error('Failed to update forum post likes')
        }

        return { 
            ...post, 
            likeCount: newLikeCount,
        };
    }

    /**
     * Updates the like count for a specific forum post reply.
     *
     * This function increments the reply's like count by one if `clicked` is true,
     * or decrements it by one if `clicked` is false. The like count is
     * prevented from going below zero.
     *
     * @param {number} replyId - The unique identifier of the reply to update.
     * @param {boolean} [clicked=false] - Whether the like action is an increment (true) or decrement (false).
     * @returns {Promise<{likeCount: number, updateResult: boolean, ...}>} A promise resolving to an object containing the reply's original data, the new `likeCount`, and an `updateResult` boolean from the database operation.
     * @throws {Error} Throws an error if the reply with the specified `replyId` is not found.
     */
    public static async updateReplyLikes(replyId: number, clicked: boolean = false): Promise<Object> {
        
        const replies = await db.select().from(forumPostsReplies).where(eq(forumPostsReplies.id, replyId));
        const reply = replies[0]!

        const newLikeCount = clicked
            ? (reply.likeCount ?? 0) + 1
            : Math.max((reply.likeCount ?? 0) - 1, 0);

        const rawResult = await db.update(forumPostsReplies)
            .set({ likeCount: newLikeCount })
            .where(eq(forumPostsReplies.id, replyId));

        if (!checkDbResult(rawResult)) {
            throw new Error('Failed to update forum reply likes')
        }

        return { 
            ...reply, 
            likeCount: newLikeCount,
        };
    }
    
    /**
     * Helper to "hydrate" a list of raw forum posts with their replies,
     * user images, and business names using efficient batch queries.
     * * @param {ForumPost[]} posts - An array of raw post objects from the database.
     * @returns {Promise<ForumPost[]>} A promise that resolves to an array of fully populated `ForumPost` objects.
     */
    private static async _hydrateForumPosts(posts: Omit<ForumPost, 'businessName' | 'replies' >[]): Promise<ForumPost[]> {

        const postIds = posts.map(p => p.id);
        const postEmails = posts.map(p => p.email);
        const uens = posts.map(p => p.uen).filter((uen): uen is string => !!uen);

        // get all replies for the fetched posts ordered by oldest first
        const allReplies = await db.select()
            .from(forumPostsReplies)
            .where(inArray(forumPostsReplies.postId, postIds))
            .orderBy(forumPostsReplies.createdAt); 

        // prepare unique list of all user emails from posts and replies
        const replyEmails = allReplies.map(r => r.email);
        const allEmails = [...new Set([...postEmails, ...replyEmails])];

        // get all user images 
        const allUsers = await db.select({
                email: user.email,
                image: user.imageUrl 
            })
            .from(user)
            .where(inArray(user.email, allEmails));

        // get all business names 
        let allBusinesses: { uen: string; businessName: string }[] = [];
        if (uens.length > 0) {
            allBusinesses = await db.select({
                    uen: businesses.uen,
                    businessName: businesses.businessName
                })
                .from(businesses)
                .where(inArray(businesses.uen, uens));
        }

        // build maps/dicts for fast lookup
        const userImageMap = new Map<string, string | null>(
            allUsers.map(u => [u.email, u.image])
        );
        
        const businessNameMap = new Map<string, string | null>(
            allBusinesses.map(b => [b.uen, b.businessName])
        );

        const repliesMap = new Map<number, ForumPostReply[]>();
        for (const r of allReplies) {
            if (!repliesMap.has(r.postId)) {
                repliesMap.set(r.postId, []);
            }
            
            repliesMap.get(r.postId)!.push({
                id: r.id,
                postId: r.postId,
                email: r.email, 
                image: userImageMap.get(r.email) || null, 
                body: r.body,
                likeCount: r.likeCount,
                createdAt: r.createdAt,
            });
        }

        // assemble final hydrated posts 
        const hydratedPosts: ForumPost[] = posts.map(post => {
            const postUserImage = userImageMap.get(post.email) || null;
            const businessName = post.uen ? (businessNameMap.get(post.uen) || null) : null;
            const postReplies = repliesMap.get(post.id) || []; 

            return {
                id: post.id,
                email: post.email,
                image: postUserImage,
                uen: post.uen,
                businessName: businessName,
                title: post.title,
                body: post.body,
                likeCount: post.likeCount, 
                createdAt: post.createdAt, 
                replies: postReplies
            };
        });

        return hydratedPosts;
    }
}

export default ForumService