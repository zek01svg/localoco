import { describe, expect, it } from "vitest";

import {
  formatCompactNumber,
  formatDate,
  formatLatency,
  formatMilliseconds,
} from "#client/lib/format";

describe("formatLatency", () => {
  it("formats latencies below 1000ms with ms suffix", () => {
    expect(formatLatency(50)).toBe("50ms");
    expect(formatLatency(0.5)).toBe("0.5ms");
    expect(formatLatency(123.456)).toBe("123.456ms");
  });

  it("formats latencies of 1000ms and above in seconds with s suffix", () => {
    expect(formatLatency(1000)).toBe("1.0s");
    expect(formatLatency(2500)).toBe("2.5s");
    expect(formatLatency(15200)).toBe("15.2s");
  });
});

describe("formatMilliseconds", () => {
  it("formats numeric millisecond values up to 3 decimal places", () => {
    expect(formatMilliseconds(42)).toBe("42");
    expect(formatMilliseconds(12.3456)).toBe("12.346");
    expect(formatMilliseconds(0)).toBe("0");
  });
});

describe("formatDate", () => {
  it("formats Date instance or ISO string in LLL dd, y HH:mm format", () => {
    const date = new Date(2026, 1, 15, 14, 30);
    expect(formatDate(date)).toMatch(/Feb 15, 2026 14:30/u);
  });
});

describe("formatCompactNumber", () => {
  it("returns numbers below 100 as strings", () => {
    expect(formatCompactNumber(0)).toBe("0");
    expect(formatCompactNumber(42)).toBe("42");
    expect(formatCompactNumber(99)).toBe("99");
  });

  it("returns hundreds as raw strings", () => {
    expect(formatCompactNumber(100)).toBe("100");
    expect(formatCompactNumber(999)).toBe("999");
  });

  it("formats thousands with k suffix", () => {
    expect(formatCompactNumber(1000)).toBe("1.0k");
    expect(formatCompactNumber(2500)).toBe("2.5k");
    expect(formatCompactNumber(999999)).toBe("1000.0k");
  });

  it("formats millions with M suffix", () => {
    expect(formatCompactNumber(1000000)).toBe("1.0M");
    expect(formatCompactNumber(5400000)).toBe("5.4M");
  });
});
