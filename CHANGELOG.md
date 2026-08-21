# Changelog

All notable changes to this project will be documented in this file.

## [2.3.0] - 2026-08-22

### Changed

- **Visual identity refresh** ("five-foot way"): charcoal + salmon palette, new fonts, and shared `SiteHeader`/`SiteFooter` layout, documented in `docs/DESIGN.md`.
- PostgreSQL client standardized on `postgres` (postgres.js) — the redundant `pg`/`@types/pg` dependency is removed; all test suites now use the same driver as production.
- CI: Bun setup deduplicated into a shared composite action (`.github/actions/setup-bun`); unit and integration tests now run as separate jobs.
- Unused code and exports removed (reported by `knip`).

## [2.2.0] - 2026-08-21

### Added

- **Likes** (PRS-193): idempotent likes on reviews, forum posts, and replies with `likeCount`/`isLiked` batched via SQL and `LikeButton` UI with optimistic updates.
- **Announcements** (PRS-185): business announcements for published listings — 8 routes (`GET /announcements`, `GET /announcements/:id`, `POST /businesses/:id/announcements`, `GET /businesses/:id/announcements`, `PATCH`, `DELETE`, `POST /announcements/:id/moderate`, `GET /announcements/:id/audits`) with `announcement_visibility_dates_check`, `publiclyVisibleAnnouncement` predicate, and zero email side-effect.
- **Events** (PRS-192): business events with mandatory `startsAt`/`endsAt` (`event_time_bounds_check` + `endsAt < startsAt` 400), `publiclyVisibleEvent`, moderation/restore with audit, and Schema.org `Event` structured data.
- **Forum moderation** (PRS-194): administrator moderation of forum posts/replies (`moderatedAt` + immutable `forum_moderation_audit`, `FOR UPDATE` transactions, `includeDeleted` admin-only, audit endpoints).
- **Account deletion** (PRS-197): `GET /profile/deletion-preview` (owned listings / authored contributions / affected forum posts / third-party replies) and `DELETE /profile` / `POST /profile/delete` with password + `DELETE` confirmation, session revocation, R2 `deleteObject` (`Promise.allSettled`), and single-transaction FK cascade hard-delete.
- **Production seed** (PRS-198): standalone `scripts/seed.ts` (`bun run db:seed`) — single transaction, deterministic UUIDs, `onConflictDoNothing`, 6 synthetic users, zero `account`/`session` rows.
- **Observability & infra**: Sentry release tracking via `shared/release.ts` (`resolveRelease`), server `Sentry.withIsolationScope` + `requestId` tag, client `tanstackRouterBrowserTracingIntegration` + privacy-preserving replay; `infra/maps.tf` least-privilege API keys + referrers + `geocoding_request_rate` alert, `infra/iam.tf` roles, and `Dockerfile.local` migrations-before-startup.

### Changed

- Legacy application removed (`legacy/` deleted) — rewrite spine is now the sole product.
- Development E2E coverage expanded with auth, discovery, listing, forum, profile, and business flows.
- Infra: Google Maps credentials, alert policies, and local referrers configured.

### Fixed

- Announcements `PATCH` now merges persisted dates and returns `400 invalid_request` when `endsAt < startsAt` (previously hit DB check as 500).
- Listing detail open-now badge contrast fixed (`bg-emerald-600` → `bg-emerald-800`) to pass WCAG AA.
- QStash loopback handling, Bun 1.4 dependency repair, and typecheck fixes.

## [2.1.0] - 2026-08-19

### Added

- **Application baseline on the rewrite spine**: the full product ships on the
  React 19 + Bun/Hono stack — auth, businesses, listings, media, reviews,
  forum, and bookmarks.
- **Authentication & sessions** (PRS-171–175): email/password registration
  with email verification, password reset, session middleware, and the
  administrator role with database-backed authorization.
- **Businesses & listings** (PRS-178–181): UEN-validated business
  registration, draft listings, server-side address validation with persisted
  coordinates (ADR-0006), opening hours, and private R2 photo management.
- **Moderation & ownership** (PRS-182–183): listing moderation lifecycle with
  immutable audit records, and administrative business ownership transfer.
- **Discovery** (PRS-184–188): public directory with text search, category
  and open-now filters, map viewport filtering, and listing detail pages with
  Schema.org structured data.
- **Reviews and Forum** (PRS-190–191): verified-user reviews with SQL-derived
  ratings, and forum posts/replies with soft deletion and cursor pagination.
- **Bookmarks** (PRS-189): private, database-enforced bookmarks on the
  personal profile page.
- **Plumbing** (PRS-166–170): API contract with error envelope, distributed
  rate limiting, bounded caching, and an asynchronous transactional email
  pipeline.

### Changed

- `listing` table gains nullable `latitude`/`longitude` columns (migration
  `0006_listing_coordinates`). Existing rows render without a Listing
  location until their address is next edited.

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
