import { describe, expect, it } from "vitest";

import { DEFAULT_RELEASE, resolveRelease } from "#shared/release.ts";

describe("release identifier resolution", () => {
  it("has a canonical default release format", () => {
    expect(DEFAULT_RELEASE).toBe("localoco@2.2.0");
  });

  it("uses default release name when none is provided or whitespace only", () => {
    expect(resolveRelease()).toBe(DEFAULT_RELEASE);
    expect(resolveRelease("")).toBe(DEFAULT_RELEASE);
    expect(resolveRelease("   ")).toBe(DEFAULT_RELEASE);
  });

  it("uses explicit release identifier and trims whitespace", () => {
    expect(resolveRelease("localoco@2.1.0+sha-abcdef1")).toBe("localoco@2.1.0+sha-abcdef1");
    expect(resolveRelease("  localoco@2.1.0+sha-1234567  ")).toBe("localoco@2.1.0+sha-1234567");
  });
});
