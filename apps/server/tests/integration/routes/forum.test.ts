import { eq } from "drizzle-orm";
import { describe, it, expect } from "vitest";

import {
  businesses,
  user,
  forumPosts,
  forumPostsReplies,
} from "../../../database/schema";
import {
  defaultUser,
  defaultBusiness,
  defaultForumPost,
} from "../../factories";
import { useIntegrationHarness, mockAuthSession } from "../../harness";

describe("Forum Routes - Integration Tests", () => {
  const harness = useIntegrationHarness();

  describe("GET /api/forum", () => {
    it("should return all forum posts", async () => {
      const u = defaultUser({ id: "u-forum-1", email: "forum1@test.com" });
      const uen = "UEN-FORUM-ALL";
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen, ownerId: u.id }));
      await harness.db
        .insert(forumPosts)
        .values(defaultForumPost({ uen, email: u.email }));

      const res = await harness.app.request("/api/forum");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
    });
  });

  describe("GET /api/forum/:uen", () => {
    it("should return posts for a specific business", async () => {
      const u = defaultUser({ id: "u2", email: "u2@example.com" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "UEN-FORUM", ownerId: u.id }));
      await harness.db
        .insert(forumPosts)
        .values(defaultForumPost({ uen: "UEN-FORUM", email: u.email }));

      const res = await harness.app.request("/api/forum/UEN-FORUM");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      // @ts-expect-error - testing dynamic response body
      expect(data[0].uen).toBe("UEN-FORUM");
    });
  });

  describe("POST /api/forum/new-post", () => {
    it("should create a new post when authenticated", async () => {
      const u = defaultUser({ id: "post-user", email: "poster@example.com" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "UEN-NEW-POST", ownerId: u.id }));

      mockAuthSession({ user: { id: u.id, email: u.email } });

      const res = await harness.app.request("/api/forum/new-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: u.email,
          uen: "UEN-NEW-POST",
          title: "Fresh Post",
          body: "Fresh body content",
        }),
      });

      expect(res.status).toBe(201);
      const dbPost = await harness.db.query.forumPosts.findFirst({
        where: eq(forumPosts.title, "Fresh Post"),
      });
      expect(dbPost).toBeDefined();
    });
  });

  describe("POST /api/forum/new-reply", () => {
    it("should create a reply to a post", async () => {
      const u = defaultUser({ id: "reply-user", email: "replier@example.com" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "UEN-POST-REP", ownerId: u.id }));
      const [post] = await harness.db
        .insert(forumPosts)
        .values(defaultForumPost({ uen: "UEN-POST-REP", email: u.email }))
        .returning();

      mockAuthSession({ user: { id: u.id, email: u.email } });

      const res = await harness.app.request("/api/forum/new-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          email: u.email,
          body: "I reply to this!",
        }),
      });

      expect(res.status).toBe(201);
      const dbReply = await harness.db.query.forumPostsReplies.findFirst({
        where: eq(forumPostsReplies.postId, post.id),
      });
      expect(dbReply?.body).toBe("I reply to this!");
    });
  });

  describe("PUT /api/forum/like-forum-post", () => {
    it("should increment post likes", async () => {
      const u = defaultUser({ id: "like-u", email: "liker@example.com" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "UEN-LP", ownerId: u.id }));
      const [post] = await harness.db
        .insert(forumPosts)
        .values(defaultForumPost({ uen: "UEN-LP", email: u.email }))
        .returning();

      mockAuthSession({ user: { id: u.id, email: u.email } });

      const res = await harness.app.request("/api/forum/like-forum-post", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, clicked: true }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - testing dynamic response body
      expect(data.updatedPost.likeCount).toBe(1);
    });

    it("should decrement post likes when clicked is false", async () => {
      const u = defaultUser({ id: "unlike-u", email: "unliker@example.com" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "UEN-ULP", ownerId: u.id }));
      const [post] = await harness.db
        .insert(forumPosts)
        .values(
          defaultForumPost({ uen: "UEN-ULP", email: u.email, likeCount: 3 })
        )
        .returning();

      mockAuthSession({ user: { id: u.id, email: u.email } });

      const res = await harness.app.request("/api/forum/like-forum-post", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, clicked: false }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - testing dynamic response body
      expect(data.updatedPost.likeCount).toBe(2);
    });

    it("returns 404 for non-existent post", async () => {
      const u = defaultUser({ id: "like-u2", email: "liker2@example.com" });
      await harness.db.insert(user).values(u);
      mockAuthSession({ user: { id: u.id, email: u.email } });

      const res = await harness.app.request("/api/forum/like-forum-post", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: 999999, clicked: true }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/forum/like-forum-reply", () => {
    it("should increment reply likes", async () => {
      const u = defaultUser({
        id: "reply-liker",
        email: "replyliker@example.com",
      });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "UEN-LR", ownerId: u.id }));
      const [post] = await harness.db
        .insert(forumPosts)
        .values(defaultForumPost({ uen: "UEN-LR", email: u.email }))
        .returning();
      const [reply] = await harness.db
        .insert(forumPostsReplies)
        .values({
          postId: post.id,
          email: u.email,
          body: "A reply",
          likeCount: 0,
        })
        .returning();

      mockAuthSession({ user: { id: u.id, email: u.email } });

      const res = await harness.app.request("/api/forum/like-forum-reply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId: reply.id, clicked: true }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - testing dynamic response body
      expect(data.updatedPostReply.likeCount).toBe(1);
    });

    it("returns 404 for non-existent reply", async () => {
      const u = defaultUser({
        id: "reply-liker2",
        email: "replyliker2@example.com",
      });
      await harness.db.insert(user).values(u);
      mockAuthSession({ user: { id: u.id, email: u.email } });

      const res = await harness.app.request("/api/forum/like-forum-reply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId: 999999, clicked: true }),
      });

      expect(res.status).toBe(404);
    });
  });
});
