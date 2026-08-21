import type { SQL } from "drizzle-orm";

import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { business } from "./business";

import { randomUUID } from "node:crypto";

export const announcementStatusEnum = pgEnum("announcement_status", ["active", "moderated"]);

export type AnnouncementStatus = (typeof announcementStatusEnum.enumValues)[number];

export const announcement = pgTable(
  "announcement",
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
    content: text("content").notNull(),
    imageUrl: varchar("image_url", { length: 1000 }),
    linkUrl: varchar("link_url", { length: 1000 }),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    status: announcementStatusEnum("status").notNull().default("active"),
    moderationReason: text("moderation_reason"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [
    check(
      "announcement_visibility_dates_check",
      sql`${table.endsAt} is null or ${table.startsAt} is null or ${table.endsAt} >= ${table.startsAt}`
    ),
    index("announcement_business_id_created_at_idx").on(table.businessId, table.createdAt),
    index("announcement_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("announcement_status_idx").on(table.status),
  ]
);

export const announcementModerationAudit = pgTable(
  "announcement_moderation_audit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    announcementId: text("announcement_id")
      .notNull()
      .references(() => announcement.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    previousStatus: announcementStatusEnum("previous_status").notNull(),
    nextStatus: announcementStatusEnum("next_status").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [index("announcement_moderation_audit_announcement_id_idx").on(table.announcementId)]
);

export type AnnouncementRow = typeof announcement.$inferSelect;
export type NewAnnouncementRow = typeof announcement.$inferInsert;
export type AnnouncementModerationAuditRow = typeof announcementModerationAudit.$inferSelect;

// The single public-visibility boundary for Announcement content.
// Only active announcements whose visibility window encompasses the current time
// are visible to the public. Non-public listings are excluded at query time.
export const publiclyVisibleAnnouncement = (now: Date = new Date()): SQL => {
  const cond = and(
    eq(announcement.status, "active"),
    or(isNull(announcement.startsAt), lte(announcement.startsAt, now)),
    or(isNull(announcement.endsAt), gte(announcement.endsAt, now))
  );
  return cond ?? sql`true`;
};
