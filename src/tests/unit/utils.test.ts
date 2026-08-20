import { renderHook } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { composeRefs, useComposedRefs } from "#client/lib/compose-refs";
import {
  isArrayOfBooleans,
  isArrayOfDates,
  isArrayOfNumbers,
  isArrayOfStrings,
} from "#client/lib/is-array";
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

describe("is-array predicates", () => {
  describe("isArrayOfNumbers", () => {
    it("returns true for number arrays", () => {
      expect(isArrayOfNumbers([1, 2, 3])).toBe(true);
      expect(isArrayOfNumbers([])).toBe(true);
    });

    it("returns false for non-arrays or arrays with non-numbers", () => {
      expect(isArrayOfNumbers(null)).toBe(false);
      expect(isArrayOfNumbers([1, "2", 3])).toBe(false);
      expect(isArrayOfNumbers("123")).toBe(false);
    });
  });

  describe("isArrayOfDates", () => {
    it("returns true for Date arrays", () => {
      expect(isArrayOfDates([new Date(), new Date()])).toBe(true);
      expect(isArrayOfDates([])).toBe(true);
    });

    it("returns false for non-arrays or arrays with non-dates", () => {
      expect(isArrayOfDates(null)).toBe(false);
      expect(isArrayOfDates([new Date(), "2026-01-01"])).toBe(false);
    });
  });

  describe("isArrayOfStrings", () => {
    it("returns true for string arrays", () => {
      expect(isArrayOfStrings(["a", "b", "c"])).toBe(true);
      expect(isArrayOfStrings([])).toBe(true);
    });

    it("returns false for non-arrays or arrays with non-strings", () => {
      expect(isArrayOfStrings(null)).toBe(false);
      expect(isArrayOfStrings(["a", 1, "c"])).toBe(false);
    });
  });

  describe("isArrayOfBooleans", () => {
    it("returns true for boolean arrays", () => {
      expect(isArrayOfBooleans([true, false, true])).toBe(true);
      expect(isArrayOfBooleans([])).toBe(true);
    });

    it("returns false for non-arrays or arrays with non-booleans", () => {
      expect(isArrayOfBooleans({})).toBe(false);
      expect(isArrayOfBooleans([true, 0, false])).toBe(false);
    });
  });
});

describe("composeRefs", () => {
  it("sets both function callbacks and RefObject refs with the node value", () => {
    const fnRef = vi.fn<(_node: HTMLDivElement | null) => void>();
    const objRef: { current: HTMLDivElement | null } = { current: null };

    const composed = composeRefs(fnRef, objRef);
    const mockNode = document.createElement("div");

    composed(mockNode);

    expect(fnRef).toHaveBeenCalledWith(mockNode);
    expect(objRef.current).toBe(mockNode);
  });

  it("handles null and undefined refs safely", () => {
    const fnRef = vi.fn<(_node: unknown) => void>();
    const composed = composeRefs(fnRef, null);
    const mockNode = document.createElement("button");

    expect(() => {
      composed(mockNode);
    }).not.toThrow();

    expect(fnRef).toHaveBeenCalledWith(mockNode);
  });

  it("useComposedRefs returns a stable callback ref", () => {
    const ref1 = React.createRef<HTMLDivElement>();
    const ref2 = React.createRef<HTMLDivElement>();

    const { result } = renderHook(() => useComposedRefs(ref1, ref2));
    const mockNode = document.createElement("div");

    result.current(mockNode);

    expect(ref1.current).toBe(mockNode);
    expect(ref2.current).toBe(mockNode);
  });
});
