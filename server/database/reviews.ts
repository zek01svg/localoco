import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { business } from "./business";

import { randomUUID } from "node:crypto";

export const review = pgTable(
  "review",
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
    rating: integer("rating").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [
    unique("review_user_business_unique").on(table.userId, table.businessId),
    check("review_rating_range_check", sql`${table.rating} >= 1 and ${table.rating} <= 5`),
    index("review_business_id_created_at_idx").on(table.businessId, table.createdAt),
    index("review_user_id_created_at_idx").on(table.userId, table.createdAt),
  ]
);

export type ReviewRow = typeof review.$inferSelect;
export type NewReviewRow = typeof review.$inferInsert;
