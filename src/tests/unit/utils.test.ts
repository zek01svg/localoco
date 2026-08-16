import { describe, expect, it } from "vitest";

import { cn } from "#client/lib/utils";

describe("cn utility", () => {
  it("merges class names correctly", () => {
    const result = cn("text-red-500", "bg-blue-500");
    expect(result).toBe("text-red-500 bg-blue-500");
  });

  it("handles falsy values", () => {
    const result = cn("base-class", null, undefined, "active");
    expect(result).toBe("base-class active");
  });

  it("resolves tailwind class conflicts", () => {
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });
});
