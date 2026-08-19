import { describe, expect, it } from "vitest";

import {
  HOURS_DAY_NAMES,
  LISTING_FIELD_DEFS,
  emptyHoursRows,
  hoursError,
  hoursPayload,
  hoursRowsFromEntries,
  listingPayload,
} from "#client/features/businesses/components/listing-form-fields";
import { listingFields } from "#shared/contracts/listings";

const serverField = (name: keyof typeof listingFields) => listingFields[name];

describe("listingPayload", () => {
  it("trims required fields and maps empty optional fields to null", () => {
    const payload = listingPayload({
      name: "  Corner Kopitiam ",
      category: "Food & Beverage",
      address: "1 Boon Lay Drive",
      postalCode: "649902",
      phone: "",
      email: "  ",
      website: "https://cornerkopitiam.sg",
      priceRange: "",
      paymentOptions: ["Cash"],
      hours: emptyHoursRows(),
    });

    expect(payload).toEqual({
      name: "Corner Kopitiam",
      category: "Food & Beverage",
      address: "1 Boon Lay Drive",
      postalCode: "649902",
      phone: null,
      email: null,
      website: "https://cornerkopitiam.sg",
      priceRange: null,
      paymentOptions: ["Cash"],
      hours: [],
    });
  });

  it("sends paymentOptions as null when none are selected", () => {
    const payload = listingPayload({
      name: "Corner Kopitiam",
      category: "Food & Beverage",
      address: "1 Boon Lay Drive",
      postalCode: "649902",
      phone: "",
      email: "",
      website: "",
      priceRange: "",
      paymentOptions: [],
      hours: emptyHoursRows(),
    });

    expect(payload.paymentOptions).toBeNull();
  });
});

describe("opening hours grid", () => {
  it("keeps the seven days in Monday-first order", () => {
    expect(HOURS_DAY_NAMES).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
  });

  it("maps a stored schedule onto the grid, leaving unset days closed", () => {
    const rows = hoursRowsFromEntries([
      { day: 1, is24h: true },
      { day: 2, is24h: false, openTime: "18:00", closeTime: "02:00" },
    ]);
    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual({ day: 0, is24h: false, openTime: "", closeTime: "" });
    expect(rows[1]).toEqual({ day: 1, is24h: true, openTime: "", closeTime: "" });
    expect(rows[2]).toEqual({ day: 2, is24h: false, openTime: "18:00", closeTime: "02:00" });
    expect(rows[6]).toEqual({ day: 6, is24h: false, openTime: "", closeTime: "" });
  });

  it("drops closed days from the payload and keeps 24-hour and overnight days", () => {
    const rows = hoursRowsFromEntries([
      { day: 1, is24h: true },
      { day: 2, is24h: false, openTime: "18:00", closeTime: "02:00" },
    ]);
    expect(hoursPayload(rows)).toEqual([
      { day: 1, is24h: true },
      { day: 2, is24h: false, openTime: "18:00", closeTime: "02:00" },
    ]);
  });

  it("treats a day with no times as closed", () => {
    expect(hoursPayload(emptyHoursRows())).toEqual([]);
  });

  it("flags a day with only one time set", () => {
    const rows = emptyHoursRows();
    rows[0].openTime = "09:00";
    expect(hoursError(rows)).toBe("Monday: enter both an opening and closing time");
  });

  it("flags equal opening and closing times", () => {
    const rows = emptyHoursRows();
    rows[3].openTime = "09:00";
    rows[3].closeTime = "09:00";
    expect(hoursError(rows)).toBe("Thursday: opening and closing times must differ");
  });

  it("flags an overnight interval spilling into the next day's coverage", () => {
    const rows = emptyHoursRows();
    rows[0].openTime = "18:00";
    rows[0].closeTime = "02:00";
    rows[1].openTime = "01:00";
    rows[1].closeTime = "10:00";
    expect(hoursError(rows)).toBe("Tuesday: opening hours overlap the previous day");
  });

  it("accepts two adjacent overnight rows with disjoint coverage", () => {
    // Monday's spill is Tuesday [00:00, 02:00); Tuesday's own-day coverage is
    // [23:00, 24:00), so nothing collides.
    const rows = emptyHoursRows();
    rows[0].openTime = "18:00";
    rows[0].closeTime = "02:00";
    rows[1].openTime = "23:00";
    rows[1].closeTime = "01:00";
    expect(hoursError(rows)).toBeUndefined();
  });

  it("flags an overnight Sunday spilling into a 24-hour Monday", () => {
    const rows = emptyHoursRows();
    rows[6].openTime = "18:00";
    rows[6].closeTime = "02:00";
    rows[0].is24h = true;
    expect(hoursError(rows)).toBe("Monday: opening hours overlap the previous day");
  });

  it("accepts a full week without overlaps", () => {
    const rows = emptyHoursRows();
    rows[0].openTime = "07:00";
    rows[0].closeTime = "19:00";
    rows[1].is24h = true;
    rows[2].openTime = "18:00";
    rows[2].closeTime = "02:00";
    rows[3].openTime = "09:00";
    rows[3].closeTime = "18:00";
    rows[4].openTime = "09:00";
    rows[4].closeTime = "18:00";
    rows[5].openTime = "10:00";
    rows[5].closeTime = "16:00";
    rows[6].openTime = "18:00";
    rows[6].closeTime = "02:00";
    expect(hoursError(rows)).toBeUndefined();
    expect(hoursPayload(rows)).toEqual([
      { day: 0, is24h: false, openTime: "07:00", closeTime: "19:00" },
      { day: 1, is24h: true },
      { day: 2, is24h: false, openTime: "18:00", closeTime: "02:00" },
      { day: 3, is24h: false, openTime: "09:00", closeTime: "18:00" },
      { day: 4, is24h: false, openTime: "09:00", closeTime: "18:00" },
      { day: 5, is24h: false, openTime: "10:00", closeTime: "16:00" },
      { day: 6, is24h: false, openTime: "18:00", closeTime: "02:00" },
    ]);
  });
});

describe("LISTING_FIELD_DEFS", () => {
  it("keeps every text field's max length within its server-side bound", () => {
    for (const def of LISTING_FIELD_DEFS) {
      const schema = serverField(def.name);
      const value =
        def.name === "email" ? "a".repeat(def.maxLength - 5) + "@b.co" : "x".repeat(def.maxLength);
      expect(
        schema.safeParse(value).success,
        `${def.name}: maxLength ${def.maxLength} exceeds the contract`
      ).toBe(true);
    }
  });

  it("requires the same fields the server requires", () => {
    const clientRequired = LISTING_FIELD_DEFS.filter(def => def.required).map(def => def.name);
    const serverRequired = Object.entries(listingFields)
      .filter(([, schema]) => !schema.safeParse(null).success && !schema.safeParse().success)
      .map(([name]) => name);

    expect(clientRequired).toEqual(serverRequired);
  });
});
