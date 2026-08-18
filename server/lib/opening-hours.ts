import type { BusinessHoursEntry } from "#shared/contracts/business-hours";

import { hourMinuteToMinutes, minutesToHourMinute } from "#shared/contracts/business-hours";

// The single place a UTC instant becomes Singapore wall-clock time. Singapore
// is UTC+8 year-round with no DST, so the offset is exact arithmetic rather
// than a timezone database lookup. Timestamps are stored in UTC everywhere
// else in the system; this boundary is the only place the wall clock exists.
const SG_OFFSET_MS = 8 * 60 * 60 * 1000;

// The Singapore wall clock of a UTC instant: `day` is 0 = Monday .. 6 =
// Sunday (ISO ordering) and `minute` is minutes since midnight.
export function singaporeClock(at: Date): { day: number; minute: number } {
  const sg = new Date(at.getTime() + SG_OFFSET_MS);
  // getUTC* getters on the shifted instant read Singapore wall-clock values.
  // getUTCDay() is Sunday=0; shift to Monday=0.
  return {
    day: (sg.getUTCDay() + 6) % 7,
    minute: sg.getUTCHours() * 60 + sg.getUTCMinutes(),
  };
}

// True when the Business is open at the instant `at`, in Singapore time.
// A day with no recorded hours is closed: an empty schedule evaluates to
// false rather than to an accidental "open". An overnight interval is stored
// under its opening day and spills into the next day's morning, so the
// previous day's row is consulted too — but only for its spill: the rest of
// the previous day's coverage belongs to the previous day.
export function isOpenAt(entries: BusinessHoursEntry[], at: Date): boolean {
  const { day, minute } = singaporeClock(at);
  const todays = entries.find(entry => entry.day === day);
  if (todays !== undefined) {
    return todayCovers(todays, minute);
  }
  const previous = entries.find(entry => entry.day === (day + 6) % 7);
  if (previous === undefined || previous.is24h) {
    return false;
  }
  const open = hourMinuteToMinutes(previous.openTime);
  const close = hourMinuteToMinutes(previous.closeTime);
  // Overnight only: the spill covers [0, close) of this day.
  return close < open && minute < close;
}

// Coverage of a timed or 24-hour entry on its OWN calendar day. An overnight
// entry covers [open, 1440) of its own day; its morning [0, close) is the
// next day's, evaluated through the spill check above.
function todayCovers(entry: BusinessHoursEntry, minute: number): boolean {
  if (entry.is24h) {
    return true;
  }
  const open = hourMinuteToMinutes(entry.openTime);
  const close = hourMinuteToMinutes(entry.closeTime);
  if (close > open) {
    return open <= minute && minute < close;
  }
  return minute >= open;
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
