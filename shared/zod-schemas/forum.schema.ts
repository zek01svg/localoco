import { z } from 'zod';

// for getForumPostsByUENSchema
export const getForumPostsByUENSchema = z.object({
    uen: z.string().min(1, "UEN is required"),
});

// for createForumPost
export const createForumPostSchema = z.object({
    email: z.string().email("Invalid email address"),
    uen: z.string().nullable().optional(),
    title: z.string().min(1).nullable().optional(),
    body: z.string().min(1, "Post body is required"),
    likeCount: z.number().int().optional(), 
});

// for createForumReply
export const createForumReplySchema = z.object({
    postId: z.number().int().positive("Post ID must be positive"),
    userEmail: z.string().email("Invalid email address"),
    body: z.string().min(1, "Reply body is required"),
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

// for newForumPost
export const newForumPostSchema = z.object({
    email: z.email("Invalid email address"),
    businessUen: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    body: z.string().min(1, "Post body is required"),
});

// for newForumPostReply
export const newForumPostReplySchema = z.object({
    postId: z.number().int().positive("Post ID must be positive"),
    email: z.string().email("Invalid email address"),
    body: z.string().min(1, "Reply body is required"),
    likeCount: z.number().int().optional(),
});