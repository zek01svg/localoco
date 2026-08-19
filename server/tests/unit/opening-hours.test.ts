import type { BusinessHoursEntry } from "#shared/contracts/business-hours";

import { describe, expect, it } from "vitest";

import {
  entryToHoursRow,
  hoursRowToEntry,
  isOpenAt,
  singaporeClock,
} from "#server/lib/opening-hours";

// Fixed UTC instants: 2026-08-19 is a Wednesday in Singapore time. SG is
// UTC+8 with no DST, so 16:00:00Z is Thursday 00:00:00 Singapore time.
const WEDNESDAY = "2026-08-19T00:00:00Z";
const THURSDAY_MIDNIGHT_SG = "2026-08-19T16:00:00Z";

const timed = (day: number, openTime: string, closeTime: string): BusinessHoursEntry => ({
  day,
  is24h: false,
  openTime,
  closeTime,
});

describe("singaporeClock", () => {
  it("converts a UTC instant to Singapore day and minute", () => {
    expect(singaporeClock(new Date("2026-08-19T15:59:59Z"))).toEqual({ day: 2, minute: 1439 });
    expect(singaporeClock(new Date("2026-08-19T16:00:00Z"))).toEqual({ day: 3, minute: 0 });
    expect(singaporeClock(new Date("2026-08-19T08:00:00Z"))).toEqual({ day: 2, minute: 960 });
  });
});

describe("isOpenAt", () => {
  it("is closed for a Business with no recorded hours", () => {
    expect(isOpenAt([], new Date(WEDNESDAY))).toBe(false);
  });

  it("is closed on a day with no recorded hours", () => {
    const hours = [timed(2, "09:00", "18:00")];
    expect(isOpenAt(hours, new Date("2026-08-20T00:00:00Z"))).toBe(false);
  });

  it("is open at any instant for a 24-hour day", () => {
    const hours = [{ day: 2, is24h: true } as const];
    expect(isOpenAt(hours, new Date(WEDNESDAY))).toBe(true);
    expect(isOpenAt(hours, new Date("2026-08-19T15:59:59Z"))).toBe(true);
    expect(isOpenAt(hours, new Date("2026-08-19T16:00:00Z"))).toBe(false);
  });

  it("is open inside an ordinary interval and closed at its boundaries", () => {
    const hours = [timed(2, "09:00", "18:00")];
    expect(isOpenAt(hours, new Date("2026-08-19T00:59:59Z"))).toBe(false); // 08:59:59 SG
    expect(isOpenAt(hours, new Date("2026-08-19T01:00:00Z"))).toBe(true); // 09:00:00 SG open
    expect(isOpenAt(hours, new Date("2026-08-19T01:30:00Z"))).toBe(true); // 09:30:00 SG
    expect(isOpenAt(hours, new Date("2026-08-19T10:00:00Z"))).toBe(false); // 18:00:00 SG close
  });

  it("is open across midnight for an overnight interval", () => {
    const hours = [timed(2, "18:00", "02:00")]; // Wednesday 18:00 -> Thursday 02:00
    expect(isOpenAt(hours, new Date("2026-08-19T09:59:59Z"))).toBe(false); // 17:59:59 SG
    expect(isOpenAt(hours, new Date("2026-08-19T10:00:00Z"))).toBe(true); // 18:00:00 SG
    expect(isOpenAt(hours, new Date("2026-08-19T15:59:59Z"))).toBe(true); // 23:59:59 SG
    expect(isOpenAt(hours, new Date("2026-08-19T16:00:00Z"))).toBe(true); // 00:00:00 SG Thu
    expect(isOpenAt(hours, new Date("2026-08-19T17:59:59Z"))).toBe(true); // 01:59:59 SG Thu
    expect(isOpenAt(hours, new Date("2026-08-19T18:00:00Z"))).toBe(false); // 02:00:00 SG Thu
  });

  it("is open on the next day's morning for an overnight interval", () => {
    const hours = [timed(6, "18:00", "02:00")]; // Sunday 18:00 -> Monday 02:00
    expect(isOpenAt(hours, new Date("2026-08-23T17:59:59Z"))).toBe(true); // Mon 01:59:59 SG
    expect(isOpenAt(hours, new Date("2026-08-23T18:00:00Z"))).toBe(false); // Mon 02:00:00 SG
  });

  it("is closed in the morning of an overnight day's own calendar day", () => {
    // Monday 18:00-02:00 covers Monday evening and Tuesday's small hours,
    // not Monday 00:00-01:59.
    const hours = [timed(0, "18:00", "02:00")];
    expect(isOpenAt(hours, new Date("2026-08-16T17:00:00Z"))).toBe(false); // Mon 01:00:00 SG
    expect(isOpenAt(hours, new Date("2026-08-17T09:59:59Z"))).toBe(false); // Mon 17:59:59 SG
    expect(isOpenAt(hours, new Date("2026-08-17T10:00:00Z"))).toBe(true); // Mon 18:00:00 SG
  });

  it("ignores the previous day's row unless it spills into today", () => {
    // Only Wednesday 09:00-18:00 is recorded: Thursday morning belongs to
    // Thursday's own (missing) row, not Wednesday's.
    const hours = [timed(2, "09:00", "18:00")];
    expect(isOpenAt(hours, new Date("2026-08-20T02:00:00Z"))).toBe(false); // Thu 10:00:00 SG
  });

  it("does not let an overnight previous day cover the next day's evening", () => {
    // Sunday 18:00-02:00 spills into Monday's small hours only; Monday
    // evening is covered by Monday's own (missing) row, so it is closed.
    const hours = [timed(6, "18:00", "02:00")];
    expect(isOpenAt(hours, new Date("2026-08-17T10:00:00Z"))).toBe(false); // Mon 18:00:00 SG
  });

  it("is open on the next day's morning from an overnight spill even if today has a later entry", () => {
    // Sunday (6) 18:00-02:00 spills into Monday (0) 00:00-02:00.
    // Monday (0) also has 09:00-18:00.
    const hours = [timed(6, "18:00", "02:00"), timed(0, "09:00", "18:00")];
    // Monday 01:00 SG -> covered by Sunday's spill
    expect(isOpenAt(hours, new Date("2026-08-23T17:00:00Z"))).toBe(true);
    // Monday 05:00 SG -> closed (spill ended at 02:00, Monday hasn't opened)
    expect(isOpenAt(hours, new Date("2026-08-23T21:00:00Z"))).toBe(false);
    // Monday 10:00 SG -> covered by Monday's interval
    expect(isOpenAt(hours, new Date("2026-08-24T02:00:00Z"))).toBe(true);
  });

  it("evaluates in Singapore time regardless of the server's clock", () => {
    // 00:00 UTC is 08:00 SG: the UTC date is still Wednesday, the SG date is
    // the same day, so a Wednesday 08:00-16:00 interval is open.
    const hours = [timed(2, "08:00", "16:00")];
    expect(isOpenAt(hours, new Date(WEDNESDAY))).toBe(true);
    // 16:00 UTC is Thursday 00:00 SG: the same instant is outside the
    // Wednesday interval because Singapore already rolled to Thursday.
    expect(isOpenAt(hours, new Date(THURSDAY_MIDNIGHT_SG))).toBe(false);
  });
});

describe("data-seam mappings", () => {
  it("round-trips a timed entry through its row values", () => {
    const entry = timed(2, "18:00", "02:00");
    expect(hoursRowToEntry(entryToHoursRow(entry))).toEqual(entry);
  });

  it("round-trips a 24h entry through its row values", () => {
    const entry = { day: 6, is24h: true } as const;
    expect(hoursRowToEntry(entryToHoursRow(entry))).toEqual(entry);
  });

  it("maps row minutes to HH:MM wire times", () => {
    expect(hoursRowToEntry({ day: 0, is24h: false, openMinute: 0, closeMinute: 1439 })).toEqual({
      day: 0,
      is24h: false,
      openTime: "00:00",
      closeTime: "23:59",
    });
  });
});
