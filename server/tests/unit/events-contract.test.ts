import { describe, expect, it } from "vitest";

import {
  createEventSchema,
  eventAuditsResponseSchema,
  eventDescriptionSchema,
  eventImageUrlSchema,
  eventItemSchema,
  eventLinkUrlSchema,
  eventModerationActionSchema,
  eventsQuerySchema,
  eventsResponseSchema,
  eventTitleSchema,
  updateEventSchema,
} from "#shared/contracts/events";

describe("eventTitleSchema", () => {
  it("accepts valid titles between 1 and 200 characters", () => {
    expect(eventTitleSchema.parse("Live Jazz Night")).toBe("Live Jazz Night");
    expect(eventTitleSchema.parse("a".repeat(200))).toBe("a".repeat(200));
  });

  it("trims whitespace", () => {
    expect(eventTitleSchema.parse("  Weekend Workshop  ")).toBe("Weekend Workshop");
  });

  it("rejects empty, whitespace-only, and excessively long titles", () => {
    expect(eventTitleSchema.safeParse("").success).toBe(false);
    expect(eventTitleSchema.safeParse("   ").success).toBe(false);
    expect(eventTitleSchema.safeParse("a".repeat(201)).success).toBe(false);
  });
});

describe("eventDescriptionSchema", () => {
  it("accepts valid descriptions between 1 and 4000 characters", () => {
    expect(eventDescriptionSchema.parse("Join us for an evening of acoustic music.")).toBe(
      "Join us for an evening of acoustic music."
    );
    expect(eventDescriptionSchema.parse("x".repeat(4000))).toBe("x".repeat(4000));
  });

  it("rejects empty and excessively long descriptions", () => {
    expect(eventDescriptionSchema.safeParse("").success).toBe(false);
    expect(eventDescriptionSchema.safeParse("   ").success).toBe(false);
    expect(eventDescriptionSchema.safeParse("x".repeat(4001)).success).toBe(false);
  });
});

describe("eventImageUrlSchema", () => {
  it("accepts valid HTTPS image URLs", () => {
    expect(eventImageUrlSchema.parse("https://images.unsplash.com/photo-12345")).toBe(
      "https://images.unsplash.com/photo-12345"
    );
  });

  it("rejects non-HTTPS URLs and invalid strings", () => {
    expect(eventImageUrlSchema.safeParse("http://insecure.com/image.jpg").success).toBe(false);
    expect(eventImageUrlSchema.safeParse("ftp://storage.test/file.png").success).toBe(false);
    expect(eventImageUrlSchema.safeParse("not-a-url").success).toBe(false);
    expect(eventImageUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });
});

describe("eventLinkUrlSchema", () => {
  it("accepts valid HTTPS external links", () => {
    expect(eventLinkUrlSchema.parse("https://example.com/tickets")).toBe(
      "https://example.com/tickets"
    );
  });

  it("rejects non-HTTPS URLs and invalid strings", () => {
    expect(eventLinkUrlSchema.safeParse("http://example.com/insecure").success).toBe(false);
    expect(eventLinkUrlSchema.safeParse("not a url").success).toBe(false);
  });
});

describe("createEventSchema", () => {
  it("accepts valid event payload with chronological bounds", () => {
    const startsAt = new Date("2026-09-01T18:00:00.000Z");
    const endsAt = new Date("2026-09-01T21:00:00.000Z");

    const parsed = createEventSchema.parse({
      title: "Artisan Coffee Tasting",
      description: "Sample specialty single-origin roasts.",
      imageUrl: "https://example.com/coffee.jpg",
      linkUrl: "https://example.com/rsvp",
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });

    expect(parsed.title).toBe("Artisan Coffee Tasting");
    expect(parsed.description).toBe("Sample specialty single-origin roasts.");
    expect(parsed.imageUrl).toBe("https://example.com/coffee.jpg");
    expect(parsed.linkUrl).toBe("https://example.com/rsvp");
    expect(parsed.startsAt).toBeInstanceOf(Date);
    expect(parsed.endsAt).toBeInstanceOf(Date);
    expect(parsed.startsAt.toISOString()).toBe(startsAt.toISOString());
    expect(parsed.endsAt.toISOString()).toBe(endsAt.toISOString());
  });

  it("accepts equal startsAt and endsAt", () => {
    const time = "2026-09-01T18:00:00.000Z";
    const parsed = createEventSchema.parse({
      title: "Flash Meetup",
      description: "Quick 1-hour session.",
      startsAt: time,
      endsAt: time,
    });
    expect(parsed.startsAt.toISOString()).toBe(parsed.endsAt.toISOString());
  });

  it("rejects missing startsAt or endsAt", () => {
    expect(
      createEventSchema.safeParse({
        title: "Incomplete Event",
        description: "Missing endsAt",
        startsAt: "2026-09-01T18:00:00.000Z",
      }).success
    ).toBe(false);

    expect(
      createEventSchema.safeParse({
        title: "Incomplete Event",
        description: "Missing startsAt",
        endsAt: "2026-09-01T21:00:00.000Z",
      }).success
    ).toBe(false);
  });

  it("rejects inverted time bounds (endsAt preceding startsAt)", () => {
    const startsAt = "2026-09-01T21:00:00.000Z";
    const endsAt = "2026-09-01T18:00:00.000Z";

    const result = createEventSchema.safeParse({
      title: "Reversed Time Event",
      description: "This should fail validation.",
      startsAt,
      endsAt,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("End date must not precede start date");
  });
});

describe("updateEventSchema", () => {
  it("accepts partial updates", () => {
    expect(updateEventSchema.parse({ title: "Updated Event Title" })).toEqual({
      title: "Updated Event Title",
    });
    expect(updateEventSchema.parse({ description: "Updated Description" })).toEqual({
      description: "Updated Description",
    });
  });

  it("rejects empty update object", () => {
    expect(updateEventSchema.safeParse({}).success).toBe(false);
  });

  it("rejects updates where endsAt precedes startsAt", () => {
    expect(
      updateEventSchema.safeParse({
        startsAt: "2026-10-10T18:00:00.000Z",
        endsAt: "2026-10-10T12:00:00.000Z",
      }).success
    ).toBe(false);
  });
});

describe("eventModerationActionSchema", () => {
  it("accepts valid moderation action and reason", () => {
    const parsed = eventModerationActionSchema.parse({
      action: "moderate",
      reason: "Unauthorized commercial activity",
    });
    expect(parsed.action).toBe("moderate");
    expect(parsed.reason).toBe("Unauthorized commercial activity");
  });

  it("rejects empty reason or invalid action", () => {
    expect(
      eventModerationActionSchema.safeParse({
        action: "moderate",
        reason: "",
      }).success
    ).toBe(false);

    expect(
      eventModerationActionSchema.safeParse({
        action: "invalid_action",
        reason: "Valid reason",
      }).success
    ).toBe(false);
  });
});

describe("eventsQuerySchema", () => {
  it("defaults limit to 20", () => {
    expect(eventsQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it("accepts limit between 1 and 100 and cursor", () => {
    expect(eventsQuerySchema.parse({ limit: "50", cursor: "c123" })).toEqual({
      limit: 50,
      cursor: "c123",
    });
  });

  it("rejects invalid limit", () => {
    expect(eventsQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(eventsQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });
});

describe("eventItemSchema & responses", () => {
  it("parses event row data with coerced dates", () => {
    const parsed = eventItemSchema.parse({
      id: "evt_1",
      businessId: "biz_1",
      userId: "usr_1",
      title: "Coffee Cupping Session",
      description: "Come learn cupping methods.",
      imageUrl: "https://example.com/banner.jpg",
      linkUrl: null,
      startsAt: "2026-09-01T10:00:00.000Z",
      endsAt: "2026-09-01T12:00:00.000Z",
      status: "active",
      moderationReason: null,
      canonicalUrl: "/events/evt_1",
      business: { id: "biz_1", name: "Loca Cafe", category: "Cafe", uen: "T09LL0001A" },
      author: { id: "usr_1", displayName: "Alice Tan", avatarUrl: null },
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    });

    expect(parsed.id).toBe("evt_1");
    expect(parsed.createdAt).toBeInstanceOf(Date);
    expect(parsed.updatedAt).toBeInstanceOf(Date);
    expect(parsed.startsAt).toBeInstanceOf(Date);
    expect(parsed.endsAt).toBeInstanceOf(Date);
    expect(parsed.status).toBe("active");
  });

  it("parses events feed response", () => {
    const res = eventsResponseSchema.parse({
      items: [],
      nextCursor: null,
    });
    expect(res.items).toEqual([]);
    expect(res.nextCursor).toBeNull();
  });

  it("parses event audits response", () => {
    const res = eventAuditsResponseSchema.parse({
      items: [
        {
          id: "aud_1",
          eventId: "evt_1",
          actorId: "admin_1",
          previousStatus: "active",
          nextStatus: "moderated",
          reason: "Violates event safety standards",
          createdAt: "2026-08-19T00:00:00.000Z",
        },
      ],
    });
    expect(res.items.length).toBe(1);
    expect(res.items[0]?.createdAt).toBeInstanceOf(Date);
  });
});
