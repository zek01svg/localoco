import type { BusinessHoursEntry } from "#shared/contracts/business-hours";
import type { SQL } from "drizzle-orm";

import { sql } from "drizzle-orm";

import { businessHours } from "#server/database/business-hours";
import { listing } from "#server/database/listing";
import {
  hourMinuteToMinutes,
  isOpenAt,
  minutesToHourMinute,
  singaporeClock,
} from "#shared/contracts/business-hours";

export { isOpenAt, singaporeClock };

// Server-side filter applied before pagination: matches Listings whose
// Business has a business_hours entry covering the instant `at` in Singapore
// wall-clock time. A 24-hour day covers all minutes [0, 1440); an ordinary
// daytime interval covers [open, close); an overnight interval covers
// [open, 1440) on its opening day and [0, close) on the next day.
export function isOpenNowCondition(at: Date = new Date()): SQL {
  const { day, minute } = singaporeClock(at);
  const prevDay = (day + 6) % 7;

  return sql`exists (
    select 1 from ${businessHours}
    where ${businessHours.businessId} = ${listing.businessId}
      and (
        (
          ${businessHours.day} = ${day}
          and (
            ${businessHours.is24h}
            or (${businessHours.closeMinute} > ${businessHours.openMinute} and ${businessHours.openMinute} <= ${minute} and ${minute} < ${businessHours.closeMinute})
            or (${businessHours.closeMinute} < ${businessHours.openMinute} and ${minute} >= ${businessHours.openMinute})
          )
        )
        or
        (
          ${businessHours.day} = ${prevDay}
          and not ${businessHours.is24h}
          and ${businessHours.closeMinute} < ${businessHours.openMinute}
          and ${minute} < ${businessHours.closeMinute}
        )
      )
  )`;
}

// Data-seam mapping: a business_hours row to its wire entry. The shape
// CHECK in the database guarantees a 24h row has null minutes and a timed
// row has both.
export function hoursRowToEntry(row: {
  day: number;
  is24h: boolean;
  openMinute: number | null;
  closeMinute: number | null;
}): BusinessHoursEntry {
  if (row.is24h) {
    return { day: row.day, is24h: true };
  }
  if (row.openMinute === null || row.closeMinute === null) {
    throw new Error("business_hours row violates the shape constraint");
  }
  return {
    day: row.day,
    is24h: false,
    openTime: minutesToHourMinute(row.openMinute),
    closeTime: minutesToHourMinute(row.closeMinute),
  };
}

// Data-seam mapping: a wire entry to its business_hours row values. The
// schedule schema guarantees a timed entry has both times.
export function entryToHoursRow(entry: BusinessHoursEntry): {
  day: number;
  is24h: boolean;
  openMinute: number | null;
  closeMinute: number | null;
} {
  if (entry.is24h) {
    return { day: entry.day, is24h: true, openMinute: null, closeMinute: null };
  }
  return {
    day: entry.day,
    is24h: false,
    openMinute: hourMinuteToMinutes(entry.openTime),
    closeMinute: hourMinuteToMinutes(entry.closeTime),
  };
}
