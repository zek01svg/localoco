import { describe, it, expect } from "vitest";

import { user, vouchers } from "../../../database/schema";
import { defaultUser } from "../../factories";
import { useIntegrationHarness, mockAuthSession } from "../../harness";

describe("Voucher Routes - Integration Tests", () => {
  const harness = useIntegrationHarness();

  async function insertVoucher(
    userId: string,
    status: "issued" | "used" | "expired" | "revoked" = "issued"
  ) {
    const [v] = await harness.db
      .insert(vouchers)
      .values({
        userId,
        amount: 5,
        status,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .returning();
    return v;
  }

  describe("POST /api/users/vouchers", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await harness.app.request("/api/users/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "some-user", page: 1, limit: 10 }),
      });
      expect(res.status).toBe(401);
    });

    it("returns empty list when user has no vouchers", async () => {
      const u = defaultUser({
        id: "voucher-u1",
        email: "voucheruser1@example.com",
      });
      await harness.db.insert(user).values(u);
      mockAuthSession({ user: u });

      const res = await harness.app.request("/api/users/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "voucher-u1", page: 1, limit: 10 }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - dynamic body
      expect(data.vouchers).toHaveLength(0);
      // @ts-expect-error - dynamic body
      expect(data.total).toBe(0);
    });

    it("returns user vouchers", async () => {
      const u = defaultUser({
        id: "voucher-u2",
        email: "voucheruser2@example.com",
      });
      await harness.db.insert(user).values(u);
      await insertVoucher("voucher-u2", "issued");
      await insertVoucher("voucher-u2", "used");
      mockAuthSession({ user: u });

      const res = await harness.app.request("/api/users/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "voucher-u2", page: 1, limit: 10 }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - dynamic body
      expect(data.vouchers).toHaveLength(2);
    });

    it("filters vouchers by status", async () => {
      const u = defaultUser({
        id: "voucher-u3",
        email: "voucheruser3@example.com",
      });
      await harness.db.insert(user).values(u);
      await insertVoucher("voucher-u3", "issued");
      await insertVoucher("voucher-u3", "used");
      mockAuthSession({ user: u });

      const res = await harness.app.request("/api/users/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "voucher-u3",
          status: "issued",
          page: 1,
          limit: 10,
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - dynamic body
      expect(data.vouchers).toHaveLength(1);
      // @ts-expect-error - dynamic body
      expect(data.vouchers[0].status).toBe("issued");
    });
  });

  describe("PUT /api/users/update-voucher", () => {
    it("returns non-2xx when unauthenticated", async () => {
      const res = await harness.app.request("/api/users/update-voucher", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherId: 1 }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("marks voucher as used", async () => {
      const u = defaultUser({
        id: "voucher-u4",
        email: "voucheruser4@example.com",
      });
      await harness.db.insert(user).values(u);
      const v = await insertVoucher("voucher-u4", "issued");
      mockAuthSession({ user: u });

      const res = await harness.app.request("/api/users/update-voucher", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherId: v.voucherId }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - dynamic body
      expect(data.message).toMatch(/updated/i);

      // Verify in DB
      const updated = await harness.db.query.vouchers.findFirst({
        where: (v2: any, { eq }: any) => eq(v2.voucherId, v.voucherId),
      });
      expect(updated?.status).toBe("used");
    });
  });
});
