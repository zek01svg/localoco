import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { randomUUID } from "node:crypto";

export const listing = pgTable("listing", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  category: text("category").notNull(),
  address: text("address").notNull(),
  postalCode: text("postal_code").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});
