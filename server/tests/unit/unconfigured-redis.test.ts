import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { deleteCacheKeys, getOrSetCache } from "#server/lib/cache";
import { createRateLimiter } from "#server/lib/rate-limit";

// Mock redis module as null (representing unconfigured Redis in local dev / test)
vi.mock("#server/lib/redis", () => ({
  redis: null,
}));

describe("Unconfigured Redis behavior", () => {
  describe("createRateLimiter with null redis", () => {
    it("gracefully allows requests through without rate limiting or setting headers", async () => {
      const limiter = createRateLimiter({
        requests: 10,
        window: "60 s",
        prefix: "unconfigured-test",
      });

      const app = new Hono();
      app.use("/test", limiter);
      app.get("/test", c => c.json({ ok: true }));

      const res = await app.request("/test", {
        headers: { "cf-connecting-ip": "1.2.3.4" },
      });

      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ ok: true });
      expect(res.headers.get("X-RateLimit-Limit")).toBeNull();
      expect(res.headers.get("X-RateLimit-Remaining")).toBeNull();
      expect(res.headers.get("X-RateLimit-Reset")).toBeNull();
    });
  });

  describe("getOrSetCache with null redis", () => {
    it("transparently invokes fetcher and returns data without caching", async () => {
      const freshData = { test: "unconfigured-cache-data" };
      const fetcher = vi.fn<() => Promise<{ test: string }>>().mockResolvedValue(freshData);

      const result = await getOrSetCache("test:key", 60, fetcher);

      expect(result).toEqual(freshData);
      expect(fetcher).toHaveBeenCalledOnce();
    });
  });

  describe("deleteCacheKeys with null redis", () => {
    it("resolves cleanly without error when redis is null", async () => {
      await expect(deleteCacheKeys("test:key")).resolves.toBeUndefined();
    });
  });
});
