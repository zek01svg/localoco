import { sql } from "drizzle-orm";
import { boolean, check, pgTable, smallint, text, uniqueIndex } from "drizzle-orm/pg-core";

import { business } from "./business";

import { randomUUID } from "node:crypto";

// Per-day opening hours of a Business, one row per day (0 = Monday ..
// 6 = Sunday). Minutes since midnight, timezone-free by design: timestamps
// stay UTC system-wide and Singapore time is applied only when evaluating.
// A 24-hour day is explicit (`is_24h` with null minutes) rather than a
// subtly wrong 00:00-23:59 interval. Overnight intervals have
// close_minute < open_minute and spill into the next calendar day; the
// overlap trigger in migration 0005 rejects schedules where a spill reaches
// into the next day's coverage.
export const businessHours = pgTable(
  "business_hours",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    day: smallint("day").notNull(),
    is24h: boolean("is_24h").notNull().default(false),
    openMinute: smallint("open_minute"),
    closeMinute: smallint("close_minute"),
  },
  table => [
    uniqueIndex("business_hours_business_day_unique").on(table.businessId, table.day),
    check("business_hours_day_range_check", sql`${table.day} between 0 and 6`),
    check(
      "business_hours_minute_range_check",
      sql`(${table.openMinute} is null or ${table.openMinute} between 0 and 1439) and (${table.closeMinute} is null or ${table.closeMinute} between 0 and 1439)`
    ),
    // Either a 24-hour day with no times, or a timed day with both times and
    // a non-zero interval. Nothing else is a valid row.
    check(
      "business_hours_shape_check",
      sql`(${table.is24h} and ${table.openMinute} is null and ${table.closeMinute} is null)
        or (not ${table.is24h} and ${table.openMinute} is not null and ${table.closeMinute} is not null and ${table.openMinute} <> ${table.closeMinute})`
    ),
  ]
);
