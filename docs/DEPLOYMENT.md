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

1. **Build gate (CI)**: every push runs the `ci` workflow — format, lint,
   typecheck, build, unit/integration/e2e tests, dependency audit, secret
   scan, Docker image build, and a Terraform plan (no apply).
2. **Publish (merge to `main`)**: the `publish` workflow builds and pushes
   `ghcr.io/zek01svg/localoco` tagged `main` and `sha-<short>`, and records
   the immutable image digest as a commit status (`ghcr/image`). It does not
   deploy.
3. **Deploy (manual, immutable)**: a deploy ticket promotes a verified
   digest to production per ADR-0007 — set the origin image and apply. The
   application container never runs migrations or seeds; those run
   separately. Apply is deliberate and not automated.

---

## 3. Configuration & Secrets

Secret values never touch Terraform variables, plan output, or state.
Terraform owns the containers and their IAM; operators add versions through
protected channels (Secret Manager).

| Secret container     | Purpose                                     |
| :------------------- | :------------------------------------------ |
| `DATABASE_URL`       | PostgreSQL connection string                |
| `BETTER_AUTH_SECRET` | Better Auth encryption secret (>= 32 chars) |
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

## 4. Health Checks & Monitoring

- **Health endpoint**: `GET /health` returns `200 OK` with `{"status": "ok"}`
- **Docker healthcheck**: the image ships `HEALTHCHECK` probing `/health` on
  the injected `PORT` (default `4001`)
- Cloud Run restarts unhealthy instances automatically; the Cloudflare edge
  absorbs traffic during instance scaling

---

## 5. Local Standalone Run

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
