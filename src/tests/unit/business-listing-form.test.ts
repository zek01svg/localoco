import { describe, expect, it } from "vitest";

import {
  LISTING_FIELD_DEFS,
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
    });

    expect(payload.paymentOptions).toBeNull();
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
      .filter(([, schema]) => !schema.isNullable() && !schema.isOptional())
      .map(([name]) => name);

    expect(clientRequired).toEqual(serverRequired);
  });
});
