# Development Guide

## Prerequisites

| Tool                                      | Version     |
| ----------------------------------------- | ----------- |
| [Bun](https://bun.sh/)                    | `≥ 1.3`     |
| [pnpm](https://pnpm.io/)                  | `≥ 10.30.0` |
| [Docker Desktop](https://www.docker.com/) | Latest      |

## Setup

```bash
git clone https://github.com/zek01svg/localoco.git
cd localoco
pnpm install --frozen-lockfile
cp apps/server/.env.example apps/server/.env
# Fill in the required values — see docs/environment.md
```

Push the database schema:

```bash
pnpm --filter @localoco/server db:push
```

Start the dev server:

```bash
pnpm run dev
```

## Scripts

| Command                                      | Description                             |
| -------------------------------------------- | --------------------------------------- |
| `pnpm run dev`                               | Start frontend + backend (Turbo)        |
| `pnpm run build`                             | Production build (all packages)         |
| `pnpm run lint`                              | Run oxlint                              |
| `pnpm run format:fix`                        | Auto-format with oxfmt                  |
| `pnpm run typecheck`                         | TypeScript type checking (all packages) |
| `pnpm run test:unit`                         | Run unit + integration tests            |
| `pnpm run test:e2e`                          | Run Playwright E2E tests                |
| `pnpm --filter @localoco/server db:push`     | Push Drizzle schema to the database     |
| `pnpm --filter @localoco/server db:view`     | Open Drizzle Studio                     |
| `pnpm --filter @localoco/server db:generate` | Generate Drizzle migration files        |

## Testing

Tests live under `apps/server/tests/`:

| Layer           | Directory                        | Runner     | Description                                             |
| --------------- | -------------------------------- | ---------- | ------------------------------------------------------- |
| **Unit**        | `apps/server/tests/unit/`        | Vitest     | Isolated function tests — no I/O                        |
| **Integration** | `apps/server/tests/integration/` | Vitest     | Real PostgreSQL + Redis via Testcontainers, full routes |
| **E2E**         | `tests/e2e/`                     | Playwright | End-to-end browser tests                                |

```bash
pnpm run test:unit   # unit + integration
pnpm run test:e2e    # Playwright
```

## CI/CD

GitHub Actions runs on every push and PR:

| Step        | Detail                               |
| ----------- | ------------------------------------ |
| **Setup**   | Bun 1.3 + pnpm on `ubuntu-latest`    |
| **Install** | `pnpm install --frozen-lockfile`     |
| **Static**  | oxlint + TypeScript type-checking    |
| **Test**    | All Vitest tests                     |
| **Deploy**  | Vercel deployment on merge to `main` |

Duplicate runs are auto-cancelled via `cancel-in-progress: true`.
