import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { business } from "./business";

export const bookmark = pgTable(
  "bookmark",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  table => [
    unique("bookmark_user_business_unique").on(table.userId, table.businessId),
    index("bookmark_user_id_idx").on(table.userId),
  ]
);
