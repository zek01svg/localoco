import type { MiddlewareHandler } from "hono";

import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createErrorHandler } from "#server/lib/errors";
import { createRateLimiter, getClientIp } from "#server/lib/rate-limit";

type LimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const { mockLimit } = vi.hoisted(() => ({
  mockLimit: vi.fn<(_key: string) => Promise<LimitResult>>(),
}));

vi.mock("@upstash/ratelimit", () => {
  class MockRatelimit {
    static slidingWindow = vi.fn<(_reqs: number, _window: string) => void>();
    limit = mockLimit;
  }
  return { Ratelimit: MockRatelimit };
});

vi.mock("#server/lib/redis", () => ({
  redis: {
    get: vi.fn<(_key: string) => Promise<unknown>>(),
    set: vi.fn<(_key: string, _value: unknown) => Promise<unknown>>(),
  },
}));

const makeIpApp = () => {
  const app = new Hono();
  app.get("/ip", c => c.text(getClientIp(c)));
  return app;
};

const makeLimitedApp = (limiter: MiddlewareHandler) => {
  const logger = {
    warning: vi.fn<(_msg: string, _props: Record<string, unknown>) => void>(),
    error: vi.fn<(_err: Error, _props: Record<string, unknown>) => void>(),
  };

  const app = new Hono<{ Variables: { requestId: string } }>();
  app.use(async (c, next) => {
    c.set("requestId", "req-test");
    await next();
  });
  app.use("/test", limiter);
  app.get("/test", c => c.json({ ok: true }));
  app.onError(createErrorHandler({ logger }));
  return app;
};

describe("getClientIp", () => {
  it("extracts cf-connecting-ip when present", async () => {
    const app = makeIpApp();
    const res = await app.request("/ip", {
      headers: { "cf-connecting-ip": " 203.0.113.195 " },
    });
    expect(await res.text()).toBe("203.0.113.195");
  });

  it("extracts first ip from x-forwarded-for when cf-connecting-ip is missing", async () => {
    const app = makeIpApp();
    const res = await app.request("/ip", {
      headers: { "x-forwarded-for": " 198.51.100.1 , 10.0.0.1, 127.0.0.1" },
    });
    expect(await res.text()).toBe("198.51.100.1");
  });

  it("prioritizes cf-connecting-ip over x-forwarded-for", async () => {
    const app = makeIpApp();
    const res = await app.request("/ip", {
      headers: {
        "cf-connecting-ip": "203.0.113.1",
        "x-forwarded-for": "198.51.100.1",
      },
    });
    expect(await res.text()).toBe("203.0.113.1");
  });

  it("falls back to unknown when no ip headers are provided", async () => {
    const app = makeIpApp();
    const res = await app.request("/ip");
    expect(await res.text()).toBe("unknown");
  });

  it("falls back to x-forwarded-for when cf-connecting-ip contains only whitespace", async () => {
    const app = makeIpApp();
    const res = await app.request("/ip", {
      headers: {
        "cf-connecting-ip": "   ",
        "x-forwarded-for": "198.51.100.2",
      },
    });
    expect(await res.text()).toBe("198.51.100.2");
  });
});

describe("rate limiting success path", () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it("allows request and sets X-RateLimit headers on success", async () => {
    mockLimit.mockResolvedValueOnce({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    });

    const limiter = createRateLimiter({
      requests: 100,
      window: "60 s",
      prefix: "test-success",
    });

    const app = new Hono();
    app.use("/test", limiter);
    app.get("/test", c => c.json({ ok: true }));

    const res = await app.request("/test", {
      headers: { "cf-connecting-ip": "1.2.3.4" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("99");
    expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
  });
});

describe("rate limiting limit exceeded", () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it("blocks request with 429 HttpError and Retry-After header when limit exceeded", async () => {
    const resetTime = Date.now() + 15000;
    mockLimit.mockResolvedValueOnce({
      success: false,
      limit: 100,
      remaining: 0,
      reset: resetTime,
    });

    const limiter = createRateLimiter({
      requests: 100,
      window: "60 s",
      prefix: "test-exceeded",
    });

    const app = makeLimitedApp(limiter);
    const res = await app.request("/test", {
      headers: { "cf-connecting-ip": "1.2.3.4" },
    });

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "rate_limited",
        message: "Too many requests. Please try again later.",
        requestId: "req-test",
      },
    });
    expect(res.headers.get("Retry-After")).toBeDefined();
    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(15);
  });
});

describe("rate limiting retry-after calculation", () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it("clamps Retry-After to at least 1 second even if reset is in the past or now", async () => {
    mockLimit.mockResolvedValueOnce({
      success: false,
      limit: 100,
      remaining: 0,
      reset: Date.now() - 5000,
    });

    const limiter = createRateLimiter({
      requests: 100,
      window: "60 s",
      prefix: "test-clamp",
    });

    const app = makeLimitedApp(limiter);
    const res = await app.request("/test", {
      headers: { "cf-connecting-ip": "1.2.3.4" },
    });

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("1");
  });
});

describe("rate limiting outage resilience", () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it("fails open when Upstash Redis throws a network or server error and failClosed is false", async () => {
    mockLimit.mockRejectedValueOnce(new Error("Connection timeout to Upstash Redis"));

    const limiter = createRateLimiter({
      requests: 100,
      window: "60 s",
      prefix: "test-outage-open",
    });

    const app = makeLimitedApp(limiter);
    const res = await app.request("/test", {
      headers: { "cf-connecting-ip": "1.2.3.4" },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("fails closed with 503 dependency_unavailable when Upstash Redis throws an error and failClosed is true", async () => {
    mockLimit.mockRejectedValueOnce(new Error("Connection timeout to Upstash Redis"));

    const limiter = createRateLimiter({
      requests: 30,
      window: "60 s",
      prefix: "test-outage-closed",
      failClosed: true,
    });

    const app = makeLimitedApp(limiter);
    const res = await app.request("/test", {
      headers: { "cf-connecting-ip": "1.2.3.4" },
    });

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      error: {
        code: "dependency_unavailable",
        message: "Rate limiter service unavailable. Please try again later.",
        requestId: "req-test",
      },
    });
  });
});
