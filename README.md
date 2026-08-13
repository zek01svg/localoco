# LocaLoco

LocaLoco is a platform for discovering and supporting independent local
businesses in Singapore. This repository is the **rewrite**: a fresh
single-package application built on a Bun + Hono backend with a React 19 SPA
(TanStack Router, Vite, Tailwind CSS v4) frontend. The rewrite reuses the
`react-hono-template` v1.3.0 spine, keeping only what the product needs and
deferring feature work to later tickets.

## Quick Start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment (copy and fill in values)
cp .env.example .env

# 3. Start development server (Frontend: 4000, Backend: 4001)
bun dev
```

## Scripts

| Command            | Action                                                          |
| :----------------- | :-------------------------------------------------------------- |
| `bun dev`          | Start frontend and backend development servers concurrently     |
| `bun build`        | Build production bundles (server executable & static React SPA) |
| `bun start`        | Run production server (`NODE_ENV=production bun dist/index.js`) |
| `bun type:check`   | Type-check app and node projects with `tsc --noEmit`            |
| `bun lint:check`   | Lint source files with **oxlint**                               |
| `bun format:check` | Verify code formatting with **oxfmt**                           |
| `bun test`         | Run unit and integration tests with Vitest                      |
| `bun test:e2e`     | Run end-to-end browser tests with Playwright                    |

## `legacy/`

The `legacy/` directory holds the old LocaLoco application (Express backend +
plain-React frontend) verbatim. It is **read-only reference material** for
behavioral and data model context during the rewrite:

- Never modify files under `legacy/`.
- It is excluded from every quality lane: oxlint, oxfmt, lefthook pre-commit
  hooks, and the Docker build context.

## Documentation

Detailed documentation lives in [`docs/`](./docs): architecture, contributing
guide, deployment, and API reference.
