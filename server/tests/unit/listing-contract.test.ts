import { describe, expect, it } from "vitest";

import {
  listingAuditRecordSchema,
  listingAuditsResponseSchema,
  listingModerationActionSchema,
  listingStatusSchema,
  ownerListingSchema,
} from "#shared/contracts/listings";

const validListing = {
  id: "lst_1",
  name: "Corner Kopitiam",
  category: "Food & Beverage",
  address: "1 Boon Lay Drive",
  postalCode: "649902",
  latitude: 1.29027,
  longitude: 103.851959,
  phone: null,
  email: null,
  website: null,
  paymentOptions: null,
  priceRange: null,
  hours: [],
};

describe("listingStatusSchema", () => {
  it("accepts all valid lifecycle statuses", () => {
    for (const status of ["draft", "pending_review", "published", "rejected", "suspended"]) {
      expect(listingStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects invalid or legacy statuses", () => {
    for (const invalid of ["active", "archived", "pending", "approved", "DRAFT", ""]) {
      expect(listingStatusSchema.safeParse(invalid).success).toBe(false);
    }
  });
});

describe("ownerListingSchema with moderation fields", () => {
  it("parses owner listing in draft, pending_review, published, rejected, and suspended states", () => {
    for (const status of ["draft", "pending_review", "published", "suspended"] as const) {
      const parsed = ownerListingSchema.parse({
        ...validListing,
        status,
        rejectionReason: null,
      });
      expect(parsed.status).toBe(status);
      expect(parsed.rejectionReason).toBeNull();
    }

    const rejected = ownerListingSchema.parse({
      ...validListing,
      status: "rejected",
      rejectionReason: "Please provide full business name",
    });
    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectionReason).toBe("Please provide full business name");
  });
});

describe("listingModerationActionSchema", () => {
  it("accepts publish, reject, and suspend with a non-empty reason", () => {
    for (const action of ["publish", "reject", "suspend"] as const) {
      const parsed = listingModerationActionSchema.parse({
        action,
        reason: "Valid moderation reason provided",
      });
      expect(parsed.action).toBe(action);
      expect(parsed.reason).toBe("Valid moderation reason provided");
    }
  });

  it("trims whitespace from reason", () => {
    const parsed = listingModerationActionSchema.parse({
      action: "publish",
      reason: "  Approved after review  ",
    });
    expect(parsed.reason).toBe("Approved after review");
  });

  it("rejects empty or whitespace-only reason", () => {
    for (const reason of ["", "   ", "\t\n"]) {
      expect(
        listingModerationActionSchema.safeParse({
          action: "reject",
          reason,
        }).success
      ).toBe(false);
    }
  });

  it("rejects reasons longer than 1000 characters", () => {
    expect(
      listingModerationActionSchema.safeParse({
        action: "reject",
        reason: "a".repeat(1001),
      }).success
    ).toBe(false);
  });

  it("rejects invalid actions", () => {
    for (const action of ["approve", "delete", "archive", ""]) {
      expect(
        listingModerationActionSchema.safeParse({
          action,
          reason: "Some reason",
        }).success
      ).toBe(false);
    }
  });
});

describe("listingAuditRecordSchema and listingAuditsResponseSchema", () => {
  it("parses valid audit record and response envelope", () => {
    const record = {
      id: "aud_1",
      listingId: "lst_1",
      actorId: "usr_admin",
      previousStatus: "pending_review",
      nextStatus: "published",
      reason: "Verified business address and credentials",
      createdAt: new Date(),
    };

    const parsed = listingAuditRecordSchema.parse(record);
    expect(parsed.id).toBe("aud_1");
    expect(parsed.previousStatus).toBe("pending_review");
    expect(parsed.nextStatus).toBe("published");
    expect(parsed.createdAt).toBeInstanceOf(Date);

    const response = listingAuditsResponseSchema.parse({
      items: [record],
    });
    expect(response.items).toHaveLength(1);
    expect(response.items[0].id).toBe("aud_1");
  });
});
