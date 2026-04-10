import { eq } from "drizzle-orm";
import { describe, it, expect } from "vitest";

import { user } from "../../../database/schema";
import { defaultUser } from "../../factories";
import { useIntegrationHarness, mockAuthSession } from "../../harness";

describe("User Routes - Integration Tests", () => {
  const harness = useIntegrationHarness();

  describe("GET /api/users/profile/:userId", () => {
    it("should return 401 if unauthenticated", async () => {
      const res = await harness.app.request("/api/users/profile/u1");
      expect(res.status).toBe(401);
    });

    it("should return user profile if authenticated", async () => {
      await harness.db
        .insert(user)
        .values(
          defaultUser({ id: "profile-user", email: "profile@example.com" })
        );
      mockAuthSession({
        user: { id: "profile-user", email: "profile@example.com" },
      });

      const res = await harness.app.request("/api/users/profile/profile-user");
      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - testing dynamic response body
      expect(data.profile.id).toBe("profile-user");
      // @ts-expect-error - testing dynamic response body
      expect(data.profile.email).toBe("profile@example.com");
      // @ts-expect-error - testing dynamic response body
      expect(data.points).toBeDefined();
    });
  });

  describe("GET /api/users/check-email", () => {
    it("should return available: true if email does not exist", async () => {
      const res = await harness.app.request(
        "/api/users/check-email?email=unique@example.com"
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - testing dynamic response body
      expect(data.available).toBe(true);
    });

    it("should return available: false if email exists", async () => {
      await harness.db
        .insert(user)
        .values(
          defaultUser({ id: "exists-user", email: "exists@example.com" })
        );
      const res = await harness.app.request(
        "/api/users/check-email?email=exists@example.com"
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - testing dynamic response body
      expect(data.available).toBe(false);
    });
  });

  describe("PUT /api/users/update-profile", () => {
    it("should update profile for authenticated user", async () => {
      await harness.db
        .insert(user)
        .values(
          defaultUser({
            id: "update-user",
            name: "Old Name",
            email: "update@example.com",
          })
        );
      mockAuthSession({
        user: { id: "update-user", email: "update@example.com" },
      });

      const res = await harness.app.request("/api/users/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "update-user",
          name: "New Name",
          email: "update@example.com",
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - testing dynamic response body
      expect(data.updatedUser.name).toBe("New Name");

      // Verify in DB
      const dbUser = await harness.db.query.user.findFirst({
        where: eq(user.id, "update-user"),
      });
      expect(dbUser?.name).toBe("New Name");
    });
  });

  describe("DELETE /api/users/delete-profile", () => {
    it("should delete profile for authenticated user", async () => {
      await harness.db
        .insert(user)
        .values(
          defaultUser({ id: "delete-user", email: "delete@example.com" })
        );
      mockAuthSession({
        user: { id: "delete-user", email: "delete@example.com" },
      });

      const res = await harness.app.request("/api/users/delete-profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "delete-user" }),
      });

      expect(res.status).toBe(200);

      // Verify in DB
      const dbUser = await harness.db.query.user.findFirst({
        where: eq(user.id, "delete-user"),
      });
      expect(dbUser).toBeUndefined();
    });
  });
});
