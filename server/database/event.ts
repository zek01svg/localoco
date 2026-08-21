import type { SQL } from "drizzle-orm";

import { and, eq, gte, sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { business } from "./business";

import { randomUUID } from "node:crypto";

export const eventStatusEnum = pgEnum("event_status", ["active", "moderated"]);

export type EventStatus = (typeof eventStatusEnum.enumValues)[number];

export const event = pgTable(
  "event",
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
    description: text("description").notNull(),
    imageUrl: varchar("image_url", { length: 1000 }),
    linkUrl: varchar("link_url", { length: 1000 }),
    startsAt: timestamp("starts_at").notNull(),
    endsAt: timestamp("ends_at").notNull(),
    status: eventStatusEnum("status").notNull().default("active"),
    moderationReason: text("moderation_reason"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [
    check("event_time_bounds_check", sql`${table.endsAt} >= ${table.startsAt}`),
    index("event_business_id_starts_at_idx").on(table.businessId, table.startsAt),
    index("event_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("event_status_idx").on(table.status),
    index("event_ends_at_idx").on(table.endsAt),
  ]
);

export const eventModerationAudit = pgTable(
  "event_moderation_audit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    previousStatus: eventStatusEnum("previous_status").notNull(),
    nextStatus: eventStatusEnum("next_status").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [index("event_moderation_audit_event_id_idx").on(table.eventId)]
);

export type EventRow = typeof event.$inferSelect;
export type NewEventRow = typeof event.$inferInsert;
export type EventModerationAuditRow = typeof eventModerationAudit.$inferSelect;

// The single public-visibility boundary for Event content.
// Only active events whose ends_at is in the future (ends_at >= now) are visible to the public.
// Expired events drop out automatically. Non-public listings are excluded at query time.
export const publiclyVisibleEvent = (now: Date = new Date()): SQL => {
  const cond = and(eq(event.status, "active"), gte(event.endsAt, now));
  return cond ?? sql`true`;
};
