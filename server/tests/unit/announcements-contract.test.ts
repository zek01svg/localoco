import { describe, expect, it } from "vitest";

import {
  announcementAuditsResponseSchema,
  announcementContentSchema,
  announcementImageUrlSchema,
  announcementItemSchema,
  announcementLinkUrlSchema,
  announcementModerationActionSchema,
  announcementsQuerySchema,
  announcementsResponseSchema,
  announcementTitleSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "#shared/contracts/announcements";

describe("announcementTitleSchema", () => {
  it("accepts valid titles between 1 and 200 characters", () => {
    expect(announcementTitleSchema.parse("Special Weekend Discount")).toBe(
      "Special Weekend Discount"
    );
    expect(announcementTitleSchema.parse("a".repeat(200))).toBe("a".repeat(200));
  });

  it("trims whitespace", () => {
    expect(announcementTitleSchema.parse("  Grand Opening  ")).toBe("Grand Opening");
  });

  it("rejects empty, whitespace-only, and excessively long titles", () => {
    expect(announcementTitleSchema.safeParse("").success).toBe(false);
    expect(announcementTitleSchema.safeParse("   ").success).toBe(false);
    expect(announcementTitleSchema.safeParse("a".repeat(201)).success).toBe(false);
  });
});

describe("announcementContentSchema", () => {
  it("accepts valid content between 1 and 4000 characters", () => {
    expect(announcementContentSchema.parse("We are celebrating our 5th anniversary!")).toBe(
      "We are celebrating our 5th anniversary!"
    );
    expect(announcementContentSchema.parse("x".repeat(4000))).toBe("x".repeat(4000));
  });

  it("rejects empty and excessively long content", () => {
    expect(announcementContentSchema.safeParse("").success).toBe(false);
    expect(announcementContentSchema.safeParse("   ").success).toBe(false);
    expect(announcementContentSchema.safeParse("x".repeat(4001)).success).toBe(false);
  });
});

describe("announcementImageUrlSchema", () => {
  it("accepts valid HTTPS image URLs", () => {
    expect(announcementImageUrlSchema.parse("https://images.unsplash.com/photo-12345")).toBe(
      "https://images.unsplash.com/photo-12345"
    );
  });

  it("rejects non-HTTPS URLs and invalid strings", () => {
    expect(announcementImageUrlSchema.safeParse("http://insecure.com/image.jpg").success).toBe(
      false
    );
    expect(announcementImageUrlSchema.safeParse("ftp://storage.test/file.png").success).toBe(false);
    expect(announcementImageUrlSchema.safeParse("not-a-url").success).toBe(false);
    expect(announcementImageUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });
});

describe("announcementLinkUrlSchema", () => {
  it("accepts valid HTTPS external links", () => {
    expect(announcementLinkUrlSchema.parse("https://example.com/promo")).toBe(
      "https://example.com/promo"
    );
  });

  it("rejects non-HTTPS URLs and invalid strings", () => {
    expect(announcementLinkUrlSchema.safeParse("http://example.com/insecure").success).toBe(false);
    expect(announcementLinkUrlSchema.safeParse("not a url").success).toBe(false);
  });
});

describe("createAnnouncementSchema", () => {
  it("accepts valid announcement payload without dates", () => {
    const parsed = createAnnouncementSchema.parse({
      title: "New Seasonal Menu",
      content: "Try our new items this week!",
      imageUrl: "https://example.com/menu.jpg",
      linkUrl: "https://example.com/menu",
    });

    expect(parsed.title).toBe("New Seasonal Menu");
    expect(parsed.content).toBe("Try our new items this week!");
    expect(parsed.imageUrl).toBe("https://example.com/menu.jpg");
    expect(parsed.linkUrl).toBe("https://example.com/menu");
    expect(parsed.startsAt).toBeUndefined();
    expect(parsed.endsAt).toBeUndefined();
  });

  it("accepts valid announcement with chronological visibility dates", () => {
    const startsAt = new Date("2026-09-01T00:00:00.000Z");
    const endsAt = new Date("2026-09-30T23:59:59.000Z");

    const parsed = createAnnouncementSchema.parse({
      title: "September Special",
      content: "Discounts all month long.",
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });

    expect(parsed.startsAt).toBeInstanceOf(Date);
    expect(parsed.endsAt).toBeInstanceOf(Date);
    expect(parsed.startsAt?.toISOString()).toBe(startsAt.toISOString());
    expect(parsed.endsAt?.toISOString()).toBe(endsAt.toISOString());
  });

  it("rejects payload where endsAt precedes startsAt", () => {
    const startsAt = "2026-09-30T00:00:00.000Z";
    const endsAt = "2026-09-01T00:00:00.000Z";

    const result = createAnnouncementSchema.safeParse({
      title: "Invalid dates",
      content: "This should fail validation.",
      startsAt,
      endsAt,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("End date must not precede start date");
  });

  it("accepts startsAt alone or endsAt alone", () => {
    expect(
      createAnnouncementSchema.safeParse({
        title: "Upcoming Announcement",
        content: "Starting soon.",
        startsAt: "2026-09-01T00:00:00.000Z",
      }).success
    ).toBe(true);

    expect(
      createAnnouncementSchema.safeParse({
        title: "Expiring Announcement",
        content: "Ending soon.",
        endsAt: "2026-09-30T00:00:00.000Z",
      }).success
    ).toBe(true);
  });
});

describe("updateAnnouncementSchema", () => {
  it("accepts partial updates", () => {
    expect(updateAnnouncementSchema.parse({ title: "Updated Title" })).toEqual({
      title: "Updated Title",
    });
    expect(updateAnnouncementSchema.parse({ content: "Updated Content" })).toEqual({
      content: "Updated Content",
    });
  });

  it("rejects empty update object", () => {
    expect(updateAnnouncementSchema.safeParse({}).success).toBe(false);
  });

  it("rejects updates where endsAt precedes startsAt", () => {
    expect(
      updateAnnouncementSchema.safeParse({
        startsAt: "2026-10-10T00:00:00.000Z",
        endsAt: "2026-10-01T00:00:00.000Z",
      }).success
    ).toBe(false);
  });
});

describe("announcementModerationActionSchema", () => {
  it("accepts valid moderation action and reason", () => {
    const parsed = announcementModerationActionSchema.parse({
      action: "moderate",
      reason: "Contains prohibited promotional material",
    });
    expect(parsed.action).toBe("moderate");
    expect(parsed.reason).toBe("Contains prohibited promotional material");
  });

  it("rejects empty reason or invalid action", () => {
    expect(
      announcementModerationActionSchema.safeParse({
        action: "moderate",
        reason: "",
      }).success
    ).toBe(false);

    expect(
      announcementModerationActionSchema.safeParse({
        action: "invalid_action",
        reason: "Valid reason",
      }).success
    ).toBe(false);
  });
});

describe("announcementsQuerySchema", () => {
  it("defaults limit to 20", () => {
    expect(announcementsQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it("accepts limit between 1 and 100 and cursor", () => {
    expect(announcementsQuerySchema.parse({ limit: "50", cursor: "c123" })).toEqual({
      limit: 50,
      cursor: "c123",
    });
  });

  it("rejects invalid limit", () => {
    expect(announcementsQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(announcementsQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });
});

describe("announcementItemSchema & responses", () => {
  it("parses announcement row data with coerced dates", () => {
    const parsed = announcementItemSchema.parse({
      id: "ann_1",
      businessId: "biz_1",
      userId: "usr_1",
      title: "Grand Opening",
      content: "Come visit us today!",
      imageUrl: "https://example.com/banner.jpg",
      linkUrl: null,
      startsAt: "2026-08-01T00:00:00.000Z",
      endsAt: "2026-08-31T23:59:59.000Z",
      status: "active",
      moderationReason: null,
      canonicalUrl: "http://localhost:4000/announcements/ann_1",
      business: { id: "biz_1", name: "Loca Cafe", category: "Cafe", uen: "T09LL0001A" },
      author: { id: "usr_1", displayName: "Alice Tan", avatarUrl: null },
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });

    expect(parsed.id).toBe("ann_1");
    expect(parsed.createdAt).toBeInstanceOf(Date);
    expect(parsed.updatedAt).toBeInstanceOf(Date);
    expect(parsed.startsAt).toBeInstanceOf(Date);
    expect(parsed.endsAt).toBeInstanceOf(Date);
    expect(parsed.status).toBe("active");
  });

  it("parses announcements feed response", () => {
    const res = announcementsResponseSchema.parse({
      items: [],
      nextCursor: null,
    });
    expect(res.items).toEqual([]);
    expect(res.nextCursor).toBeNull();
  });

  it("parses announcement audits response", () => {
    const res = announcementAuditsResponseSchema.parse({
      items: [
        {
          id: "aud_1",
          announcementId: "ann_1",
          actorId: "admin_1",
          previousStatus: "active",
          nextStatus: "moderated",
          reason: "Violates terms of service",
          createdAt: "2026-08-19T00:00:00.000Z",
        },
      ],
    });
    expect(res.items.length).toBe(1);
    expect(res.items[0]?.createdAt).toBeInstanceOf(Date);
  });
});
