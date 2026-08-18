import { sql } from "drizzle-orm";
import { bigint, check, index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { business } from "./business";

export const mediaObject = pgTable(
  "media_object",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // The R2 object key. Server-generated and opaque: a client never proposes
    // a key, so path traversal and cross-object overwrite are structurally
    // impossible. The key embeds the Business id so objects are namespaced by
    // owner and purpose and can be listed by prefix during operations.
    key: text("key").notNull().unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull().$type<"listing_photo">(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    status: text("status").notNull().default("pending").$type<"pending" | "active">(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [
    // Enumeration predicates the deletion workflow depends on: who owns this
    // object, and what does this Business or User own.
    index("media_object_business_id_idx").on(table.businessId),
    index("media_object_owner_id_idx").on(table.ownerId),
    check("media_object_status_check", sql`${table.status} in ('pending', 'active')`),
    check("media_object_purpose_check", sql`${table.purpose} in ('listing_photo')`),
  ]
);
