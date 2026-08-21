import { describe, expect, it } from "vitest";

import {
  createForumPostSchema,
  createForumReplySchema,
  forumBodySchema,
  forumFeedResponseSchema,
  forumModerationAuditItemSchema,
  forumModerationAuditsResponseSchema,
  forumPostItemSchema,
  forumQuerySchema,
  forumRepliesResponseSchema,
  forumReplyItemSchema,
  forumTitleSchema,
  moderateForumContentSchema,
  updateForumPostSchema,
  updateForumReplySchema,
} from "#shared/contracts/forum";

describe("forumTitleSchema", () => {
  it("accepts titles from 1 through 200 characters", () => {
    expect(forumTitleSchema.parse("Best coffee in town")).toBe("Best coffee in town");
    expect(forumTitleSchema.parse("a".repeat(200))).toBe("a".repeat(200));
  });

  it("trims surrounding whitespace", () => {
    expect(forumTitleSchema.parse("  hello  ")).toBe("hello");
  });

  it("rejects empty, whitespace-only, and over-long titles", () => {
    expect(forumTitleSchema.safeParse("").success).toBe(false);
    expect(forumTitleSchema.safeParse("   ").success).toBe(false);
    expect(forumTitleSchema.safeParse("a".repeat(201)).success).toBe(false);
  });
});

describe("forumBodySchema", () => {
  it("accepts bodies from 1 through 4000 characters", () => {
    expect(forumBodySchema.parse("Has anyone tried the new menu?")).toBe(
      "Has anyone tried the new menu?"
    );
    expect(forumBodySchema.parse("a".repeat(4000))).toBe("a".repeat(4000));
  });

  it("rejects empty and over-long bodies", () => {
    expect(forumBodySchema.safeParse("").success).toBe(false);
    expect(forumBodySchema.safeParse("  ").success).toBe(false);
    expect(forumBodySchema.safeParse("a".repeat(4001)).success).toBe(false);
  });
});

describe("createForumPostSchema", () => {
  it("accepts a businessId, title, and body", () => {
    expect(
      createForumPostSchema.parse({
        businessId: "biz_1",
        title: "Is the laksa worth it?",
        body: "Planning a visit this weekend.",
      })
    ).toEqual({
      businessId: "biz_1",
      title: "Is the laksa worth it?",
      body: "Planning a visit this weekend.",
    });
  });

  it("rejects a missing or empty businessId", () => {
    expect(createForumPostSchema.safeParse({ title: "T", body: "B" }).success).toBe(false);
    expect(createForumPostSchema.safeParse({ businessId: "", title: "T", body: "B" }).success).toBe(
      false
    );
  });
});

describe("updateForumPostSchema", () => {
  it("accepts updating title only, body only, or both", () => {
    expect(updateForumPostSchema.parse({ title: "New title" })).toEqual({ title: "New title" });
    expect(updateForumPostSchema.parse({ body: "New body" })).toEqual({ body: "New body" });
    expect(updateForumPostSchema.parse({ title: "T", body: "B" })).toEqual({
      title: "T",
      body: "B",
    });
  });

  it("rejects an empty update object", () => {
    expect(updateForumPostSchema.safeParse({}).success).toBe(false);
  });
});

describe("createForumReplySchema & updateForumReplySchema", () => {
  it("accepts a body", () => {
    expect(createForumReplySchema.parse({ body: "I agree!" })).toEqual({ body: "I agree!" });
    expect(updateForumReplySchema.parse({ body: "Updated reply" })).toEqual({
      body: "Updated reply",
    });
  });

  it("rejects empty bodies", () => {
    expect(createForumReplySchema.safeParse({ body: "" }).success).toBe(false);
    expect(updateForumReplySchema.safeParse({}).success).toBe(false);
  });
});

describe("forumQuerySchema", () => {
  it("defaults limit to 20 and includeDeleted to false", () => {
    expect(forumQuerySchema.parse({})).toEqual({ limit: 20, includeDeleted: false });
  });

  it("accepts limit between 1 and 100 and an optional cursor", () => {
    expect(forumQuerySchema.parse({ limit: "50" }).limit).toBe(50);
    expect(forumQuerySchema.parse({ limit: "1", cursor: "abc" })).toEqual({
      limit: 1,
      cursor: "abc",
      includeDeleted: false,
    });
  });

  it("coerces includeDeleted from query strings", () => {
    expect(forumQuerySchema.parse({ includeDeleted: "true" }).includeDeleted).toBe(true);
    expect(forumQuerySchema.parse({ includeDeleted: "false" }).includeDeleted).toBe(false);
  });

  it("rejects limit below 1 or above 100", () => {
    expect(forumQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(forumQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
    expect(forumQuerySchema.safeParse({ limit: "abc" }).success).toBe(false);
  });
});

describe("forumPostItemSchema", () => {
  it("parses a post with author, business reference, and reply count", () => {
    const item = forumPostItemSchema.parse({
      id: "post_1",
      businessId: "biz_1",
      userId: "usr_1",
      title: "Weekend crowd?",
      body: "How busy is it on Saturdays?",
      author: { id: "usr_1", displayName: "Alice Tan", avatarUrl: null },
      business: { id: "biz_1", name: "Tanjong Pagar Bakery", category: "Cafe" },
      replyCount: 3,
      deletedAt: null,
      moderatedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    });

    expect(item.createdAt).toBeInstanceOf(Date);
    expect(item.updatedAt).toBeInstanceOf(Date);
    expect(item.replyCount).toBe(3);
    expect(item.deletedAt).toBeNull();
    expect(item.moderatedAt).toBeNull();
  });

  it("accepts a business reference without a category", () => {
    const item = forumPostItemSchema.parse({
      id: "post_2",
      businessId: "biz_2",
      userId: "usr_1",
      title: "T",
      body: "B",
      author: { id: "usr_1", displayName: "Alice Tan", avatarUrl: null },
      business: { id: "biz_2", name: "Some Shop" },
      replyCount: 0,
      deletedAt: null,
      moderatedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    });
    expect(item.business.category).toBeUndefined();
    expect(item.moderatedAt).toBeNull();
  });
});

describe("forumReplyItemSchema", () => {
  it("parses a reply with author", () => {
    const item = forumReplyItemSchema.parse({
      id: "reply_1",
      postId: "post_1",
      userId: "usr_2",
      body: "Usually packed after 11am.",
      author: { id: "usr_2", displayName: "Ben Lim", avatarUrl: null },
      deletedAt: null,
      moderatedAt: null,
      createdAt: "2026-08-19T01:00:00.000Z",
      updatedAt: "2026-08-19T01:00:00.000Z",
    });
    expect(item.createdAt).toBeInstanceOf(Date);
    expect(item.postId).toBe("post_1");
    expect(item.deletedAt).toBeNull();
    expect(item.moderatedAt).toBeNull();
  });

  it("accepts a non-null deletedAt for administrator reads", () => {
    const item = forumReplyItemSchema.parse({
      id: "reply_2",
      postId: "post_1",
      userId: "usr_2",
      body: "Gone",
      author: { id: "usr_2", displayName: "Ben Lim", avatarUrl: null },
      deletedAt: "2026-08-19T02:00:00.000Z",
      moderatedAt: null,
      createdAt: "2026-08-19T01:00:00.000Z",
      updatedAt: "2026-08-19T01:00:00.000Z",
    });
    expect(item.deletedAt).toBeInstanceOf(Date);
    expect(item.moderatedAt).toBeNull();
  });
});

describe("forumFeedResponseSchema & forumRepliesResponseSchema", () => {
  it("parses a feed page with a null next cursor", () => {
    const feed = forumFeedResponseSchema.parse({ items: [], nextCursor: null });
    expect(feed.items).toEqual([]);
    expect(feed.nextCursor).toBeNull();
  });

  it("parses a replies page", () => {
    const replies = forumRepliesResponseSchema.parse({
      items: [],
      nextCursor: null,
    });
    expect(replies.items).toEqual([]);
    expect(replies.nextCursor).toBeNull();
  });
});

describe("moderateForumContentSchema", () => {
  it("accepts a non-empty reason up to 1000 characters", () => {
    const parsed = moderateForumContentSchema.parse({
      reason: "Abusive language and harassment",
    });
    expect(parsed.reason).toBe("Abusive language and harassment");
  });

  it("trims whitespace from reason", () => {
    const parsed = moderateForumContentSchema.parse({
      reason: "   Spam content   ",
    });
    expect(parsed.reason).toBe("Spam content");
  });

  it("rejects missing, empty, or whitespace-only reason", () => {
    expect(moderateForumContentSchema.safeParse({}).success).toBe(false);
    expect(moderateForumContentSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(moderateForumContentSchema.safeParse({ reason: "   " }).success).toBe(false);
  });

  it("rejects reasons longer than 1000 characters", () => {
    expect(moderateForumContentSchema.safeParse({ reason: "a".repeat(1001) }).success).toBe(false);
  });
});

describe("forumModerationAuditItemSchema & forumModerationAuditsResponseSchema", () => {
  it("parses post moderation audit item", () => {
    const item = forumModerationAuditItemSchema.parse({
      id: "audit_1",
      targetType: "post",
      targetId: "post_1",
      actorId: "admin_1",
      reason: "Violates community guidelines",
      originalTitle: "Abusive title",
      originalBody: "Abusive body",
      originalAuthorId: "usr_1",
      createdAt: "2026-08-19T03:00:00.000Z",
    });
    expect(item.id).toBe("audit_1");
    expect(item.targetType).toBe("post");
    expect(item.createdAt).toBeInstanceOf(Date);
  });

  it("parses reply moderation audit item with null originalTitle", () => {
    const item = forumModerationAuditItemSchema.parse({
      id: "audit_2",
      targetType: "reply",
      targetId: "reply_1",
      actorId: "admin_1",
      reason: "Harassment",
      originalTitle: null,
      originalBody: "Offensive reply text",
      originalAuthorId: "usr_2",
      createdAt: "2026-08-19T03:30:00.000Z",
    });
    expect(item.targetType).toBe("reply");
    expect(item.originalTitle).toBeNull();
  });

  it("parses moderation audits response", () => {
    const res = forumModerationAuditsResponseSchema.parse({
      items: [
        {
          id: "audit_1",
          targetType: "post",
          targetId: "post_1",
          actorId: "admin_1",
          reason: "Violates guidelines",
          originalBody: "Offensive body",
          originalAuthorId: "usr_1",
          createdAt: "2026-08-19T03:00:00.000Z",
        },
      ],
    });
    expect(res.items).toHaveLength(1);
  });
});

describe("forumPostItemSchema and forumReplyItemSchema with moderatedAt", () => {
  it("accepts null moderatedAt on active or soft-deleted posts", () => {
    const item = forumPostItemSchema.parse({
      id: "post_1",
      businessId: "biz_1",
      userId: "usr_1",
      title: "Title",
      body: "Body",
      author: { id: "usr_1", displayName: "Alice Tan", avatarUrl: null },
      business: { id: "biz_1", name: "Shop" },
      replyCount: 0,
      deletedAt: null,
      moderatedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    });
    expect(item.moderatedAt).toBeNull();
  });

  it("accepts non-null moderatedAt on moderated posts", () => {
    const item = forumPostItemSchema.parse({
      id: "post_1",
      businessId: "biz_1",
      userId: "usr_1",
      title: "Title",
      body: "Body",
      author: { id: "usr_1", displayName: "Alice Tan", avatarUrl: null },
      business: { id: "biz_1", name: "Shop" },
      replyCount: 0,
      deletedAt: null,
      moderatedAt: "2026-08-19T02:00:00.000Z",
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T02:00:00.000Z",
    });
    expect(item.moderatedAt).toBeInstanceOf(Date);
  });

  it("accepts non-null moderatedAt on moderated replies", () => {
    const item = forumReplyItemSchema.parse({
      id: "reply_1",
      postId: "post_1",
      userId: "usr_1",
      body: "Body",
      author: { id: "usr_1", displayName: "Alice Tan", avatarUrl: null },
      deletedAt: null,
      moderatedAt: "2026-08-19T02:00:00.000Z",
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T02:00:00.000Z",
    });
    expect(item.moderatedAt).toBeInstanceOf(Date);
  });
});
