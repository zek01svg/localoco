import { describe, expect, it } from "vitest";

import {
  accountDeletionResponseSchema,
  accountDeletionSchema,
  deletionPreviewSchema,
} from "#shared/contracts/profiles";

describe("deletionPreviewSchema", () => {
  it("accepts valid non-negative counts for all required preview fields", () => {
    const data = {
      ownedListings: 2,
      authoredContributions: 15,
      affectedForumPosts: 4,
      thirdPartyReplies: 7,
    };

    const parsed = deletionPreviewSchema.parse(data);
    expect(parsed).toEqual(data);
  });

  it("accepts zero counts for a fresh User", () => {
    const data = {
      ownedListings: 0,
      authoredContributions: 0,
      affectedForumPosts: 0,
      thirdPartyReplies: 0,
    };

    expect(deletionPreviewSchema.parse(data)).toEqual(data);
  });

  it("rejects negative counts", () => {
    expect(
      deletionPreviewSchema.safeParse({
        ownedListings: -1,
        authoredContributions: 0,
        affectedForumPosts: 0,
        thirdPartyReplies: 0,
      }).success
    ).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(
      deletionPreviewSchema.safeParse({
        ownedListings: 1,
        authoredContributions: 5,
      }).success
    ).toBe(false);
  });
});

describe("accountDeletionSchema", () => {
  it("accepts a non-empty password and exact confirmation string 'DELETE'", () => {
    const data = {
      password: "SuperSecretPassword123!",
      confirmation: "DELETE",
    };

    const parsed = accountDeletionSchema.parse(data);
    expect(parsed).toEqual(data);
  });

  it("rejects when confirmation is not 'DELETE' (e.g. lowercase 'delete', 'yes', 'CONFIRM')", () => {
    expect(
      accountDeletionSchema.safeParse({
        password: "SuperSecretPassword123!",
        confirmation: "delete",
      }).success
    ).toBe(false);

    expect(
      accountDeletionSchema.safeParse({
        password: "SuperSecretPassword123!",
        confirmation: "CONFIRM",
      }).success
    ).toBe(false);
  });

  it("rejects when password is empty or missing", () => {
    expect(
      accountDeletionSchema.safeParse({
        password: "",
        confirmation: "DELETE",
      }).success
    ).toBe(false);

    expect(
      accountDeletionSchema.safeParse({
        confirmation: "DELETE",
      }).success
    ).toBe(false);
  });
});

describe("accountDeletionResponseSchema", () => {
  it("parses account deletion response and coerces deletedAt to Date", () => {
    const now = new Date();
    const parsed = accountDeletionResponseSchema.parse({
      status: "account_deleted",
      deletedAt: now.toISOString(),
    });

    expect(parsed.status).toBe("account_deleted");
    expect(parsed.deletedAt).toBeInstanceOf(Date);
    expect(parsed.deletedAt.getTime()).toBe(now.getTime());
  });
});
