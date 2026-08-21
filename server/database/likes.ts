import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { forumPost, forumReply } from "./forum";
import { review } from "./reviews";

import { randomUUID } from "node:crypto";

export const reviewLike = pgTable(
  "review_like",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reviewId: text("review_id")
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [
    unique("review_like_user_review_unique").on(table.userId, table.reviewId),
    index("review_like_review_id_idx").on(table.reviewId),
    index("review_like_user_id_idx").on(table.userId),
  ]
);

export const forumPostLike = pgTable(
  "forum_post_like",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => forumPost.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [
    unique("forum_post_like_user_post_unique").on(table.userId, table.postId),
    index("forum_post_like_post_id_idx").on(table.postId),
    index("forum_post_like_user_id_idx").on(table.userId),
  ]
);

export const forumReplyLike = pgTable(
  "forum_reply_like",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    replyId: text("reply_id")
      .notNull()
      .references(() => forumReply.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [
    unique("forum_reply_like_user_reply_unique").on(table.userId, table.replyId),
    index("forum_reply_like_reply_id_idx").on(table.replyId),
    index("forum_reply_like_user_id_idx").on(table.userId),
  ]
);

export type ReviewLikeRow = typeof reviewLike.$inferSelect;
export type NewReviewLikeRow = typeof reviewLike.$inferInsert;

export type ForumPostLikeRow = typeof forumPostLike.$inferSelect;
export type NewForumPostLikeRow = typeof forumPostLike.$inferInsert;

export type ForumReplyLikeRow = typeof forumReplyLike.$inferSelect;
export type NewForumReplyLikeRow = typeof forumReplyLike.$inferInsert;
