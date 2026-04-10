import { z } from "zod/v4";

export const ForumPostReplySchema = z.object({
  id: z.string(),
  postId: z.string(),
  email: z.string(),
  imageUrl: z.string(),
  body: z.string(),
  likeCount: z.number(),
  createdAt: z.string().or(z.date()),
});

export const HydratedForumPostSchema = z.object({
  id: z.string(),
  email: z.string(),
  imageUrl: z.string(),
  uen: z.string(),
  businessName: z.string(),
  title: z.string(),
  body: z.string(),
  likeCount: z.number(),
  createdAt: z.string().or(z.date()),
  replies: z.array(ForumPostReplySchema),
});
