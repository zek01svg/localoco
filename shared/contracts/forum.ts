import { z } from "zod/v4";

// Forum post title bounds: non-empty, max 200 characters.
export const forumTitleSchema = z
  .string()
  .trim()
  .min(1, { message: "Title cannot be empty" })
  .max(200, { message: "Title cannot exceed 200 characters" });

// Forum body bounds: non-empty, max 4000 characters. Shared by posts and replies.
export const forumBodySchema = z
  .string()
  .trim()
  .min(1, { message: "Body cannot be empty" })
  .max(4000, { message: "Body cannot exceed 4000 characters" });

export const createForumPostSchema = z.object({
  businessId: z.string().min(1, { message: "Business is required" }),
  title: forumTitleSchema,
  body: forumBodySchema,
});
export type CreateForumPost = z.infer<typeof createForumPostSchema>;

export const updateForumPostSchema = z
  .object({
    title: forumTitleSchema.optional(),
    body: forumBodySchema.optional(),
  })
  .refine(data => data.title !== undefined || data.body !== undefined, {
    message: "At least one field must be provided",
  });
export type UpdateForumPost = z.infer<typeof updateForumPostSchema>;

export const createForumReplySchema = z.object({
  body: forumBodySchema,
});
export type CreateForumReply = z.infer<typeof createForumReplySchema>;

// A reply's only editable field is its body, so update accepts the same shape.
export const updateForumReplySchema = createForumReplySchema;
export type UpdateForumReply = z.infer<typeof updateForumReplySchema>;

export const forumAuthorSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().nullable(),
});
export type ForumAuthor = z.infer<typeof forumAuthorSchema>;

export const forumBusinessReferenceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
});
export type ForumBusinessReference = z.infer<typeof forumBusinessReferenceSchema>;

export const forumPostItemSchema = z.object({
  id: z.string().min(1),
  businessId: z.string().min(1),
  userId: z.string().min(1),
  title: z.string(),
  body: z.string(),
  author: forumAuthorSchema,
  business: forumBusinessReferenceSchema,
  replyCount: z.number().int().min(0),
  likeCount: z.number().int().min(0).default(0),
  isLiked: z.boolean().default(false),
  // Null on every public read; administrators reading with includeDeleted see
  // the soft-deletion timestamp.
  deletedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ForumPostItem = z.infer<typeof forumPostItemSchema>;

export const forumReplyItemSchema = z.object({
  id: z.string().min(1),
  postId: z.string().min(1),
  userId: z.string().min(1),
  body: z.string(),
  author: forumAuthorSchema,
  likeCount: z.number().int().min(0).default(0),
  isLiked: z.boolean().default(false),
  // Null on every public read; administrators reading with includeDeleted see
  // the soft-deletion timestamp.
  deletedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ForumReplyItem = z.infer<typeof forumReplyItemSchema>;

export const forumQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).max(256).optional(),
  // Admins may opt into soft-deleted content; non-admins get 403.
  includeDeleted: z
    .preprocess(v => (v === "true" ? true : v === "false" ? false : v), z.boolean())
    .default(false),
});
export type ForumQuery = z.infer<typeof forumQuerySchema>;

export const forumFeedResponseSchema = z.object({
  items: z.array(forumPostItemSchema),
  nextCursor: z.string().nullable(),
});
export type ForumFeedResponse = z.infer<typeof forumFeedResponseSchema>;

export const forumRepliesResponseSchema = z.object({
  items: z.array(forumReplyItemSchema),
  nextCursor: z.string().nullable(),
});
export type ForumRepliesResponse = z.infer<typeof forumRepliesResponseSchema>;
