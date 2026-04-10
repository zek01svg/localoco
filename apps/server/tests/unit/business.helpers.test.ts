import { describe, it, expect } from "vitest";

import {
  _hydrate,
  _buildFilterConditions,
} from "../../routes/business/helpers";

describe("_hydrate", () => {
  const baseRaw = {
    uen: "UEN123",
    businessName: "Test Cafe",
    businessReviews: [],
    businessOpeningHours: [],
    businessPaymentOptions: [],
  };

  it("computes avgRating as 0 when no reviews", () => {
    const result = _hydrate(baseRaw);
    expect(result.avgRating).toBe(0);
  });

  it("computes avgRating correctly across multiple reviews", () => {
    const raw = {
      ...baseRaw,
      businessReviews: [
        { rating: 4, user: { name: "Alice", image: "a.png" } },
        { rating: 2, user: { name: "Bob", image: "b.png" } },
      ],
    };
    const result = _hydrate(raw);
    expect(result.avgRating).toBe(3);
  });

  it("falls back to 'Anonymous' when reviewer has no name", () => {
    const raw = {
      ...baseRaw,
      businessReviews: [{ rating: 5, user: null }],
    };
    const result = _hydrate(raw);
    expect(result.reviews[0].userName).toBe("Anonymous");
  });

  it("falls back to empty string for reviewer image", () => {
    const raw = {
      ...baseRaw,
      businessReviews: [{ rating: 5, user: { name: "Alice", image: null } }],
    };
    const result = _hydrate(raw);
    expect(result.reviews[0].userImage).toBe("");
  });

  it("maps openingHours by dayOfWeek", () => {
    const raw = {
      ...baseRaw,
      businessOpeningHours: [
        { dayOfWeek: "Monday", openTime: "08:00", closeTime: "18:00" },
        { dayOfWeek: "Sunday", openTime: "09:00", closeTime: "17:00" },
      ],
    };
    const result = _hydrate(raw);
    expect(result.openingHours["Monday"]).toEqual({
      open: "08:00",
      close: "18:00",
    });
    expect(result.openingHours["Sunday"]).toEqual({
      open: "09:00",
      close: "17:00",
    });
  });

  it("maps paymentOptions from businessPaymentOptions", () => {
    const raw = {
      ...baseRaw,
      businessPaymentOptions: [
        { paymentOption: "cash" },
        { paymentOption: "card" },
      ],
    };
    const result = _hydrate(raw);
    expect(result.paymentOptions).toEqual(["cash", "card"]);
  });
});

describe("_buildFilterConditions", () => {
  it("returns empty array for empty filters", () => {
    const result = _buildFilterConditions({} as any);
    expect(result).toEqual([]);
  });

  it("adds search_query condition", () => {
    const result = _buildFilterConditions({ search_query: "coffee" } as any);
    expect(result).toHaveLength(1);
  });

  it("adds price_tier condition for single string value", () => {
    const result = _buildFilterConditions({ price_tier: "low" } as any);
    expect(result).toHaveLength(1);
  });

  it("adds price_tier condition for array value", () => {
    const result = _buildFilterConditions({
      price_tier: ["low", "mid"],
    } as any);
    expect(result).toHaveLength(1);
  });

  it("skips price_tier for empty array", () => {
    const result = _buildFilterConditions({ price_tier: [] } as any);
    expect(result).toHaveLength(0);
  });

  it("adds business_category condition for string", () => {
    const result = _buildFilterConditions({ business_category: "F&B" } as any);
    expect(result).toHaveLength(1);
  });

  it("adds business_category condition for array", () => {
    const result = _buildFilterConditions({
      business_category: ["F&B", "Retail"],
    } as any);
    expect(result).toHaveLength(1);
  });

  it("skips business_category for empty array", () => {
    const result = _buildFilterConditions({ business_category: [] } as any);
    expect(result).toHaveLength(0);
  });

  it("adds newly_added condition", () => {
    const result = _buildFilterConditions({ newly_added: true } as any);
    expect(result).toHaveLength(1);
  });

  it("adds open247 condition", () => {
    const result = _buildFilterConditions({ open247: true } as any);
    expect(result).toHaveLength(1);
  });

  it("adds offers_delivery condition", () => {
    const result = _buildFilterConditions({ offers_delivery: true } as any);
    expect(result).toHaveLength(1);
  });

  it("adds offers_pickup condition", () => {
    const result = _buildFilterConditions({ offers_pickup: true } as any);
    expect(result).toHaveLength(1);
  });

  it("adds payment_options condition for non-empty array", () => {
    const result = _buildFilterConditions({
      payment_options: ["cash", "card"],
    } as any);
    expect(result).toHaveLength(1);
  });

  it("skips payment_options for empty array", () => {
    const result = _buildFilterConditions({ payment_options: [] } as any);
    expect(result).toHaveLength(0);
  });

  it("accumulates multiple conditions", () => {
    const result = _buildFilterConditions({
      search_query: "cafe",
      price_tier: "low",
      open247: true,
      offers_delivery: true,
    } as any);
    expect(result).toHaveLength(4);
  });
});
