import type { Context, MiddlewareHandler } from "hono";

import { Ratelimit } from "@upstash/ratelimit";

import { HttpError } from "#server/lib/errors";
import { redis } from "#server/lib/redis";
import { getAppLogger } from "#shared/logger";

const logger = getAppLogger("server", "rate-limit");

export const getClientIp = (c: Context): string => {
  const cfIp = c.req.header("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;
  const xff = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  return "unknown";
};

function handleRateLimitFailure(ip: string, err: unknown, failClosed?: boolean): void {
  if (err instanceof HttpError) {
    throw err;
  }
  logger.warning("rate_limit.error", { ip, error: String(err) });
  if (failClosed) {
    throw new HttpError(
      503,
      "dependency_unavailable",
      "Rate limiter service unavailable. Please try again later."
    );
  }
}

export const createRateLimiter = (options: {
  requests: number;
  window: `${number} ${"s" | "m" | "h" | "d"}`;
  prefix: string;
  failClosed?: boolean;
}): MiddlewareHandler => {
  const limiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(options.requests, options.window),
        prefix: `localoco:ratelimit:${options.prefix}`,
      })
    : null;

  return async (c, next) => {
    if (!limiter) {
      await next();
      return;
    }

    const ip = getClientIp(c);

    try {
      const { success, limit, remaining, reset } = await limiter.limit(ip);

      c.header("X-RateLimit-Limit", String(limit));
      c.header("X-RateLimit-Remaining", String(remaining));
      c.header("X-RateLimit-Reset", String(reset));

      if (!success) {
        const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
        c.header("Retry-After", String(retryAfterSeconds));
        throw new HttpError(429, "rate_limited", "Too many requests. Please try again later.");
      }
    } catch (err) {
      handleRateLimitFailure(ip, err, options.failClosed);
    }

    await next();
  };
};

export const publicRateLimit = createRateLimiter({
  requests: 100,
  window: "60 s",
  prefix: "public",
});

export const authRateLimit = createRateLimiter({
  requests: 30,
  window: "60 s",
  prefix: "auth",
  failClosed: true,
});
