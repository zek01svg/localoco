# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Rewrite spine**: Imported the `react-hono-template` v1.3.0 spine as the
  base of the LocaLoco rewrite (Bun + Hono server, React 19 SPA via TanStack
  Router and Vite).
- **Legacy relocation**: Moved the old Express/React application to
  `legacy/`, kept read-only and excluded from all quality and build lanes.
- **Quality lanes**: Repaired `type:check` (real app/node projects),
  restored `src/*` and `@/*` path aliases, and decoupled the client env shape
  from the server env.
- **HTTP seam test**: Vitest integration coverage for `/health` and
  `/api/runtime.js` (VITE_-key filtering) in `tests/integration/`.
- **Tooling**: `concurrently`-based `dev` script, frozen-lockfile Docker
  installs, committed `.env.example`, and a LocaLoco readme.

### Changed

- Stripped the template demo surface (data-table demo, dead providers and
  constants, template landing page, demo seed script).
- `server/env.ts` validation now fails fast with a clear error when required
  variables are missing.

## [1.3.0] - 2026-05-11

### Added

- **Observability**: Integrated unified structured logging with Logtape for both frontend and backend.
- **Error Tracking**: Added Sentry instrumentation for comprehensive production observability.

## [1.2.0] - 2026-05-10

### Added

- **CI/CD**: GitHub Actions workflow with secret scanning (gitleaks), formatting, linting, type checking, tests, and build checks on every push and pull request.
- **Stricter linting**: Merged oxlint/oxfmt configs from a stricter baseline — added `suspicious` error category, `no-console`, `no-floating-promises`, `no-misused-promises`, `node/no-process-env`, and `no-shadow` rules.
- **Shared module**: `shared/` directory for code shared between the server and client (e.g. date preset constants).

### Changed

- **Config format**: Converted `oxlint.config.ts` to `.oxlintrc.json` to avoid TypeScript parse errors in CI.
- **oxfmt**: Standardised `printWidth` to 100 and aligned formatting options with project conventions.

---

## [1.1.0] - 2026-04-22

### Added

- **API Documentation**: Integrated interactive Scalar UI at `/api/scalar` powered by `hono-openapi`.
- **Feature Modules**: Implemented feature-based directory structure (`src/features/`) with new Landing Page and Not Found components.
- **Structured Validation**: Added a global error handler for schema validation failures with consistent JSON responses.
- **Tooling**: Added Lefthook for pre-commit quality gates.

### Changed

- **Performance**: Migrated backend server to the Bun-native runtime, removing the `@hono/node-server` dependency.
- **Tooling**: Migrated from ESLint and Prettier to the Oxc suite (`oxlint` and `oxfmt`) for near-instant developer feedback loops.
- **Project Structure**: Refined organization of server libraries and frontend features.

---

## [1.0.0] - 2025-10-15

### Added

- **Initial Release**: Baseline full-stack foundation for React and Hono.
- **Authentication**: Native integration with Better Auth for secure user management.
- **Persistence**: Built-in support for Drizzle ORM and PostgreSQL.
- **Routing**: Type-safe, file-based routing using TanStack Router.
- **Styling**: Modern, utility-first design system with Tailwind CSS v4.
- **Runtime Configuration**: Dynamic environment variable injection mechanism for flexible deployments.
