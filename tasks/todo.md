# Task: Upstash Redis Caching & Rate Limiting

## Status: Built & Verified

- [x] Plan approval & environment configuration
  - [x] Add `@upstash/redis` and `@upstash/ratelimit` dependencies
  - [x] Update `server/env.ts` with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
  - [x] Update `.env.example`
  - [x] Update `infra/secrets.tf` and `docs/DEPLOYMENT.md`
- [x] Core Redis Integration
  - [x] Create `server/lib/redis.ts` with direct Upstash Redis client initialization (REST connectionless)
- [x] Distributed Rate Limiting Engine
  - [x] Create `server/lib/rate-limit.ts` using `@upstash/ratelimit`
  - [x] Implement client IP extraction for Cloudflare/Cloud Run (`cf-connecting-ip` / `x-forwarded-for`)
  - [x] Implement 429 response handling with standard headers (`Retry-After`, `X-RateLimit-*`) and `HttpError(429, "rate_limited", ...)` matching the error envelope
  - [x] Implement error handling for Redis outages (fail-open for public routes, graceful fallback)
- [x] Redis Caching Helper
  - [x] Create `server/lib/cache.ts` for clean, transparent read/write caching
  - [x] Add error handling: transparent fallback to origin on Redis read/write failure
  - [x] Integrate caching into `GET /api/listings` in `server/routes/listings.ts`
- [x] Server Wiring & Route Protection
  - [x] Mount rate limiting middleware on `/api/*` and `/api/auth/*` in `server/index.ts`
  - [x] Keep system routes (`/health`, `/smoke`, `/api/runtime.js`) exempt
  - [x] Create `server/lib/index.ts` barrel export and ensure `oxlint` max-dependencies rule passes
- [x] Documentation
  - [x] Update `docs/API.md` with rate limiting headers and 429 error documentation
- [x] Verification & Testing
  - [x] Create unit tests in `server/tests/unit/rate-limit.test.ts`
  - [x] Create unit tests in `server/tests/unit/cache.test.ts`
  - [x] Create integration tests in `tests/integration/rate-limit.test.ts`
  - [x] Run `bun run lint:check`, `bun run format:check`, `bun run type:check`, `bun run test`, `bun run build`

## Review

All builder deliverables have been implemented and verified:

- Distributed rate limiting is implemented via `@upstash/ratelimit` with IP resolution via `CF-Connecting-IP` / `X-Forwarded-For`.
- Rate limiting enforces 100 req/60s on public endpoints and 30 req/60s on auth endpoints, while exempting `/health`, `/smoke`, and `/api/runtime.js`.
- Outage resilience: rate limiting fails open on Redis errors; caching falls back to origin on Redis read/write errors.
- Standard error envelope is preserved on 429 errors with `Retry-After` and `X-RateLimit-*` headers.
- All linter (`oxlint`), formatter (`oxfmt`), TypeScript (`tsc`), Vitest unit & integration tests, and build checks pass with 0 errors and 0 warnings.
