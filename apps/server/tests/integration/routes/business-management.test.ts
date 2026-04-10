import { eq } from "drizzle-orm";
import { describe, it, expect } from "vitest";

import { businesses, user } from "../../../database/schema";
import { defaultUser, defaultBusiness } from "../../factories";
import { useIntegrationHarness, mockAuthSession } from "../../harness";

describe("Business Management Routes - Integration Tests", () => {
  const harness = useIntegrationHarness();

  describe("GET /api/businesses/:ownerId/owned", () => {
    it("should return businesses owned by the user", async () => {
      const u1 = defaultUser({ id: "owner-1", email: "o1@example.com" });
      const u2 = defaultUser({ id: "owner-2", email: "o2@example.com" });
      await harness.db.insert(user).values([u1, u2]);

      await harness.db
        .insert(businesses)
        .values([
          defaultBusiness({ uen: "UEN-000001", ownerId: u1.id }),
          defaultBusiness({ uen: "UEN-000002", ownerId: u1.id }),
          defaultBusiness({ uen: "UEN-000003", ownerId: u2.id }),
        ]);

      mockAuthSession({ user: u1 });

      const res = await harness.app.request(`/api/businesses/${u1.id}/owned`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(2);
      // @ts-expect-error - testing dynamic response body
      expect(data.every((b: any) => b.ownerId === u1.id)).toBe(true);
    });
  });

  describe("POST /api/businesses/register-business", () => {
    it("should allow an authenticated user to register a business", async () => {
      const u = defaultUser({ id: "new-owner" });
      await harness.db.insert(user).values(u);
      mockAuthSession({ user: u });

      const businessData = defaultBusiness({
        uen: "NEW-BIZ-001",
        ownerId: u.id,
        businessName: "Brand New Cafe",
      });

      const res = await harness.app.request(
        "/api/businesses/register-business",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(businessData),
        }
      );

      expect(res.status).toBe(201);
      const dbBiz = await harness.db.query.businesses.findFirst({
        where: eq(businesses.uen, "NEW-BIZ-001"),
      });
      expect(dbBiz).toBeDefined();
      expect(dbBiz?.ownerId).toBe(u.id);
    });
  });

  describe("PUT /api/businesses/update-business", () => {
    it("should update business if the user is the owner", async () => {
      const u = defaultUser({ id: "real-owner" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "OWNED-00001", ownerId: u.id }));

      mockAuthSession({ user: u });

      const updateData = defaultBusiness({
        uen: "OWNED-00001",
        ownerId: u.id,
        businessName: "Updated Name",
      });

      const res = await harness.app.request("/api/businesses/update-business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      expect(res.status).toBe(200);
      const dbBiz = await harness.db.query.businesses.findFirst({
        where: eq(businesses.uen, "OWNED-00001"),
      });
      expect(dbBiz?.businessName).toBe("Updated Name");
    });

    it("should fail to update if the user is not the owner", async () => {
      const owner = defaultUser({
        id: "actual-owner",
        email: "owner@test.com",
      });
      const hacker = defaultUser({ id: "hacker", email: "hacker@test.com" });
      await harness.db.insert(user).values([owner, hacker]);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "TARGET-0001", ownerId: owner.id }));

      mockAuthSession({ user: hacker });

      const updateData = defaultBusiness({
        uen: "TARGET-0001",
        ownerId: owner.id, // Trying to update someone else's business
        businessName: "Hacked Name",
      });

      const res = await harness.app.request("/api/businesses/update-business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      expect(res.status).toBe(403);
      const dbBiz = await harness.db.query.businesses.findFirst({
        where: eq(businesses.uen, "TARGET-0001"),
      });
      expect(dbBiz?.businessName).not.toBe("Hacked Name");
    });
  });

  describe("DELETE /api/businesses/delete-business", () => {
    it("should delete business if the user is the owner", async () => {
      const u = defaultUser({ id: "owner-to-delete" });
      await harness.db.insert(user).values(u);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "BYE-0000001", ownerId: u.id }));

      mockAuthSession({ user: u });

      const res = await harness.app.request("/api/businesses/delete-business", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uen: "BYE-0000001" }),
      });

      expect(res.status).toBe(200);
      const dbBiz = await harness.db.query.businesses.findFirst({
        where: eq(businesses.uen, "BYE-0000001"),
      });
      expect(dbBiz).toBeUndefined();
    });

    it("should fail to delete if the user is not the owner", async () => {
      const owner = defaultUser({ id: "real-owner-del", email: "ro@test.com" });
      const imposter = defaultUser({ id: "imposter", email: "im@test.com" });
      await harness.db.insert(user).values([owner, imposter]);
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "KEEP-0000001", ownerId: owner.id }));

      mockAuthSession({ user: imposter });

      const res = await harness.app.request("/api/businesses/delete-business", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uen: "KEEP-0000001" }),
      });

      expect(res.status).toBe(403);
      const dbBiz = await harness.db.query.businesses.findFirst({
        where: eq(businesses.uen, "KEEP-0000001"),
      });
      expect(dbBiz).toBeDefined();
    });
  });
});
