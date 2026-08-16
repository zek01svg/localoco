# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Asynchronous transactional email pipeline** (PRS-170): Decoupled email
  delivery pipeline using Upstash QStash and Resend. Outgoing verification and
  password reset emails are recorded in PostgreSQL (`email_delivery`) with status
  tracking and enqueued as opaque `{ jobId }` payloads. Incoming QStash webhooks
  (`/api/webhooks/qstash/email-delivery`) verify HMAC signatures, atomically
  claim jobs, and route delivery through Resend or SMTP with automatic
  transient error retries (503) and terminal failure categorization. Includes
  HTML entity escaping, CRLF injection defense, and sensitive token sanitization.
- **API contract and error envelope** (PRS-166): `GET /api/listings` with
  keyset pagination, contract-validated response payloads, and a
  standardized error envelope for every failure on the `/api/*` surface.
  Server-owned `X-Request-Id` correlation ids are echoed on responses and
  attached to server-side log lines. Development environments serve
  interactive API docs (Scalar) at `/api/scalar` and the generated OpenAPI
  document at `/api/openapi`, both absent in production.
- **Pretty development logs**: logtape output is formatted as readable,
  signale-style lines in development (browser and server) and as one JSON
  object per line in production.

## [2.0.0] - 2026-08-14

### Added

- **Rewrite spine**: Bootstrapped the rewrite on a Bun + Hono backend with a
  React 19 SPA (TanStack Router, Vite, Tailwind CSS v4), replacing the old
  Express + plain-React application. The prior app is preserved read-only
  under `legacy/`, excluded from every quality and build lane.
- **CI quality gate**: GitHub Actions lane for every pull request — secret
  scanning, formatting, linting, type checking, unit/integration tests, and
  the production build.
- **Container publish pipeline**: Automated build and publish of the
  production container image to GHCR, gated on a green CI run.
- **Infrastructure baseline**: Terraform-managed GCP Cloud Run service and
  Cloudflare edge configuration for `localoco.ciav.dev`, including IAM,
  Secret Manager wiring, and remote state.
- **Protected production release workflow**: `cd.yml` resolves the published
  image digest, deploys it as a zero-traffic staged revision behind a
  required approval gate, runs database migrations, runs authenticated smoke
  checks against the staged revision, then atomically promotes it to 100%
  traffic. `rollback.yml` shifts traffic back to any retained revision
  without rebuilding.
- **Maintenance landing page**: Every page route (SPA routes, root) now
  serves a branded, accessible LocaLoco maintenance page with `503 Service
Unavailable` and a `Retry-After` header while the rewrite is in progress;
  `/health` keeps returning `200` and depends on nothing external.
- **Agent workflow instructions**: `AGENTS.md`, root `CONTEXT.md` (shared
  domain glossary), and `docs/agents/` (issue tracker and triage-label
  conventions) for coding agents working in this repository.

### Changed

- Documentation (`docs/DEPLOYMENT.md`, `docs/CONTRIBUTING.md`,
  `docs/README.md`) rewritten to describe the new stack, release flow, and
  operator prerequisites.

### Notes

- This release ships infrastructure and a maintenance placeholder, not
  feature parity with the legacy application — see `TODOS.md` for the
  operator steps still required before the first live production release.

## [1.2.0] - 2025-11-07

### Added

- Full-featured React frontend rebuilt under `frontend/` (renamed from
  `src/`), including business profile, forum, map discovery, bookmarks, and
  settings pages, an app sidebar, and an auth store.
- Map Discovery page: dropdown business search, geocoding fallback when
  lat/lng are missing (falling back to the database otherwise), dynamic map
  pin filtering, and a map border.
- Public landing page mounted at the base route, with fade-in styling for
  images on load.
- Business card/detail improvements: dropdown search on the explore page,
  average rating surfaced from the backend, and fixes for missing images.
- "Add Business" dialog and improved profile page display, including a
  working "add business" button and profile picture rendering across forum
  and review pages.
- Settings page with account deletion.
- Signup page postal code validation and a unique-constraint check on
  UEN/email during business signup.

### Changed

- Backend now serves a catch-all route so React Router can handle
  client-side navigation.
- Announcement page's manual URL input replaced with a proper file upload
  button, and its data now posted via POST instead of query params.
- Referral links now point at the Azure-hosted app instead of localhost.
- README rewritten for project submission, including the SQL script
  location.

### Fixed

- Business registration page bugs preventing businesses from registering,
  voucher redemption bugs, and password reset flow issues.
- Hardcoded URLs throughout the frontend replaced with environment-based
  configuration.
- Various merge-conflict cleanups and bug fixes across the forum, sidebar,
  and edit-business dialog surfaced during final integration of teammate
  branches.

### Removed

- Deleted submission screenshots and the Azure App Service GitHub Actions
  workflow file ahead of handoff.

## [1.1.0] - 2025-11-02

### Added

- Business signup fields and new `businessReviews` and `forumPosts` tables,
  later split into dedicated `ForumModel` and `ReviewModel` with a
  `featureRouter` for reviews/forum endpoints.
- Business registration flow: new route, controller, and model to handle
  business sign-ups, plus a base template for the business registration
  page.
- Azure Blob Storage integration for image uploads (new router for
  token/filename generation, dependencies added), replacing local `/uploads`
  storage.
- Password reset via email, using a new Azure Communication Service
  integration, with matching email verification configuration and styled
  email templates for reset/verification.
- Announcement/newsletter feature: new tables, models, and endpoints for
  business announcements, plus an endpoint to fetch a user's own businesses.
- Referral and voucher support: new fields, relations, and a
  `handleReferral` function/route, with a database trigger for referral
  codes and points.
- Session handling additions (`logout`, `get session`) and bookmarks feature
  (new type, routes, controller, and model).
- Azure App Service CI/CD workflow for build and deployment.
- Migrated the backend from JavaScript to TypeScript and moved `main.ts`
  under `src/`.

### Changed

- Consolidated all dependencies into the root `package.json` for simpler
  installs.
- Login/signup handling moved to the backend so environment variables could
  be used safely, with the deployed app URL added to trusted CORS origins
  and hardcoded URLs replaced by environment-based configuration.
- Database schema reset and refreshed several times as the
  auth/referral/voucher/announcement tables stabilized; child tables updated
  to cascade on delete.
- Environment variable loading (`loadEnv.ts`) made to run before the server
  starts, and `DATABASE_URL` renamed to `DB_URL` for consistency.

### Removed

- Dropped the `password` column from the businesses table and the
  `Business` type.
- Deleted the local `uploads/` directory now that images are served from
  Azure Blob Storage.
- Removed the unnecessary `dotenv` dependency (later reintroduced at the
  root level).

### Fixed

- Various deployment bugs: workflow steps ordered to `cd backend` before
  running migrations, `node_modules` removed before deploy, SSL config
  chosen based on prod/dev, and a hardcoded localhost API URL causing 404s
  in production replaced with environment-based URLs.
- UEN not being passed to the database on business signup.

## [1.0.0] - 2025-10-26

### Added

- Initial Express/TypeScript backend and Vite frontend scaffold, migrating
  the project off its previous PHP application (better-auth handler
  mounted, Drizzle ORM configured, root `package.json` with concurrent dev
  script).
- Better-auth tables and Google login support wired into the user auth
  flow.
- New Vite-based frontend project (replacing the earlier vanilla setup)
  with initial auth dependencies.
- Reusable SQL seed script (adapted from the previous backend) for local
  dummy data.

### Changed

- Repository layout reshuffled repeatedly (auth schema moved into
  `src/database`, scripts consolidated in root `package.json`, drizzle
  migration output directory changed).
- Cross-platform script updates so setup works on both macOS and
  Windows/Linux.

### Docs

- Added baseline setup instructions to the README and iterated on them.

## [0.1.0] - Unreleased (no repository history)

The original PHP application predates this repository. Its commit history
was never migrated here, so no dated changelog entries exist for it — this
entry is a placeholder marking that an earlier PHP version of LocaLoco
existed before the 2025-10-24 Express/TypeScript rewrite recorded as
`1.0.0` above.
