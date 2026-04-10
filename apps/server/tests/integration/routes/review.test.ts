import { eq } from "drizzle-orm";
import { describe, it, expect } from "vitest";

import { businesses, user, businessReviews } from "../../../database/schema";
import { defaultUser, defaultBusiness, defaultReview } from "../../factories";
import { useIntegrationHarness, mockAuthSession } from "../../harness";

describe("Review Routes - Integration Tests", () => {
  const harness = useIntegrationHarness();

  describe("GET /api/reviews/:uen/reviews", () => {
    it("should return reviews for a business", async () => {
      const u = defaultUser({ id: "rev-u-1", email: "rev1@test.com" });
      const uen = "UEN-REV-MATCH";
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen, ownerId: u.id }));
      await harness.db
        .insert(businessReviews)
        .values(defaultReview({ uen, email: u.email, body: "Great food!" }));

      const res = await harness.app.request(`/api/reviews/${uen}/reviews`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      // @ts-expect-error - testing dynamic response body
      expect(data[0].body).toBe("Great food!");
      // @ts-expect-error - testing dynamic response body
      expect(data[0].rating).toBe(5);
    });
  });

  describe("POST /api/reviews/submit-review", () => {
    it("should submit a review when authenticated", async () => {
      const u = defaultUser({ id: "sub-user", email: "submitter@example.com" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "UEN-SUB", ownerId: u.id }));

      mockAuthSession({ user: { id: u.id, email: u.email } });

      const res = await harness.app.request("/api/reviews/submit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: u.email,
          uen: "UEN-SUB",
          body: "New Review",
          rating: 4,
        }),
      });

      expect(res.status).toBe(201);

      // Verify in DB
      const dbReview = await harness.db.query.businessReviews.findFirst({
        where: eq(businessReviews.uen, "UEN-SUB"),
      });
      expect(dbReview?.body).toBe("New Review");
      expect(dbReview?.email).toBe(u.email);
    });
  });

  describe("PUT /api/reviews/update-review", () => {
    it("should update an existing review", async () => {
      const u = defaultUser({ id: "upd-user", email: "updater@example.com" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "UEN-UPD", ownerId: u.id }));
      const [rev] = await harness.db
        .insert(businessReviews)
        .values(
          defaultReview({
            email: u.email,
            uen: "UEN-UPD",
            rating: 3,
            body: "Initial",
          })
        )
        .returning();

      mockAuthSession({ user: { id: u.id, email: u.email } });

      const res = await harness.app.request("/api/reviews/update-review", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rev.id,
          rating: 5,
          body: "Updated Body",
        }),
      });

      expect(res.status).toBe(200);

      const dbReview = await harness.db.query.businessReviews.findFirst({
        where: eq(businessReviews.id, rev.id),
      });
      expect(dbReview?.body).toBe("Updated Body");
      expect(dbReview?.rating).toBe(5);
    });
  });

  describe("DELETE /api/reviews/delete-review", () => {
    it("should delete a review", async () => {
      const u = defaultUser({ id: "del-user", email: "deleter@example.com" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "UEN-DEL", ownerId: u.id }));
      const [rev] = await harness.db
        .insert(businessReviews)
        .values(
          defaultReview({
            email: u.email,
            uen: "UEN-DEL",
            rating: 1,
            body: "To be deleted",
          })
        )
        .returning();

      mockAuthSession({ user: { id: u.id, email: u.email } });

      const res = await harness.app.request("/api/reviews/delete-review", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rev.id }),
      });

      expect(res.status).toBe(200);

      const dbReview = await harness.db.query.businessReviews.findFirst({
        where: eq(businessReviews.id, rev.id),
      });
      expect(dbReview).toBeUndefined();
    });
  });

  describe("PUT /api/reviews/like-review", () => {
    it("should increment like count when clicked is true", async () => {
      const u = defaultUser({ id: "like-user", email: "liker@example.com" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "UEN-LIKE", ownerId: u.id }));
      const [rev] = await harness.db
        .insert(businessReviews)
        .values(
          defaultReview({
            email: u.email,
            uen: "UEN-LIKE",
            rating: 5,
            body: "Likable",
            likeCount: 0,
          })
        )
        .returning();

      mockAuthSession({ user: { id: u.id, email: u.email } });

      const res = await harness.app.request("/api/reviews/like-review", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: rev.id, clicked: true }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - testing dynamic response body
      expect(data.updatedReview.likeCount).toBe(1);
    });
  });
});
