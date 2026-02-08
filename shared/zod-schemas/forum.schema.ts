import { z } from "zod";

// for getForumPostsByUENSchema
export const getForumPostsByUENSchema = z.object({
    uen: z.string().min(1, "UEN is required"),
});

// for createForumPost
export const createForumPostSchema = z.object({
    email: z.email("Invalid email address"),
    uen: z.string().default(""),
    title: z.string().min(1).default(""),
    body: z.string().min(1, "Post body is required"),
    likeCount: z.number().int().default(0),
});

// for createForumReply
export const createForumReplySchema = z.object({
    postId: z.number().int().positive("Post ID must be positive"),
    email: z.string().email("Invalid email address"),
    body: z.string().min(1, "Reply body is required"),
    likeCount: z.number().int().default(0),
});

// for updatePostLikes
export const updatePostLikesSchema = z.object({
    postId: z.number().int().positive("Post ID must be positive"),
    clicked: z.boolean(),
});

// for updateReplyLikes
export const updateReplyLikesSchema = z.object({
    replyId: z.number().int().positive("Reply ID must be positive"),
    clicked: z.boolean(),
});
