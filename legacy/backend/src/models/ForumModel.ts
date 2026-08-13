import { ForumPost, ForumPostReply } from '../types/ForumPost.js';
import db from '../database/db.js'
import { forumPosts, forumPostsReplies, businesses, user } from '../database/schema.js';
import { eq, desc } from 'drizzle-orm';

class ForumModel {

    // creates a new forum post
    public static async newForumPost(post: Omit<ForumPost, 'id' | 'replies' | 'businessName'>) {
        
        try {
            await db.insert(forumPosts).values({
                userEmail: post.userEmail,
                businessUen: post.businessUen,
                title: post.title,
                body: post.body,
                createdAt: post.createdAt,
                likeCount: 0

            } as typeof forumPosts.$inferInsert)
        }
        catch (err) {
            console.error(err)
        }
    }

    // creates a new forum post
    public static async newForumPostReply(post: Omit<ForumPostReply, 'id'>) {
        
        try {
            await db.insert(forumPostsReplies).values({
                postId: post.postId,
                userEmail: post.userEmail,
                body: post.body,
                createdAt: post.createdAt,
                likeCount: post.likeCount

            } as typeof forumPostsReplies.$inferInsert)
        }
        catch (err) {
            console.error(err)
        }
    }

    // get all forum posts
    public static async getAllForumPosts(): Promise<ForumPost[]> {

        // select the main posts first, ordered by newest first
        const posts = await db.select().from(forumPosts).orderBy(desc(forumPosts.createdAt))

        const container: ForumPost[] = [];

        // fetch the replies to the posts and map them to their parents
        for (let post of posts) {
            // fetch replies for this post, ordered by oldest first (so oldest replies show at top)
            const replies = await db.select().from(forumPostsReplies).where(eq(forumPostsReplies.postId, post.id)).orderBy(forumPostsReplies.createdAt);

            // Fetch post author's image
            let postUserImage: string | null = null;
            const postUserResult = await db.select({ image: user.image })
                .from(user)
                .where(eq(user.email, post.userEmail))
                .limit(1);
            if (postUserResult.length > 0 && postUserResult[0]) {
                postUserImage = postUserResult[0].image;
            }

            // map replies with user images
            const mappedReplies: ForumPostReply[] = [];
            for (const r of replies) {
                let replyUserImage: string | null = null;
                const replyUserResult = await db.select({ image: user.image })
                    .from(user)
                    .where(eq(user.email, r.userEmail))
                    .limit(1);
                if (replyUserResult.length > 0 && replyUserResult[0]) {
                    replyUserImage = replyUserResult[0].image;
                }

                mappedReplies.push({
                    id: r.id,
                    postId: r.postId,
                    userEmail: r.userEmail,
                    userImage: replyUserImage,
                    body: r.body,
                    likeCount: r.likeCount,
                    createdAt: r.createdAt,
                });
            }

            // Fetch business name if UEN exists
            let businessName: string | null = null;
            if (post.businessUen) {
                const businessResult = await db.select({ businessName: businesses.businessName })
                    .from(businesses)
                    .where(eq(businesses.uen, post.businessUen))
                    .limit(1);
                if (businessResult.length > 0 && businessResult[0]) {
                    businessName = businessResult[0].businessName;
                }
            }

            // push post with its replies
            container.push({
                id: post.id,
                userEmail: post.userEmail,
                userImage: postUserImage,
                businessUen: post.businessUen,
                businessName: businessName,
                title: post.title || null,
                body: post.body,
                likeCount: post.likeCount!,
                createdAt: post.createdAt!,
                replies: mappedReplies
            });
        }

        return container;
    }

    // get forum posts by business UEN
    public static async getForumPostsByBusinessUEN(businessUen: string): Promise<ForumPost[]> {
        // select posts linked to this business, ordered by newest first
        const posts = await db.select()
            .from(forumPosts)
            .where(eq(forumPosts.businessUen, businessUen))
            .orderBy(desc(forumPosts.createdAt));

        const container: ForumPost[] = [];

        // fetch the replies to the posts and map them to their parents
        for (let post of posts) {
            // fetch replies for this post, ordered by oldest first
            const replies = await db.select()
                .from(forumPostsReplies)
                .where(eq(forumPostsReplies.postId, post.id))
                .orderBy(forumPostsReplies.createdAt);

            // Fetch post author's image
            let postUserImage: string | null = null;
            const postUserResult = await db.select({ image: user.image })
                .from(user)
                .where(eq(user.email, post.userEmail))
                .limit(1);
            if (postUserResult.length > 0 && postUserResult[0]) {
                postUserImage = postUserResult[0].image;
            }

            // map replies with user images
            const mappedReplies: ForumPostReply[] = [];
            for (const r of replies) {
                let replyUserImage: string | null = null;
                const replyUserResult = await db.select({ image: user.image })
                    .from(user)
                    .where(eq(user.email, r.userEmail))
                    .limit(1);
                if (replyUserResult.length > 0 && replyUserResult[0]) {
                    replyUserImage = replyUserResult[0].image;
                }

                mappedReplies.push({
                    id: r.id,
                    postId: r.postId,
                    userEmail: r.userEmail,
                    userImage: replyUserImage,
                    body: r.body,
                    likeCount: r.likeCount,
                    createdAt: r.createdAt,
                });
            }

            // Fetch business name if UEN exists
            let businessName: string | null = null;
            if (post.businessUen) {
                const businessResult = await db.select({ businessName: businesses.businessName })
                    .from(businesses)
                    .where(eq(businesses.uen, post.businessUen))
                    .limit(1);
                if (businessResult.length > 0 && businessResult[0]) {
                    businessName = businessResult[0].businessName;
                }
            }

            // push post with its replies
            container.push({
                id: post.id,
                userEmail: post.userEmail,
                userImage: postUserImage,
                businessUen: post.businessUen,
                businessName: businessName,
                title: post.title || null,
                body: post.body,
                likeCount: post.likeCount!,
                createdAt: post.createdAt!,
                replies: mappedReplies
            });
        }

        return container;
    }

    // handle likes for posts
    public static async updatePostLikes(postId: number, clicked: boolean = false) {
        // clicked = true → user liked → increment
        // clicked = false → user unliked → decrement
        const posts  = await db.select().from(forumPosts).where(eq(forumPosts.id, postId))
        const post = posts[0]

        if (!post) {
            throw new Error(`Post with ID ${postId} not found.`)
        }

        const newLikeCount = clicked 
            ? (post.likeCount ?? 0) + 1
            : Math.max((post.likeCount ?? 0) - 1, 0); // prevent negative likes

        await db.update(forumPosts)
            .set({ likeCount: newLikeCount })
            .where(eq(forumPosts.id, postId));

        return { ...post, likeCount: newLikeCount };
    }


    // handle likes for replies
    public static async updateReplyLikes(replyId: number, clicked: boolean = false) {
        const [reply] = await db.select().from(forumPostsReplies).where(eq(forumPostsReplies.id, replyId));

        if (!reply) {
            throw new Error(`Reply with ID ${replyId} not found.`)
        }

        const newLikeCount = clicked
            ? (reply.likeCount ?? 0) + 1
            : Math.max((reply.likeCount ?? 0) - 1, 0);

        await db.update(forumPostsReplies)
            .set({ likeCount: newLikeCount })
            .where(eq(forumPostsReplies.id, replyId));

        return { ...reply, likeCount: newLikeCount };
    }

    // creates a new reply to a forum post
    public static async newForumReply(reply: Omit<ForumPostReply, 'id' | 'createdAt' | 'likeCount'>) {
        const result = await db.insert(forumPostsReplies).values({
            postId: reply.postId,
            userEmail: reply.userEmail,
            body: reply.body,
        })
        return result;
    }
}

export default ForumModel