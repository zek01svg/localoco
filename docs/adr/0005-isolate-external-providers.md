# ADR-0005: Isolate external providers behind a narrow seam

Status: Accepted

Date: 2026-08-18

## Context

LocaLoco calls external providers (Resend for transactional email, Google
Maps Platform for geocoding, Upstash for queues/rate limits). Each call
crosses a trust boundary: the response arrives over the network and must not
be trusted. Providers also fail — quotas, outages, 5xx responses, and
malformed payloads are normal events, not bugs. Without a shared pattern,
every integration reinvents error classification and leaks provider
vocabulary into routes and contracts.

## Decision

External providers live in `server/lib/<provider>/` as a narrow module with:

1. **An async seam**: a factory (`createGeocoder({ apiKey, baseUrl?, fetchImpl? })`)
   with constructor-injected endpoint and fetch, so contract tests run
   against local fakes without env games or network.
2. **Zod validation at the trust boundary**: the raw HTTP body is parsed and
   validated immediately; anything that fails validation is classified as
   `invalid_response`, never silently passed upward.
3. **Typed, classified failures**: the module throws a single typed error
   whose `kind` is one of a small closed set (`not_found`, `ambiguous`,
   `quota_exhausted`, `provider_unavailable`, `invalid_response`). Raw
   provider status codes never escape the module.
4. **No fallbacks**: a failed provider call never degrades into a fake
   success. Callers surface the failure explicitly with a stable HTTP mapping
   (`quota_exhausted` / `provider_unavailable` / `invalid_response` → 503
   `dependency_unavailable`; `not_found` / `ambiguous` → 400
   `invalid_request`) and a machine-readable `details.reason` equal to the
   failure kind.
5. **Contract tests**: each provider module has unit tests that exercise its
   classification logic against a local fake HTTP server, covering success,
   every failure kind, and malformed bodies.

Routes and contracts never import provider SDKs or types; they depend only on
the seam in `server/lib/`.

## Consequences

- New provider integrations follow a known shape (see `server/lib/email/` and
  `server/lib/geocoding/`), including the R2 media slice (PRS-181).
- Classified failures give operators alertable, stable signals (a quota
  alarm fires on `quota_exhausted`, not on an unreadable 5xx log line).
- The cost is a small amount of classification code per provider, repaid by
  not re-deriving it in routes and by honest error responses to clients.
