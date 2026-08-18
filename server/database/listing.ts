import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { business } from "./business";

import { randomUUID } from "node:crypto";

export const listing = pgTable(
  "listing",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    businessId: text("business_id")
      .notNull()
      .unique()
      .references(() => business.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("draft").$type<"draft" | "published">(),
    name: varchar("name", { length: 200 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    address: varchar("address", { length: 500 }).notNull(),
    postalCode: varchar("postal_code", { length: 12 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 254 }),
    website: varchar("website", { length: 500 }),
    paymentOptions: text("payment_options").array(),
    priceRange: varchar("price_range", { length: 32 }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [
    check("listing_status_check", sql`${table.status} in ('draft', 'published')`),
    check(
      "listing_payment_options_cardinality_check",
      sql`array_length(${table.paymentOptions}, 1) is null or array_length(${table.paymentOptions}, 1) <= 8`
    ),
  ]
);
