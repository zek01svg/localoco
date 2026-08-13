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

The release pipeline is `.github/workflows/cd.yml` (PRS-165). Every step can
stop the release; traffic is only promoted after authenticated smoke checks
pass against the exact image digest.

1. **Build gate (CI)**: every push runs the `ci` workflow — format, lint,
   typecheck, build, unit/integration/e2e tests, dependency audit, secret
   scan, Docker image build, and a Terraform plan (no apply).
2. **Publish (merge to `main`)**: the `publish` workflow builds and pushes
   `ghcr.io/zek01svg/localoco` tagged `main` and `sha-<short>`, and records
   the immutable image digest as a commit status (`ghcr/image`). It does not
   deploy. The digest is the production identity — a tag can move, a digest
   cannot.
3. **Release (manual trigger)**: run `cd.yml` from the Actions tab, choosing
   a commit (default `main`). The pipeline is:

   | Step              | What happens                                                                                                                                                                                                                             |
   | :---------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `resolve-digest`  | Reads the `ghcr/image` status for the chosen commit; fails if no image was published.                                                                                                                                                    |
   | `terraform-apply` | WIF auth, then `terraform apply` with the exact digest image and a traffic split that holds the current revision at 100% and stages the new revision at **0% traffic**.                                                                  |
   | `migrate`         | Runs committed migrations through Drizzle's native migrator over the direct `DATABASE_URL` (read from Secret Manager). Applied set is recorded in the `drizzle.__drizzle_migrations` table. Failure stops the release.                   |
   | `smoke`           | Authenticated checks (Bearer `SMOKE_TOKEN`) against the **zero-traffic revision URL** — `/health` plus `/api/smoke` (DB round-trip echoing the served revision). Unauthenticated requests get 401; nothing internal is exposed publicly. |
   | `promote`         | `terraform apply` clears the hold and atomically shifts traffic to 100% on the staged revision.                                                                                                                                          |

   Promotion is atomic (a single Cloud Run traffic update) and happens only
   after every prior step succeeds. Migrations run while the old revision
   still serves — additive, so the old code keeps working.

4. **Rollback (manual trigger)**: `rollback.yml` points traffic at any
   retained revision without rebuilding. Cloud Run retains previous
   revisions automatically. See the runbook below.

### Operator prerequisites (one-time)

- `main` exists and `publish.yml` has run (the digest status).
- GitHub secrets set: `GCP_WIF_PROVIDER`, `GCP_SA`, `CLOUDFLARE_API_TOKEN`.
- Every app secret has at least one version (Cloud Run fails the revision if
  a referenced secret version is missing) — see §3.

---

## 3. Configuration & Secrets

Secret values never touch Terraform variables, plan output, or state.
Terraform owns the containers and their IAM; operators add versions through
protected channels (Secret Manager).

| Secret container     | Purpose                                     |
| :------------------- | :------------------------------------------ |
| `DATABASE_URL`       | PostgreSQL connection string                |
| `BETTER_AUTH_SECRET` | Better Auth encryption secret (>= 32 chars) |
| `SMOKE_TOKEN`        | Bearer token for the release smoke check    |
| `SMTP_HOST`          | SMTP host                                   |
| `SMTP_PORT`          | SMTP port (e.g. `587`)                      |
| `SMTP_SECURE`        | TLS for SMTP (`true`/`false`)               |
| `SMTP_USER`          | SMTP username                               |
| `SMTP_PASS`          | SMTP password                               |
| `SMTP_FROM`          | Default sender address                      |

Add a version after apply:

```bash
gcloud secrets versions add DATABASE_URL --project localoco-505304 --data-file=-
```

Deferred credentials (R2, Maps, Upstash) are attached to the slices that
first need them, not provisioned ahead of time.

---

## 4. Rollback & Incidents

Rollback never rebuilds an artifact: Cloud Run retains deployed revisions,
so moving traffic is instant and reversible.

### Rollback runbook

1. Find the revision to restore — the previous release's staged revision is
   in that release's Actions summary; any revision can be listed with:
   `gcloud run revisions list --region=asia-southeast1`.
2. Run the **Rollback Cloud Run traffic** workflow from the Actions tab with
   the revision name (e.g. `localoco-00003-abcd`).
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
- **Maintenance landing (PRS-168)**: while the rewrite is in progress, every
  page route answers `503 Service Unavailable` with a `Retry-After` header and
  serves the SPA shell, whose `LandingPage` feature renders the branded
  maintenance copy. Crawlers and monitors see the "not ready" status; `/health`
  still reports success so Cloud Run keeps the instance alive. Swap the page
  route for the SPA fallback once the app is ready to serve.
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
