import { describe, expect, it } from "vitest";

import { publicProfileSchema } from "#shared/contracts/profiles";

describe("publicProfileSchema", () => {
  it("keeps only id, displayName, and avatarUrl — private fields are structurally absent", () => {
    const parsed = publicProfileSchema.parse({
      id: "usr_123",
      displayName: "Alice Tan",
      avatarUrl: "https://cdn.example.com/alice.png",
      email: "alice@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(parsed).toEqual({
      id: "usr_123",
      displayName: "Alice Tan",
      avatarUrl: "https://cdn.example.com/alice.png",
    });
  });

  it("accepts a null avatar for a User who never set one", () => {
    const parsed = publicProfileSchema.parse({
      id: "usr_123",
      displayName: "Alice Tan",
      avatarUrl: null,
    });

    expect(parsed.avatarUrl).toBeNull();
  });
});
