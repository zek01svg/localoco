import { eq, and } from "drizzle-orm";
import { describe, it, expect } from "vitest";

import {
  bookmarkedBusinesses,
  businesses,
  user,
} from "../../../database/schema";
import { defaultUser, defaultBusiness } from "../../factories";
import { useIntegrationHarness, mockAuthSession } from "../../harness";

describe("Bookmark Routes - Integration Tests", () => {
  const harness = useIntegrationHarness();

  describe("GET /api/bookmarks", () => {
    it("should return user bookmarks and use cache", async () => {
      const u = defaultUser({ id: "user-bookmarks" });
      await harness.db.insert(user).values(u);

      const b1 = defaultBusiness({
        uen: "UEN-0000001",
        businessName: "Biz 1",
        ownerId: u.id,
      });
      const b2 = defaultBusiness({
        uen: "UEN-0000002",
        businessName: "Biz 2",
        ownerId: u.id,
      });
      await harness.db.insert(businesses).values([b1, b2]);

      await harness.db.insert(bookmarkedBusinesses).values([
        { userId: u.id, uen: "UEN-0000001" },
        { userId: u.id, uen: "UEN-0000002" },
      ]);

      mockAuthSession({ user: u });

      // First request - Cache miss
      const res1 = await harness.app.request(
        `/api/bookmarks/${u.id}/bookmarks`
      );
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1).toHaveLength(2);

      // Verify cache
      const cacheKey = `user:bookmarks:${u.id}`;
      const cached = await harness.redis.get(cacheKey);
      expect(cached).toBeDefined();

      // Second request - Cache hit (Modify DB to verify)
      await harness.db.delete(bookmarkedBusinesses);
      const res2 = await harness.app.request(
        `/api/bookmarks/${u.id}/bookmarks`
      );
      const data2 = await res2.json();
      expect(data2).toHaveLength(2);
    });
  });

  describe("PUT /api/bookmarks/update-bookmark", () => {
    it("should add a bookmark if not present", async () => {
      const u = defaultUser({ id: "add-bookmark" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "NEW-UEN-001", ownerId: u.id }));

      mockAuthSession({ user: u });

      const res = await harness.app.request("/api/bookmarks/update-bookmark", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: u.id,
          uen: "NEW-UEN-001",
          clicked: true,
        }),
      });

      expect(res.status).toBe(200);
      const dbBookmark = await harness.db.query.bookmarkedBusinesses.findFirst({
        where: and(
          eq(bookmarkedBusinesses.userId, u.id),
          eq(bookmarkedBusinesses.uen, "NEW-UEN-001")
        ),
      });
      expect(dbBookmark).toBeDefined();
    });

    it("should remove a bookmark if already present and clicked=false", async () => {
      const u = defaultUser({ id: "remove-bookmark" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "REM-UEN-001", ownerId: u.id }));
      await harness.db
        .insert(bookmarkedBusinesses)
        .values({ userId: u.id, uen: "REM-UEN-001" });

      mockAuthSession({ user: u });

      const res = await harness.app.request("/api/bookmarks/update-bookmark", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: u.id,
          uen: "REM-UEN-001",
          clicked: false,
        }),
      });

      expect(res.status).toBe(200);
      const dbBookmark = await harness.db.query.bookmarkedBusinesses.findFirst({
        where: and(
          eq(bookmarkedBusinesses.userId, u.id),
          eq(bookmarkedBusinesses.uen, "REM-UEN-001")
        ),
      });
      expect(dbBookmark).toBeUndefined();
    });

    it("should invalidate user bookmark cache on update", async () => {
      const u = defaultUser({ id: "invalidate-cache" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "INV-UEN-001", ownerId: u.id }));
      mockAuthSession({ user: u });

      const cacheKey = `user:bookmarks:${u.id}`;
      await harness.redis.set(cacheKey, [{ uen: "INV-UEN-001" }]);

      await harness.app.request("/api/bookmarks/update-bookmark", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: u.id,
          uen: "INV-UEN-001",
          clicked: true,
        }),
      });

      const cached = await harness.redis.get(cacheKey);
      expect(cached).toBeNull();
    });
  });
});
