import { describe, expect, it } from "vitest";

import {
  emailChangeSchema,
  privateProfileSchema,
  profileUpdateSchema,
  publicProfileSchema,
} from "#shared/contracts/profiles";

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

describe("privateProfileSchema", () => {
  it("carries the private account fields the public contract structurally lacks", () => {
    const parsed = privateProfileSchema.parse({
      id: "usr_123",
      displayName: "Alice Tan",
      avatarUrl: "https://cdn.example.com/alice.png",
      email: "alice@example.com",
      emailVerified: true,
      createdAt: "2026-08-01T00:00:00.000Z",
    });

    expect(parsed).toEqual({
      id: "usr_123",
      displayName: "Alice Tan",
      avatarUrl: "https://cdn.example.com/alice.png",
      email: "alice@example.com",
      emailVerified: true,
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
    });
  });

  it("strips unknown columns so an accidental leak can never pass the boundary", () => {
    const parsed = privateProfileSchema.parse({
      id: "usr_123",
      displayName: "Alice Tan",
      avatarUrl: null,
      email: "alice@example.com",
      emailVerified: true,
      createdAt: "2026-08-01T00:00:00.000Z",
      passwordHash: "do-not-leak",
    });

    expect(parsed).not.toHaveProperty("passwordHash");
  });
});

describe("profileUpdateSchema", () => {
  it("accepts displayName, avatarUrl, or both", () => {
    expect(profileUpdateSchema.parse({ displayName: "Alice" })).toEqual({
      displayName: "Alice",
    });
    expect(profileUpdateSchema.parse({ avatarUrl: null })).toEqual({
      avatarUrl: null,
    });
    expect(
      profileUpdateSchema.parse({
        displayName: "Alice",
        avatarUrl: "https://cdn.example.com/a.png",
      })
    ).toEqual({
      displayName: "Alice",
      avatarUrl: "https://cdn.example.com/a.png",
    });
  });

  it("strips client-supplied identifiers: a body identifier is data, never a subject", () => {
    const parsed = profileUpdateSchema.parse({
      displayName: "Alice",
      id: "usr_other",
      userId: "usr_other",
    });

    expect(parsed).toEqual({ displayName: "Alice" });
  });

  it("rejects an empty update", () => {
    const result = profileUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a blank displayName and a non-URL avatarUrl", () => {
    expect(profileUpdateSchema.safeParse({ displayName: "   " }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ avatarUrl: "not-a-url" }).success).toBe(false);
  });
});

describe("emailChangeSchema", () => {
  it("accepts a valid email and strips identifiers", () => {
    expect(emailChangeSchema.parse({ email: "new@example.com", id: "usr_other" })).toEqual({
      email: "new@example.com",
    });
  });

  it("rejects an invalid email", () => {
    expect(emailChangeSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});
