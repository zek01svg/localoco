import { eq } from "drizzle-orm";
import { describe, it, expect } from "vitest";

import {
  businessAnnouncements,
  businesses,
  user,
} from "../../../database/schema";
import {
  defaultUser,
  defaultBusiness,
  defaultAnnouncement,
} from "../../factories";
import { useIntegrationHarness, mockAuthSession } from "../../harness";

describe("Announcement Routes - Integration Tests", () => {
  const harness = useIntegrationHarness();

  const VALID_UEN = "UEN987654321";

  describe("GET /api/announcements", () => {
    it("should return all announcements (newsletter) and use cache", async () => {
      const u = defaultUser({ id: "u1" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: VALID_UEN, ownerId: u.id }));
      await harness.db
        .insert(businessAnnouncements)
        .values([
          defaultAnnouncement({ uen: VALID_UEN, title: "Ann 1" }),
          defaultAnnouncement({ uen: VALID_UEN, title: "Ann 2" }),
        ]);

      // First request - Cache miss
      const res1 = await harness.app.request("/api/announcements/newsletter");
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1).toHaveLength(2);

      // Verify cache exists
      const cached = await harness.redis.get("all-announcements");
      expect(cached).toBeDefined();

      // Second request - Cache hit (Modify DB to verify cache usage)
      await harness.db.delete(businessAnnouncements);
      const res2 = await harness.app.request("/api/announcements/newsletter");
      const data2 = await res2.json();
      expect(data2).toHaveLength(2); // Still comes from cache
    });
  });

  describe("GET /api/announcements/:uen", () => {
    it("should return announcements for a specific business", async () => {
      const u = defaultUser({ id: "u2", email: "u2@example.com" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "SPEC-UEN-001", ownerId: u.id }));
      await harness.db
        .insert(businessAnnouncements)
        .values(
          defaultAnnouncement({ uen: "SPEC-UEN-001", title: "Spec Ann" })
        );

      const res = await harness.app.request(
        "/api/announcements/announcements/SPEC-UEN-001"
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      // @ts-expect-error - testing dynamic response body
      expect(data[0].title).toBe("Spec Ann");
    });
  });

  describe("POST /api/announcements/new-announcement", () => {
    it("should create an announcement and invalidate cache", async () => {
      const u = defaultUser({ id: "owner-u", email: "owner@example.com" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "OWNED-UEN-01", ownerId: u.id }));

      mockAuthSession({ user: u });

      // Seed cache
      await harness.redis.set("all-announcements", []);

      const res = await harness.app.request(
        "/api/announcements/new-announcement",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uen: "OWNED-UEN-01",
            title: "New Promo",
            content: "Get it now!",
            imageUrl: "http://example.com/promo.png",
          }),
        }
      );

      expect(res.status).toBe(201);

      // Verify DB
      const dbAnn = await harness.db.query.businessAnnouncements.findFirst({
        where: eq(businessAnnouncements.title, "New Promo"),
      });
      expect(dbAnn).toBeDefined();

      // Verify cache invalidation
      const cached = await harness.redis.get("all-announcements");
      expect(cached).toBeNull();
    });
  });

  describe("PUT /api/announcements/update-announcement", () => {
    it("should update announcement when authorized", async () => {
      const u = defaultUser({ id: "update-u", email: "upd@example.com" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "UPD-UEN-001", ownerId: u.id }));
      const [ann] = await harness.db
        .insert(businessAnnouncements)
        .values(defaultAnnouncement({ uen: "UPD-UEN-001", title: "Old Title" }))
        .returning();

      mockAuthSession({ user: u });

      const res = await harness.app.request(
        "/api/announcements/update-announcement",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            announcementId: ann.announcementId,
            uen: "UPD-UEN-001",
            title: "New Title",
            content: "Updated Content",
            imageUrl: "http://example.com/updated.png",
          }),
        }
      );

      expect(res.status).toBe(200);
      const dbAnn = await harness.db.query.businessAnnouncements.findFirst({
        where: eq(businessAnnouncements.announcementId, ann.announcementId),
      });
      expect(dbAnn?.title).toBe("New Title");
    });
  });

  describe("DELETE /api/announcements/delete-announcement", () => {
    it("should delete announcement and invalidate cache", async () => {
      const u = defaultUser({ id: "del-u", email: "del@example.com" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "DEL-UEN-001", ownerId: u.id }));
      const [ann] = await harness.db
        .insert(businessAnnouncements)
        .values(defaultAnnouncement({ uen: "DEL-UEN-001" }))
        .returning();

      mockAuthSession({ user: u });

      const res = await harness.app.request(
        "/api/announcements/delete-announcement",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ announcementId: ann.announcementId }),
        }
      );

      expect(res.status).toBe(200);
      const dbAnn = await harness.db.query.businessAnnouncements.findFirst({
        where: eq(businessAnnouncements.announcementId, ann.announcementId),
      });
      expect(dbAnn).toBeUndefined();
    });
  });
});
