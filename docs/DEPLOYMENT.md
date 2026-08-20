# Deployment & Production Guide

This guide covers the production deployment of **LocaLoco**: one Cloud Run
origin behind the Cloudflare edge, provisioned with Terraform. Infrastructure
details and bootstrap steps live in [`infra/README.md`](../infra/README.md);
this page describes the release flow and runtime.

---

## 1. Production Architecture

```
Client ──► Cloudflare edge (proxied, WAF, Universal SSL, strict origin TLS)
               └──► Cloud Run `localoco` (asia-southeast-1, project localoco-505304)
                        ├── API routes (Hono/Bun, dist/index.js)
                        └── static SPA assets (dist/static/)
```

- **Origin**: Cloud Run service `localoco` — request-based billing
  (`cpu_idle`), zero minimum instances, max three. Public invoker so the
  proxied edge can reach it.
- **Edge**: `localoco.ciav.dev` resolves through Cloudflare Free (proxied),
  protected by the Free Managed WAF ruleset and always-on standard DDoS
  protection. Universal SSL covers the hostname automatically; the zone is
  set to Full (strict) so the edge verifies the origin certificate.
- **Backend process**: Bun runs the minified server entry `dist/index.js`,
  listening on the injected `PORT` (default `4001`) on all interfaces. Hono
  serves the compiled SPA from `dist/static/`; non-API requests fall back to
  `dist/static/index.html` for client-side routing.
- **Runtime env injection**: `/api/runtime.js` injects production `VITE_*`
  values into `window.__env` at startup.

---

## 2. Release Flow

The release pipeline is fully automated — every merge to `main` triggers a
linear chain of GitHub Actions workflows. Each step gates the next; traffic
is only promoted after authenticated smoke checks pass against the staged
revision.

```
push to main → CI → Publish → CD
```

1. **CI (`ci.yml`)**: every push runs format, lint, typecheck, build,
   unit/integration/e2e tests, dependency audit, secret scan, Docker image
   build, and Terraform plan (no apply).

2. **Publish (`publish.yml`)**: triggered automatically via `workflow_run`
   when CI succeeds on `main`. Computes the unified Sentry release identifier
   (`localoco@<version>+sha-<short>`), passes it as build args into the Docker
   image and `@sentry/vite-plugin` for sourcemap uploads, and pushes
   `ghcr.io/zek01svg/localoco` tagged `main` and `sha-<short>` to GHCR.
   It does not deploy. The SHA-tagged image is the production identity.

3. **Deploy (`cd.yml`)**: triggered automatically via `workflow_run` when
   Publish succeeds on `main`. The pipeline is:

   | Step             | What happens                                                                                                                                                                                              |
   | :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `resolve-digest` | Logs into GHCR and resolves the image by `sha-<short>` tag matching the triggering commit; fails if no image was published.                                                                               |
   | `deploy-stage`   | WIF auth to GCP, pins the currently-serving revision for rollback, then deploys the resolved image as a new revision at **0% traffic** with a `staged` tag. Outputs the staged revision name and tag URL. |
   | `migrate`        | Runs committed migrations through Drizzle Kit over the direct `DATABASE_URL`. Failure stops the release. Migrations are additive so the old revision keeps working.                                       |
   | `smoke`          | Authenticated checks (Bearer `SMOKE_TOKEN`) against the **zero-traffic staged revision URL** — `/health` plus `/api/smoke` (DB round-trip echoing the served revision).                                   |
   | `promote`        | Atomically shifts 100% traffic to the staged revision via `gcloud run services update-traffic`.                                                                                                           |

   Promotion is atomic and happens only after every prior step succeeds.

4. **Rollback (manual trigger)**: `rollback.yml` points traffic at any
   retained revision without rebuilding. Cloud Run retains previous
   revisions automatically. See the runbook below.

### Operator prerequisites (one-time)

- `main` exists and the full CI → Publish chain has run at least once.
- GitHub secrets set: `GCP_WIF_PROVIDER`, `GCP_SA`, `DATABASE_URL`.
- `SMOKE_TOKEN` stored in GCP Secret Manager (accessed at deploy time).
- Every app secret has at least one version (Cloud Run fails the revision if
  a referenced secret version is missing) — see §3.

---

## 3. Configuration & Secrets

Secret values never touch Terraform variables, plan output, or state.
Terraform owns the containers and their IAM; operators add versions through
protected channels (Secret Manager).

| Secret container             | Purpose                                                           |
| :--------------------------- | :---------------------------------------------------------------- |
| `DATABASE_URL`               | PostgreSQL connection string                                      |
| `BETTER_AUTH_SECRET`         | Better Auth encryption secret (>= 32 chars)                       |
| `SMOKE_TOKEN`                | Bearer token for the release smoke check                          |
| `SENTRY_DSN`                 | Sentry Server DSN for error and trace ingestion                   |
| `VITE_SENTRY_DSN`            | Sentry Browser DSN served to client via /api/runtime.js           |
| `UPSTASH_REDIS_REST_URL`     | Upstash Redis REST URL for caching and rate limiting              |
| `UPSTASH_REDIS_REST_TOKEN`   | Upstash Redis REST Token                                          |
| `QSTASH_TOKEN`               | Upstash QStash REST Token for email queue publishing              |
| `QSTASH_CURRENT_SIGNING_KEY` | Upstash QStash current signing key for HMAC validation            |
| `QSTASH_NEXT_SIGNING_KEY`    | Upstash QStash next signing key for key rotation                  |
| `RESEND_API_KEY`             | Resend API Key for transactional email sending                    |
| `AWS_ACCESS_KEY_ID`          | R2 API token Access Key ID (Listing photo storage)                |
| `AWS_SECRET_ACCESS_KEY`      | R2 API token secret (Listing photo storage)                       |
| `AWS_S3_BUCKET`              | R2 bucket name: `localoco-listing-photos`                         |
| `AWS_S3_ENDPOINT`            | R2 S3 endpoint, e.g. `https://<account>.r2.cloudflarestorage.com` |

Add a version after apply:

```bash
gcloud secrets versions add DATABASE_URL --project localoco-505304 --data-file=-
```

### Google Maps Platform

Geocoding credentials are provisioned by Terraform (`infra/maps.tf`), not by
operator steps:

- **Server key** (`google_apikeys_key.server`): restricted to the Geocoding
  API backend only, injected directly into the Cloud Run environment as
  `GOOGLE_MAPS_API_KEY`. The app geocodes listing addresses at write time
  (ADR-0006); without the key, listing writes fail explicitly with
  `503 dependency_unavailable`.
- **Browser key** (`google_apikeys_key.browser`): restricted to the Maps
  JavaScript API and the `localoco.ciav.dev` referrer. The client map UI
  (discovery map, listing detail map) consumes it via
  `VITE_GOOGLE_MAPS_API_KEY`; the Maps JavaScript API service is enabled in
  `infra/state-bucket.tf`.
- **Alert**: `google_monitoring_alert_policy.geocoding_request_rate` fires
  when geocoding request volume exceeds 2000 requests per 5 minutes, well
  below the 3000 queries/minute provider rate limit.

Manual steps (need the Google Cloud console, once):

1. Enable billing on the project (`localoco-505304`) — Maps Platform APIs
   require a billing account.
2. Set a daily usage cap: Google Maps Platform console → **Quotas** →
   **Geocoding API** → cap daily usage at 40,000 requests. This stays inside
   the $200/month free credit at Geocoding's $5 per 1,000 requests; the
   Cloud Monitoring alert (2000 requests per 5 minutes) fires long before a
   runaway loop reaches it. Geocoding is billed per request with no default
   daily quota, and the cap is a console setting — it cannot be managed
   through Terraform (Geocoding no longer exposes a Service Usage quota
   limit).
3. Verify a geocode round-trip after the next apply:
   `curl -s "https://maps.googleapis.com/maps/api/geocode/json?address=1%20Boon%20Lay%20Drive%20649902&key=<server key>"` —
   expect `"status": "OK"` with a `ROOFTOP` result in Singapore.
4. Verify the client map renders in production: the map UI loads when
   `VITE_GOOGLE_MAPS_API_KEY` is set on the Cloud Run service. The Maps
   JavaScript API (`maps-backend.googleapis.com`) is enabled in
   `infra/state-bucket.tf` and the browser key's restriction already points
   at it.

### R2 Listing photos bootstrap (one-time)

Terraform creates the bucket (`infra/r2.tf`) and the secret containers, but
two steps need the Cloudflare dashboard or S3 API:

1. **R2 API token**: create a token scoped to the `localoco-listing-photos`
   bucket with Object Read & Write, then store its Access Key ID / Secret as
   `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` secret versions.
2. **CORS**: the presigned uploads are browser `PUT`s from the client origin,
   so allow it via the S3 CORS API (the Terraform provider has no R2 CORS
   resource):

   ```bash
   aws s3api put-bucket-cors --endpoint-url "$AWS_S3_ENDPOINT" \
     --cors-configuration '{"CORSRules":[{"AllowedOrigins":["https://localoco.ciav.dev"],"AllowedMethods":["PUT","GET","DELETE"],"AllowedHeaders":["content-type"],"MaxAgeSeconds":3600}]}'
   ```

3. **Sweep schedule**: the media sweep endpoint must be called periodically.
   Create a QStash schedule (or equivalent cron) that POSTs
   `{"job":"media-sweep"}` to
   `https://localoco.ciav.dev/api/webhooks/qstash/media-sweep` with QStash
   signing enabled (the endpoint verifies the `upstash-signature` header);
   hourly is a reasonable default.

Local development can leave all four `AWS_*` variables unset: photo endpoints
answer `503 dependency_unavailable` and the rest of the app is unaffected.

---

## 4. Rollback & Incidents

Rollback never rebuilds an artifact: Cloud Run retains deployed revisions,
so moving traffic is instant and reversible.

### Rollback runbook

1. Find the revision to restore — the previous release's staged revision is
   in that release's Actions summary; any revision can be listed with:
   `gcloud run revisions list --region=asia-southeast1`.
2. Run the **Rollback Cloud Run traffic** workflow from the Actions tab with
   the revision name (e.g. `localoco-00003-abcd`). The `production`
   environment approval is required.
3. Verify: `curl https://localoco.ciav.dev/health` and check the served
   revision via `/api/smoke` with `SMOKE_TOKEN`.

### When to roll back

- Smoke checks failed but promotion already happened (race) — roll back to
  the previous release's staged revision.
- Any user-visible regression after promotion. The previous revision is
  guaranteed to exist — Cloud Run retains it.

### Post-incident

- Record the incident in the Linear ticket, then either fix forward via a
  new release (`cd.yml`) or re-run migrations if schema and code drifted.

---

## 5. Health Checks & Monitoring

- **Health endpoint**: `GET /health` returns `200 OK` with `{"status": "ok"}`
- **Page routes**: every non-API, non-health page route answers `200 OK` with
  the SPA shell (`Cache-Control: no-store`); the client-rendered React app
  draws the landing page and any route-level pending, error, and not-found
  states. Fingerprinted build assets under `/assets/*` are served with
  `Cache-Control: public, max-age=31536000, immutable`.
- **Docker healthcheck**: the image ships `HEALTHCHECK` probing `/health` on
  the injected `PORT` (default `4001`)
- Cloud Run restarts unhealthy instances automatically; the Cloudflare edge
  absorbs traffic during instance scaling

---

## 6. Local Standalone Run

Without infrastructure (e.g. a VPS or local box):

```bash
bun install --frozen-lockfile
bun run build
NODE_ENV=production PORT=4001 bun dist/index.js
```

A reverse proxy (Nginx, Caddy, or Cloudflare) terminates TLS and forwards to
the server on `127.0.0.1:4001`, preserving the original `Host` and
`X-Forwarded-*` headers. This path is for evaluation; production runs on
Cloud Run behind Cloudflare.
