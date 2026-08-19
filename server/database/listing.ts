import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { business } from "./business";

import { randomUUID } from "node:crypto";

export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "suspended",
]);

export type ListingStatus = (typeof listingStatusEnum.enumValues)[number];

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
    status: listingStatusEnum("status").notNull().default("draft"),
    rejectionReason: text("rejection_reason"),
    name: varchar("name", { length: 200 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    address: varchar("address", { length: 500 }).notNull(),
    postalCode: varchar("postal_code", { length: 12 }).notNull(),
    // Coordinates are written once, when the address is validated server-side
    // at write time; reads render stored values only and never geocode. Null
    // for rows created before address validation existed.
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    phone: varchar("phone", { length: 32 }),
    description: varchar("description", { length: 2000 }),
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
    check(
      "listing_payment_options_cardinality_check",
      sql`array_length(${table.paymentOptions}, 1) is null or array_length(${table.paymentOptions}, 1) <= 8`
    ),
  ]
);

export const listingModerationAudit = pgTable(
  "listing_moderation_audit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    listingId: text("listing_id")
      .notNull()
      .references(() => listing.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    previousStatus: listingStatusEnum("previous_status").notNull(),
    nextStatus: listingStatusEnum("next_status").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [index("listing_moderation_audit_listing_id_idx").on(table.listingId)]
);
