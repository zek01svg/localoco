import type { AuthContext } from "#server/lib/auth-middleware";

import { eq, exists, or, sql } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";

import { randomUUID } from "node:crypto";

export const business = pgTable("business", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  uen: varchar("uen", { length: 10 }).notNull().unique(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const administrator = pgTable("administrator", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

/**
 * The ownership predicate for Business resources: the actor owns the Business
 * or is an administrator. Evaluated by the database at the mutation boundary,
 * not just by an earlier read.
 */
export const ownedBy = (actor: AuthContext) =>
  or(
    eq(business.ownerId, actor.userId),
    exists(sql`(select 1 from ${administrator} where ${administrator.userId} = ${actor.userId})`)
  );
