import { describe, expect, it } from "vitest";

import {
  businessCreateSchema,
  businessCreationResponseSchema,
  ownershipTransferSchema,
  uenField,
} from "#shared/contracts/business";
import {
  listingFields,
  ownerListingSchema,
  ownerListingUpdateSchema,
} from "#shared/contracts/listings";

const validListing = {
  name: "Corner Kopitiam",
  category: "Food & Beverage",
  address: "1 Boon Lay Drive",
  postalCode: "649902",
};

describe("uenField", () => {
  it("accepts 8-digit, 9-digit, and T-prefixed UENs", () => {
    for (const uen of ["201800111A", "531234567X", "T12LL1234A"]) {
      expect(uenField.safeParse(uen).success).toBe(true);
    }
  });

  it("normalizes case and surrounding whitespace before validating", () => {
    expect(uenField.parse(" 201800111a ")).toBe("201800111A");
  });

  it("rejects malformed UENs, including internal whitespace", () => {
    for (const bad of [
      "201800111",
      "201800111AA",
      "T12L1234A",
      "T12LL12345",
      "2018 00111A",
      "1234",
      "201800111!",
      "",
    ]) {
      expect(uenField.safeParse(bad).success).toBe(false);
    }
  });
});

describe("businessCreateSchema", () => {
  it("accepts a UEN with listing fields and normalizes the UEN", () => {
    const parsed = businessCreateSchema.parse({
      uen: " 201800111a ",
      listing: { ...validListing, phone: "61234567" },
    });

    expect(parsed.uen).toBe("201800111A");
    expect(parsed.listing.phone).toBe("61234567");
  });

  it("drops client-supplied owner identifiers", () => {
    const parsed = businessCreateSchema.parse({
      uen: "201800111A",
      ownerId: "usr_attacker",
      listing: { ...validListing, businessId: "biz_attacker" },
    });

    expect(parsed).not.toHaveProperty("ownerId");
    expect(parsed.listing).not.toHaveProperty("businessId");
  });

  it("strips client-supplied coordinates; they are derived server-side only", () => {
    const parsed = businessCreateSchema.parse({
      uen: "201800111A",
      listing: { ...validListing, latitude: 9.9, longitude: 9.9 },
    });

    expect(parsed.listing).not.toHaveProperty("latitude");
    expect(parsed.listing).not.toHaveProperty("longitude");
    const update = ownerListingUpdateSchema.parse({ latitude: 9.9, longitude: 9.9 });
    expect(update).not.toHaveProperty("latitude");
    expect(update).not.toHaveProperty("longitude");
  });
});

describe("ownerListingUpdateSchema", () => {
  it("clears an optional field with null", () => {
    const cleared = ownerListingUpdateSchema.parse({ website: null });
    expect(cleared.website).toBeNull();
  });

  it("normalizes an empty string to null, so every clear lands as SQL NULL", () => {
    const cleared = ownerListingUpdateSchema.parse({ website: "", phone: "" });
    expect(cleared.website).toBeNull();
    expect(cleared.phone).toBeNull();
  });

  it("leaves fields that were not sent untouched", () => {
    const partial = ownerListingUpdateSchema.parse({ priceRange: "$5-$15" });
    expect(partial).not.toHaveProperty("website");
  });

  it("rejects empty strings for formatted optional fields — null is the way to clear", () => {
    expect(ownerListingUpdateSchema.safeParse({ email: "" }).success).toBe(false);
  });

  it("rejects an empty required field and over-bounds values", () => {
    expect(ownerListingUpdateSchema.safeParse({ name: "" }).success).toBe(false);
    expect(ownerListingUpdateSchema.safeParse({ name: "x".repeat(201) }).success).toBe(false);
    expect(
      ownerListingUpdateSchema.safeParse({
        paymentOptions: Array.from({ length: 9 }, (_, i) => `Option ${i}`),
      }).success
    ).toBe(false);
  });
});

describe("ownerListingSchema (server -> client)", () => {
  it("accepts never-set optionals as null, as the database returns them", () => {
    const parsed = ownerListingSchema.parse({
      id: "biz_1",
      ...validListing,
      status: "draft",
      latitude: null,
      longitude: null,
      phone: null,
      email: null,
      website: null,
      paymentOptions: null,
      priceRange: null,
      hours: [],
    });

    expect(parsed.phone).toBeNull();
    expect(parsed.email).toBeNull();
    expect(parsed.website).toBeNull();
    expect(parsed.priceRange).toBeNull();
    expect(parsed.paymentOptions).toBeNull();
  });
});

describe("ownershipTransferSchema", () => {
  it("accepts a target owner with a non-empty reason and trims the reason", () => {
    const parsed = ownershipTransferSchema.parse({
      ownerId: "usr_target",
      reason: "  Owner requested the transfer.  ",
    });
    expect(parsed.ownerId).toBe("usr_target");
    expect(parsed.reason).toBe("Owner requested the transfer.");
  });

  it("rejects missing, empty, or over-bounds ownerId", () => {
    expect(ownershipTransferSchema.safeParse({ reason: "x" }).success).toBe(false);
    expect(ownershipTransferSchema.safeParse({ ownerId: "", reason: "x" }).success).toBe(false);
    expect(
      ownershipTransferSchema.safeParse({ ownerId: "x".repeat(257), reason: "x" }).success
    ).toBe(false);
  });

  it("rejects empty or over-long reasons", () => {
    for (const reason of ["", "   ", "\t\n"]) {
      expect(ownershipTransferSchema.safeParse({ ownerId: "u", reason }).success).toBe(false);
    }
    expect(
      ownershipTransferSchema.safeParse({ ownerId: "u", reason: "a".repeat(1001) }).success
    ).toBe(false);
  });
});

describe("businessCreationResponseSchema", () => {
  it("returns the owner listing in the creation response", () => {
    const parsed = businessCreationResponseSchema.parse({
      id: "biz_1",
      uen: "201800111A",
      listing: {
        id: "lst_1",
        ...validListing,
        status: "draft",
        description: null,
        latitude: null,
        longitude: null,
        phone: null,
        email: null,
        website: null,
        paymentOptions: null,
        priceRange: null,
        hours: [],
      },
    });

    expect(parsed.listing.status).toBe("draft");
    expect(Object.keys(parsed.listing).toSorted()).toEqual(
      Object.keys(listingFields)
        .concat(["id", "status", "hours", "latitude", "longitude"])
        .toSorted()
    );
  });
});
