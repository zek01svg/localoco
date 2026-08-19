# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- **Listing detail page** (PRS-188): Public listing detail view at
  `/listings/$id` serving canonical details for published businesses
  (`GET /api/listings/:id`). Renders business name, UEN, category, description,
  address, contact options (phone, email, website), weekly opening hours schedule
  with live open-now indicator in Singapore time, accepted payment options, price
  range, and active photo gallery with thumbnail and keyboard navigation. Renders
  Schema.org JSON-LD (`LocalBusiness`) structured data, social and canonical meta tags,
  and stored map coordinates without read-time geocoding. Unpublished (draft,
  pending review, rejected, suspended) listings return 404. Controlled media URLs
  (`GET /api/media/:id`) allow public access for active photos of published
  listings while retaining private owner access for unpublished photos.

- **Map viewport filter and browser map** (PRS-187): Public discovery page
  enhancement layering an interactive Google Map on top of the directory via
  `@vis.gl/react-google-maps`. Server-side bounding box filtering (`north`,
  `south`, `east`, `west` on `GET /api/listings`) filters results before cursor
  pagination against stored coordinates without read-time geocoding. The map is
  loaded lazily so it never gates textual directory discovery; if Maps JavaScript
  is unavailable or fails, an honest visible degraded state is shown while the
  textual directory remains fully usable and interactive.
- **Open-now filter in Business discovery** (PRS-186): Visitors can filter
  Business discovery down to businesses that are open right now in Singapore
  wall-clock time (`GET /api/listings?openNow=true`). Evaluated server-side in
  SQL before cursor pagination against stored `business_hours` (handling
  24-hour schedules, daytime intervals, and overnight windows across midnight),
  composing correctly with `q` search and `category` filtering while preserving
  deterministic keyset pagination.
- **Administrative ownership transfer** (PRS-183): Administrators can move a
  Business to another verified login User via
  `POST /api/businesses/:id/transfer-ownership`. Ownership is not an updatable
  field on any Business or Listing edit path, so it can only change through
  this explicit operation. The transfer is transactional, rejects absent,
  unverified, and synthetic non-login targets, and writes an immutable record
  (actor, previous owner, next owner, reason) to `business_ownership_audit`.
- **Business discovery with text search, category filter, and cursor
  pagination** (PRS-184): Public directory page at `/listings`. `GET
/api/listings` accepts `q` (case- and whitespace-insensitive search across
  name, category, and address — there is no description field on listings yet,
  so "descriptive text" covers those three) and `category` (exact match),
  composing with the existing deterministic keyset pagination; the new
  `GET /api/listings/categories` serves the distinct published categories for
  the filter. Dependency failures answer `503 dependency_unavailable` and
  render a retryable error state, never an empty directory; an honest empty
  state appears only when nothing matched.
- **Listing moderation lifecycle and audit** (PRS-182): Full moderation lifecycle
  for Listings (`draft`, `pending_review`, `published`, `rejected`, `suspended`).
  Owners submit listings for review (`POST /api/businesses/:id/listing/submit`);
  editing a published listing demotes it back to `pending_review` until re-approved.
  Administrators moderate listings (`POST /api/businesses/:id/listing/moderate`) by
  publishing, rejecting, or suspending them with a mandatory reason, writing an
  immutable record to `listing_moderation_audit`. Rejected listings retain the
  administrative reason so owners know what to update. Only published listings
  appear in public discovery (`GET /api/listings`).
- **Administrator role and database-backed authorization** (PRS-175): Dedicated
  `administrator` table (`user_id` foreign key cascade), session middleware
  resolving `isAdmin` directly from the database on every request, and
  `requireAdmin` route guards.
- **Private R2 media and Listing photos** (PRS-181): Business owners can add,
  view, and delete photos on their Listing. Objects live in a private R2
  bucket behind short-lived presigned grants with server-generated keys, the
  per-Business count and per-photo bounds are enforced at the boundary, and
  abandoned uploads are purged by a QStash-signed sweep webhook. Deleting a
  photo is permanent.
- **Server-side address validation and persisted coordinates** (PRS-179): Listing
  addresses are resolved to street-level Singapore coordinates via the Google
  Geocoding API at write time (ADR-0006). `POST /api/businesses` always
  geocodes; `PATCH /api/businesses/:id/listing` re-geocodes only on
  address/postalCode changes. Unresolvable or ambiguous addresses fail with
  `400 invalid_request`; provider outages and quota exhaustion fail with
  `503 dependency_unavailable` — writes never proceed without validated
  coordinates, and reads never call the provider. Listings expose nullable
  `latitude`/`longitude` in responses.
- **Business opening hours** (PRS-180): Owners can set per-day opening hours on their
  business Listing (24-hour days, overnight intervals, wholesale schedule
  replacement). Stored timezone-free and evaluated in Singapore time by a
  tested evaluator; invalid or overlapping schedules are rejected at the
  client, the API boundary, and the database.
- **Business and draft listing creation** (PRS-178): Authenticated and verified
  users can register new businesses with unique Singapore UEN validation, and
  manage draft listings with descriptions, tags, and category metadata.
- **Personal and public profiles** (PRS-176, PRS-177): Authenticated personal
  profile page for managing account details, requesting email address changes,
  and viewing owned businesses; public profiles displaying user identity.
- **Authentication & session management** (PRS-171, PRS-172, PRS-173, PRS-174):
  Complete authentication lifecycle powered by better-auth — email & password
  registration, email verification flow, secure password reset with signed tokens,
  and session middleware.
- **Asynchronous transactional email pipeline** (PRS-170): QStash-backed
  resilient email delivery with compiled HTML/plaintext templates, email
  classification, and Resend provider integration.
- **Distributed rate limiting and caching** (PRS-169): Upstash Redis rate
  limiting with memory fallback and bounded in-memory caching.
- **API contract and OpenAPI specifications** (PRS-167): Standardized error
  envelope, typed request schemas, and dev-only interactive Scalar reference.
- **Postgres data schema & migration harness** (PRS-166): Drizzle migrations
  0001 through 0007 covering auth, businesses, listings, opening hours,
  coordinates, media objects, and administrator roles.
- **Geocoding provider module**: `server/lib/geocoding/` follows the
  external-provider pattern (ADR-0005) — zod validation at the trust
  boundary, typed classified failures, contract tests against a local fake
  HTTP server.
- **Maps & R2 infrastructure**: Terraform-managed server/browser Google Maps API
  keys (`infra/maps.tf`) with Cloud Monitoring alerts, and Cloudflare R2 bucket
  configuration with Secret Manager integration (`infra/r2.tf`).
- **Documentation**: ADRs 0005 (isolate external providers) and 0006 (geocode
  at write time), Maps & R2 deployment steps, API coordinates, opening hours,
  photos, and error documentation.

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
