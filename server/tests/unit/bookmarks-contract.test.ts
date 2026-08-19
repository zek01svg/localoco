import { describe, expect, it } from "vitest";

import {
  bookmarkActionResponseSchema,
  bookmarkCreateSchema,
  bookmarkItemSchema,
  bookmarkSchema,
  bookmarksQuerySchema,
  bookmarksResponseSchema,
  bookmarkStatusResponseSchema,
} from "#shared/contracts/bookmarks";

describe("bookmarkSchema", () => {
  it("parses valid bookmark fields and coerces ISO date strings to Date instances", () => {
    const parsed = bookmarkSchema.parse({
      id: "bmk_1",
      businessId: "biz_123",
      createdAt: "2026-08-19T00:00:00.000Z",
    });

    expect(parsed).toEqual({
      id: "bmk_1",
      businessId: "biz_123",
      createdAt: new Date("2026-08-19T00:00:00.000Z"),
    });
    expect(parsed.createdAt).toBeInstanceOf(Date);
  });

  it("strips private user identifier or extraneous fields at the boundary", () => {
    const parsed = bookmarkSchema.parse({
      id: "bmk_1",
      businessId: "biz_123",
      userId: "usr_secret",
      createdAt: new Date("2026-08-19T00:00:00.000Z"),
      extraField: "ignored",
    });

    expect(parsed).toEqual({
      id: "bmk_1",
      businessId: "biz_123",
      createdAt: new Date("2026-08-19T00:00:00.000Z"),
    });
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("extraField");
  });
});

describe("bookmarkItemSchema", () => {
  it("parses bookmark item with business details and published listing", () => {
    const parsed = bookmarkItemSchema.parse({
      id: "bmk_1",
      businessId: "biz_123",
      createdAt: "2026-08-19T00:00:00.000Z",
      business: {
        id: "biz_123",
        uen: "199012345A",
      },
      listing: {
        id: "lst_1",
        name: "Hainanese Chicken Rice",
        category: "Food & Beverage",
        address: "123 Maxwell Road",
        postalCode: "069111",
        latitude: 1.28,
        longitude: 103.85,
        phone: "+6561234567",
        email: "contact@example.com",
        website: "https://example.com",
        paymentOptions: ["PayNow"],
        priceRange: "$$",
      },
    });

    expect(parsed.business.uen).toBe("199012345A");
    expect(parsed.listing?.name).toBe("Hainanese Chicken Rice");
  });

  it("accepts null listing for a business whose listing is not yet published", () => {
    const parsed = bookmarkItemSchema.parse({
      id: "bmk_1",
      businessId: "biz_123",
      createdAt: "2026-08-19T00:00:00.000Z",
      business: {
        id: "biz_123",
        uen: "199012345A",
      },
      listing: null,
    });

    expect(parsed.listing).toBeNull();
  });
});

describe("bookmarkCreateSchema", () => {
  it("accepts valid businessId and trims whitespace", () => {
    const parsed = bookmarkCreateSchema.parse({
      businessId: "  biz_abc123  ",
    });

    expect(parsed.businessId).toBe("biz_abc123");
  });

  it("strips client-supplied userId so callers cannot inject identity", () => {
    const parsed = bookmarkCreateSchema.parse({
      businessId: "biz_123",
      userId: "usr_attacker",
    });

    expect(parsed).toEqual({ businessId: "biz_123" });
    expect(parsed).not.toHaveProperty("userId");
  });

  it("rejects empty businessId", () => {
    expect(bookmarkCreateSchema.safeParse({ businessId: "" }).success).toBe(false);
    expect(bookmarkCreateSchema.safeParse({ businessId: "   " }).success).toBe(false);
    expect(bookmarkCreateSchema.safeParse({}).success).toBe(false);
  });
});

describe("bookmarksQuerySchema", () => {
  it("defaults limit to 20 when omitted", () => {
    const parsed = bookmarksQuerySchema.parse({});
    expect(parsed.limit).toBe(20);
    expect(parsed.cursor).toBeUndefined();
  });

  it("transforms and accepts integer limit between 1 and 100", () => {
    expect(bookmarksQuerySchema.parse({ limit: "1" }).limit).toBe(1);
    expect(bookmarksQuerySchema.parse({ limit: "50", cursor: "bmk_10" })).toEqual({
      limit: 50,
      cursor: "bmk_10",
    });
    expect(bookmarksQuerySchema.parse({ limit: "100" }).limit).toBe(100);
  });

  it("rejects non-integer, zero, negative, and excessive limits", () => {
    expect(bookmarksQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(bookmarksQuerySchema.safeParse({ limit: "-5" }).success).toBe(false);
    expect(bookmarksQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(bookmarksQuerySchema.safeParse({ limit: "3.5" }).success).toBe(false);
    expect(bookmarksQuerySchema.safeParse({ limit: "not-a-number" }).success).toBe(false);
  });
});

describe("bookmarkActionResponseSchema & bookmarkStatusResponseSchema", () => {
  it("validates bookmark action responses", () => {
    expect(
      bookmarkActionResponseSchema.parse({
        status: "bookmarked",
        bookmark: {
          id: "bmk_1",
          businessId: "biz_1",
          createdAt: "2026-08-19T00:00:00.000Z",
        },
      })
    ).toEqual({
      status: "bookmarked",
      bookmark: {
        id: "bmk_1",
        businessId: "biz_1",
        createdAt: new Date("2026-08-19T00:00:00.000Z"),
      },
    });

    expect(
      bookmarkActionResponseSchema.parse({
        status: "removed",
      })
    ).toEqual({
      status: "removed",
    });
  });

  it("validates bookmark status response for bookmarked and non-bookmarked states", () => {
    const bookmarked = bookmarkStatusResponseSchema.parse({
      bookmarked: true,
      bookmark: {
        id: "bmk_1",
        businessId: "biz_1",
        createdAt: "2026-08-19T00:00:00.000Z",
      },
    });
    expect(bookmarked.bookmarked).toBe(true);
    expect(bookmarked.bookmark?.id).toBe("bmk_1");

    const notBookmarked = bookmarkStatusResponseSchema.parse({
      bookmarked: false,
      bookmark: null,
    });
    expect(notBookmarked.bookmarked).toBe(false);
    expect(notBookmarked.bookmark).toBeNull();
  });
});

describe("bookmarksResponseSchema", () => {
  it("parses bookmarks response page with items and nextCursor", () => {
    const parsed = bookmarksResponseSchema.parse({
      items: [
        {
          id: "bmk_1",
          businessId: "biz_123",
          createdAt: "2026-08-19T00:00:00.000Z",
          business: { id: "biz_123", uen: "199012345A" },
          listing: null,
        },
      ],
      nextCursor: "bmk_1",
    });

    expect(parsed.items).toHaveLength(1);
    expect(parsed.nextCursor).toBe("bmk_1");
  });
});
