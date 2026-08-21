import type { SQL } from "drizzle-orm";

import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { business } from "./business";

import { randomUUID } from "node:crypto";

export const forumPost = pgTable(
  "forum_post",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    deletedAt: timestamp("deleted_at"),
    moderatedAt: timestamp("moderated_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [
    index("forum_post_business_id_created_at_idx").on(table.businessId, table.createdAt),
    index("forum_post_user_id_created_at_idx").on(table.userId, table.createdAt),
  ]
);

export const forumReply = pgTable(
  "forum_reply",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    postId: text("post_id")
      .notNull()
      .references(() => forumPost.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    deletedAt: timestamp("deleted_at"),
    moderatedAt: timestamp("moderated_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [
    index("forum_reply_post_id_created_at_idx").on(table.postId, table.createdAt),
    index("forum_reply_user_id_created_at_idx").on(table.userId, table.createdAt),
  ]
);

export const forumModerationAudit = pgTable(
  "forum_moderation_audit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    targetType: varchar("target_type", { length: 16 }).$type<"post" | "reply">().notNull(),
    targetId: text("target_id").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    originalTitle: varchar("original_title", { length: 200 }),
    originalBody: text("original_body").notNull(),
    originalAuthorId: text("original_author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [
    index("forum_moderation_audit_target_idx").on(table.targetType, table.targetId),
    index("forum_moderation_audit_actor_idx").on(table.actorId),
  ]
);

export type ForumPostRow = typeof forumPost.$inferSelect;
export type NewForumPostRow = typeof forumPost.$inferInsert;
export type ForumReplyRow = typeof forumReply.$inferSelect;
export type NewForumReplyRow = typeof forumReply.$inferInsert;
export type ForumModerationAuditRow = typeof forumModerationAudit.$inferSelect;
export type NewForumModerationAuditRow = typeof forumModerationAudit.$inferInsert;

// The single public-visibility boundary for Forum content. Every public read
// path must route through these predicates: a path that forgets them
// republishes soft-deleted or moderated content.
export const publiclyVisiblePost = (t: typeof forumPost = forumPost): SQL =>
  sql`${t.deletedAt} is null and ${t.moderatedAt} is null`;
export const publiclyVisibleReply = (t: typeof forumReply = forumReply): SQL =>
  sql`${t.deletedAt} is null and ${t.moderatedAt} is null`;
