import type { Context, Next } from "hono";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { errorEnvelopeSchema } from "#shared/contracts/error";

// Mock hono/bun serveStatic as in health.test.ts
vi.mock("hono/bun", () => ({
  serveStatic: () => (_c: Context, next: Next) => next(),
}));

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
    set: vi.fn<(_key: string, _value: unknown, _options?: { ex?: number }) => Promise<unknown>>(),
  },
}));

process.env.DATABASE_URL = "postgresql://sentinel-db-zzz";
process.env.BETTER_AUTH_SECRET = "sentinel-auth-secret-zzz";

const { app } = await import("#server/index");

describe("Rate Limiting Integration - Public API Exceeded", () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it("returns standard 429 error envelope and headers when public API rate limit is exceeded", async () => {
    const resetTime = Date.now() + 30000;
    mockLimit.mockResolvedValueOnce({
      success: false,
      limit: 100,
      remaining: 0,
      reset: resetTime,
    });

    const response = await app.request("/api/listings", {
      headers: {
        "cf-connecting-ip": "198.51.100.42",
      },
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeDefined();
    expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response.headers.get("X-RateLimit-Reset")).toBe(String(resetTime));

    const body: unknown = await response.json();
    const envelope = errorEnvelopeSchema.parse(body);

    expect(envelope.error.code).toBe("rate_limited");
    expect(envelope.error.message).toBe("Too many requests. Please try again later.");
    expect(envelope.error.requestId).toBeDefined();
    expect(response.headers.get("X-Request-Id")).toBe(envelope.error.requestId);
  });
});

describe("Rate Limiting Integration - Public API Allowed", () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it("passes through and attaches rate limit headers on allowed request", async () => {
    const resetTime = Date.now() + 60000;
    mockLimit.mockResolvedValueOnce({
      success: true,
      limit: 100,
      remaining: 95,
      reset: resetTime,
    });

    const response = await app.request("/api/listings", {
      headers: {
        "cf-connecting-ip": "198.51.100.42",
      },
    });

    expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("95");
    expect(response.headers.get("X-RateLimit-Reset")).toBe(String(resetTime));
  });
});

describe("Rate Limiting Integration - Public API Outage Resilience", () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it("fails open when Redis rate limiter experiences an outage", async () => {
    mockLimit.mockRejectedValueOnce(new Error("Redis connection timed out"));

    const response = await app.request("/api/listings", {
      headers: {
        "cf-connecting-ip": "198.51.100.42",
      },
    });

    // Should not return 500 or 429 due to Redis outage
    expect(response.status).not.toBe(500);
    expect(response.status).not.toBe(429);
  });
});

describe("Rate Limiting Integration - Auth API", () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it("returns standard 429 error envelope when auth rate limit is exceeded", async () => {
    const resetTime = Date.now() + 20000;
    mockLimit.mockResolvedValueOnce({
      success: false,
      limit: 30,
      remaining: 0,
      reset: resetTime,
    });

    const response = await app.request("/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "cf-connecting-ip": "198.51.100.99",
      },
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeDefined();
    expect(response.headers.get("X-RateLimit-Limit")).toBe("30");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");

    const body: unknown = await response.json();
    const envelope = errorEnvelopeSchema.parse(body);
    expect(envelope.error.code).toBe("rate_limited");
  });
});

describe("Rate Limiting Integration - Exempt Routes", () => {
  beforeEach(() => {
    mockLimit.mockReset();
  });

  it("does not rate-limit health check endpoint", async () => {
    mockLimit.mockResolvedValue({
      success: false,
      limit: 100,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const response = await app.request("/health");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("does not rate-limit runtime.js endpoint", async () => {
    mockLimit.mockResolvedValue({
      success: false,
      limit: 100,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const response = await app.request("/api/runtime.js");
    expect(response.status).toBe(200);
  });

  it("does not rate-limit smoke probe endpoint", async () => {
    mockLimit.mockResolvedValue({
      success: false,
      limit: 100,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    // Without token it returns 401 unauthorized from handler, not 429 from rate limiter
    const response = await app.request("/api/smoke");
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
  });
});
