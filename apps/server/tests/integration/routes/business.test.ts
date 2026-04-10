import { eq } from "drizzle-orm";
import { describe, it, expect, beforeEach } from "vitest";

import { businesses, user } from "../../../database/schema";
import { defaultUser, defaultBusiness } from "../../factories";
import { useIntegrationHarness } from "../../harness";

describe("Business Routes - Integration Tests", () => {
  const harness = useIntegrationHarness();

  beforeEach(async () => {
    // Note: harness.ts now handles truncation of tables and redis flush in its own beforeEach.
    // We only need to seed common data if needed.
    await harness.db.insert(user).values(defaultUser({ id: "u1" }));
  });

  describe("GET /api/businesses", () => {
    it("should return an empty list when no businesses exist", async () => {
      const res = await harness.app.request("/api/businesses");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([]);
    });

    it("should return businesses from the database", async () => {
      await harness.db.insert(businesses).values(defaultBusiness());

      const res = await harness.app.request("/api/businesses");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      // @ts-expect-error - testing dynamic response body
      expect(data[0].businessName).toBe("Test Cafe");
    });

    it("should use cache for subsequent requests", async () => {
      await harness.db.insert(businesses).values(
        defaultBusiness({
          uen: "UEN-CACHE",
          businessName: "Cached Business",
        })
      );

      // First request (Cache miss)
      await harness.app.request("/api/businesses");

      // Check Redis
      const cached = await harness.redis.get("all-businesses");
      expect(cached).toBeDefined();
      expect(cached[0].businessName).toBe("Cached Business");

      // Manually change DB data
      await harness.db
        .update(businesses)
        .set({ businessName: "Modified" })
        .where(eq(businesses.uen, "UEN-CACHE"));

      // Second request (Cache hit - should still return original name)
      const res = await harness.app.request("/api/businesses");
      const data = await res.json();
      // @ts-expect-error - testing dynamic response body
      expect(data[0].businessName).toBe("Cached Business");
    });
  });

  describe("GET /api/businesses/search", () => {
    it("should find businesses by name", async () => {
      await harness.db
        .insert(businesses)
        .values([
          defaultBusiness({ uen: "S1", businessName: "Apple Store" }),
          defaultBusiness({ uen: "S2", businessName: "Banana Shop" }),
        ]);

      const res = await harness.app.request(
        "/api/businesses/search?name=Apple"
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      // @ts-expect-error - testing dynamic response body
      expect(data[0].businessName).toBe("Apple Store");
    });
  });

  describe("POST /api/businesses/filter", () => {
    it("should filter businesses by category", async () => {
      await harness.db
        .insert(businesses)
        .values([
          defaultBusiness({
            uen: "F1",
            businessName: "Fancy Food",
            businessCategory: "F&B",
          }),
          defaultBusiness({
            uen: "F2",
            businessName: "Tech Tools",
            businessCategory: "Others",
          }),
        ]);

      const res = await harness.app.request("/api/businesses/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_category: ["F&B"] }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      // @ts-expect-error - testing dynamic response body
      expect(data[0].businessCategory).toBe("F&B");
    });
  });

  describe("GET /api/businesses/check-uen", () => {
    it("returns uenAvailability: false when UEN is not registered", async () => {
      const res = await harness.app.request(
        "/api/businesses/check-uen?uen=UNIQUE-UEN-999"
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - testing dynamic response body
      expect(data.uenAvailability).toBe(false);
    });

    it("returns uenAvailability: true when UEN is already registered", async () => {
      await harness.db
        .insert(businesses)
        .values(defaultBusiness({ uen: "TAKEN-UEN-123" }));

      const res = await harness.app.request(
        "/api/businesses/check-uen?uen=TAKEN-UEN-123"
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - testing dynamic response body
      expect(data.uenAvailability).toBe(true);
    });
  });
});
