import { sql } from "drizzle-orm";
import {
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod/v4";

import { user } from "./auth";
import { businesses } from "./business";

// --- Forum Tables ---

export const forumPosts = pgTable(
  "forum_posts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    email: text("email")
      .notNull()
      .references(() => user.email, { onDelete: "cascade" }),
    uen: varchar("uen", { length: 20 })
      .references(() => businesses.uen, { onDelete: "cascade" })
      .notNull(),
    title: text("title"),
    body: text("body").notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  () => [
    pgPolicy("forum_posts_public_read", { for: "select", using: sql`true` }),
    pgPolicy("forum_posts_insert", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`email = (select auth.email())::text`,
    }),
    pgPolicy("forum_posts_owner_modify", {
      for: "all",
      to: "authenticated",
      using: sql`email = (select auth.email())::text`,
    }),
  ]
);

export const selectForumPostSchema = createSelectSchema(forumPosts);
export const insertForumPostSchema = createInsertSchema(forumPosts);
export type ForumPost = z.infer<typeof selectForumPostSchema>;
export type InsertForumPost = z.infer<typeof insertForumPostSchema>;

export const createPostSchema = z.object({
  uen: z.string().min(1, "UEN is required"),
  title: z.string().min(1, "Post title is required"),
  body: z.string().min(1, "Post body is required"),
});

export const updatePostSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1, "Post title is required"),
  body: z.string().min(1, "Post body is required"),
});

export const updatePostLikesSchema = z.object({
  postId: z.number().int().positive(),
  clicked: z.boolean(),
});

export const getPostsByUenSchema = z.object({
  uen: z.string().min(1, "UEN is required"),
});

export const deletePostSchema = z.object({
  id: z.number().int().positive(),
});

export const forumPostsReplies = pgTable(
  "forum_posts_replies",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    postId: integer("post_id")
      .notNull()
      .references(() => forumPosts.id, { onDelete: "cascade" }),
    email: text("email")
      .notNull()
      .references(() => user.email, { onDelete: "cascade" }),
    body: text("body").notNull(),
    likeCount: integer("like_count").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  () => [
    pgPolicy("forum_replies_public_read", { for: "select", using: sql`true` }),
    pgPolicy("forum_replies_insert", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`email = (select auth.email())::text`,
    }),
    pgPolicy("forum_replies_owner_modify", {
      for: "all",
      to: "authenticated",
      using: sql`email = (select auth.email())::text`,
    }),
  ]
);

export const selectForumPostReplySchema = createSelectSchema(forumPostsReplies);
export const insertForumPostReplySchema = createInsertSchema(forumPostsReplies);
export type ForumPostReply = z.infer<typeof selectForumPostReplySchema>;
export type InsertForumPostReply = z.infer<typeof insertForumPostReplySchema>;

export const createReplySchema = z.object({
  postId: z.number().int().positive(),
  body: z.string().min(1, "Reply body is required"),
});

export const updateReplySchema = z.object({
  id: z.number().int().positive(),
  body: z.string().min(1, "Reply body is required"),
});

export const updateReplyLikesSchema = z.object({
  replyId: z.number().int().positive(),
  clicked: z.boolean(),
});

export const deleteReplySchema = z.object({
  id: z.number().int().positive(),
});
