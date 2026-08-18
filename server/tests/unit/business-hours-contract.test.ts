import type { BusinessHoursEntry } from "#shared/contracts/business-hours";

import { describe, expect, it } from "vitest";

import {
  businessHoursEntrySchema,
  businessHoursScheduleSchema,
  hourMinuteToMinutes,
  minutesToHourMinute,
  overlappingHours,
} from "#shared/contracts/business-hours";

const timed = (day: number, openTime: string, closeTime: string): BusinessHoursEntry => ({
  day,
  is24h: false,
  openTime,
  closeTime,
});

const allDay = (day: number): BusinessHoursEntry => ({ day, is24h: true });

describe("businessHoursEntrySchema", () => {
  it("accepts a timed entry and a 24-hour entry", () => {
    expect(businessHoursEntrySchema.safeParse(timed(0, "09:00", "18:00")).success).toBe(true);
    expect(businessHoursEntrySchema.safeParse(allDay(0)).success).toBe(true);
  });

  it("rejects days outside 0..6 and malformed times", () => {
    for (const bad of [
      { day: -1, is24h: false, openTime: "09:00", closeTime: "18:00" },
      { day: 7, is24h: false, openTime: "09:00", closeTime: "18:00" },
      { day: 0, is24h: false, openTime: "9:00", closeTime: "18:00" },
      { day: 0, is24h: false, openTime: "24:00", closeTime: "18:00" },
      { day: 0, is24h: false, openTime: "09:60", closeTime: "18:00" },
    ]) {
      expect(businessHoursEntrySchema.safeParse(bad).success).toBe(false);
    }
  });

  it("rejects an interval whose open and close times are equal", () => {
    expect(businessHoursEntrySchema.safeParse(timed(0, "18:00", "18:00")).success).toBe(false);
  });
});

describe("minute conversions", () => {
  it("converts HH:MM to minutes since midnight", () => {
    expect(hourMinuteToMinutes("00:00")).toBe(0);
    expect(hourMinuteToMinutes("09:30")).toBe(570);
    expect(hourMinuteToMinutes("18:00")).toBe(1080);
    expect(hourMinuteToMinutes("23:59")).toBe(1439);
  });

  it("converts minutes since midnight to HH:MM", () => {
    expect(minutesToHourMinute(0)).toBe("00:00");
    expect(minutesToHourMinute(570)).toBe("09:30");
    expect(minutesToHourMinute(1439)).toBe("23:59");
  });
});

describe("overlappingHours", () => {
  it("never conflicts an earlier day that is 24 hours (it covers only its own day)", () => {
    expect(overlappingHours(allDay(0), timed(1, "09:00", "18:00"))).toBe(false);
    expect(overlappingHours(allDay(0), allDay(1))).toBe(false);
  });

  it("conflicts an overnight spill into a 24-hour later day", () => {
    expect(overlappingHours(timed(0, "18:00", "02:00"), allDay(1))).toBe(true);
  });

  it("conflicts an overnight spill with a normal later interval it reaches into", () => {
    expect(overlappingHours(timed(0, "18:00", "02:00"), timed(1, "01:00", "10:00"))).toBe(true);
    expect(overlappingHours(timed(0, "18:00", "02:00"), timed(1, "03:00", "10:00"))).toBe(false);
  });

  it("conflicts two overnight rows sharing the morning", () => {
    expect(overlappingHours(timed(0, "18:00", "04:00"), timed(1, "02:00", "10:00"))).toBe(true);
  });

  it("does not conflict when an overnight row closes exactly at midnight", () => {
    expect(overlappingHours(timed(0, "18:00", "00:00"), timed(1, "09:00", "18:00"))).toBe(false);
  });

  it("does not conflict when the spill stops exactly at the later open", () => {
    expect(overlappingHours(timed(0, "18:00", "02:00"), timed(1, "02:00", "10:00"))).toBe(false);
    expect(overlappingHours(timed(0, "18:00", "02:00"), timed(1, "01:59", "10:00"))).toBe(true);
  });

  it("does not conflict two overnight rows on adjacent days with disjoint coverage", () => {
    // Monday's spill is Tuesday [00:00, 02:00); Tuesday's own-day coverage is
    // [23:00, 24:00). Tuesday's morning [00:00, 01:00) belongs to Wednesday,
    // so it is not a collision surface here.
    expect(overlappingHours(timed(0, "18:00", "02:00"), timed(1, "23:00", "01:00"))).toBe(false);
  });

  it("ignores a non-overnight earlier day", () => {
    expect(overlappingHours(timed(0, "09:00", "18:00"), timed(1, "00:00", "02:00"))).toBe(false);
  });
});

describe("businessHoursScheduleSchema", () => {
  it("accepts a full week and an empty schedule", () => {
    const fullWeek = [0, 1, 2, 3, 4, 5, 6].map(day => timed(day, "09:00", "18:00"));
    expect(businessHoursScheduleSchema.safeParse(fullWeek).success).toBe(true);
    expect(businessHoursScheduleSchema.safeParse([]).success).toBe(true);
  });

  it("accepts adjacent 24-hour days", () => {
    expect(businessHoursScheduleSchema.safeParse([allDay(0), allDay(1)]).success).toBe(true);
  });

  it("rejects duplicate day rows", () => {
    expect(
      businessHoursScheduleSchema.safeParse([
        timed(0, "09:00", "18:00"),
        timed(0, "10:00", "16:00"),
      ]).success
    ).toBe(false);
  });

  it("rejects overlapping adjacent days", () => {
    expect(
      businessHoursScheduleSchema.safeParse([
        timed(0, "18:00", "02:00"),
        timed(1, "01:00", "10:00"),
      ]).success
    ).toBe(false);
  });

  it("rejects an overnight Sunday spilling into Monday", () => {
    expect(
      businessHoursScheduleSchema.safeParse([
        timed(0, "01:00", "10:00"),
        timed(6, "18:00", "02:00"),
      ]).success
    ).toBe(false);
  });

  it("accepts an overnight Sunday that closes before Monday's interval opens", () => {
    expect(
      businessHoursScheduleSchema.safeParse([
        timed(0, "09:00", "18:00"),
        timed(6, "18:00", "02:00"),
      ]).success
    ).toBe(true);
  });

  it("rejects a 24-hour day preceded by an overnight day", () => {
    expect(
      businessHoursScheduleSchema.safeParse([timed(0, "18:00", "02:00"), allDay(1)]).success
    ).toBe(false);
  });

  it("accepts non-overlapping Monday and Thursday rows", () => {
    expect(
      businessHoursScheduleSchema.safeParse([
        timed(0, "09:00", "18:00"),
        timed(3, "10:00", "16:00"),
      ]).success
    ).toBe(true);
  });

  it("accepts two overnight rows on adjacent days with disjoint coverage", () => {
    expect(
      businessHoursScheduleSchema.safeParse([
        timed(0, "18:00", "02:00"),
        timed(1, "23:00", "01:00"),
      ]).success
    ).toBe(true);
  });
});
