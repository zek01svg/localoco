# Developer & Contribution Guide

Thank you for contributing to **React + Hono Template**! This document provides detailed setup instructions, development workflows, quality standards, and submission guidelines.

---

## 1. Prerequisites

Before getting started, ensure you have the following installed on your machine:

- **[Bun](https://bun.sh/)**: Runtime & package manager (`>= 1.3.13`)
- **[Docker Desktop](https://www.docker.com/)** or **Docker Engine**: Required to run local PostgreSQL, Maildev, and MinIO services.
- **[Git](https://git-scm.com/)**: Version control system.

---

## 2. Local Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/zek01svg/localoco.git
cd localoco
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Setup Environment Variables

Copy the template `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Review `.env` default configuration:

```env
# Client Configuration
VITE_APP_URL=http://localhost:4000

# Server Configuration
NODE_ENV=development
LOG_LEVEL=info
DATABASE_URL=postgres://postgres:password@localhost:5432/app
BETTER_AUTH_SECRET=your-development-secret-key-at-least-32-chars

# SMTP Configuration (Maildev)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=username
SMTP_PASS=password
SMTP_FROM=noreply@example.com

# S3 Configuration (MinIO)
AWS_ACCESS_KEY_ID=admin
AWS_SECRET_ACCESS_KEY=password
AWS_REGION=us-east-1
AWS_S3_ENDPOINT=http://localhost:9000
AWS_S3_BUCKET=app
FORCE_PATH_STYLE=true
```

### 4. Start Infrastructure Containers

Launch local PostgreSQL, Maildev, and MinIO via Docker Compose:

```bash
docker compose up -d
```

| Service           | Host Port | Purpose                   | UI / Console Link                              |
| :---------------- | :-------- | :------------------------ | :--------------------------------------------- |
| **PostgreSQL 17** | `5432`    | Main Application Database | N/A                                            |
| **Maildev Web**   | `1080`    | Local Email Inbox         | [http://localhost:1080](http://localhost:1080) |
| **Maildev SMTP**  | `1025`    | Local SMTP Server         | N/A                                            |
| **MinIO Console** | `9001`    | S3 Storage Console        | [http://localhost:9001](http://localhost:9001) |
| **MinIO API**     | `9000`    | S3 API Endpoint           | N/A                                            |

---

## 3. Development Workflow

### Starting the Full Development Suite

To run both the Hono backend server and Vite frontend dev server concurrently:

```bash
bun dev
```

This starts:

- **Backend Server**: [http://localhost:4001](http://localhost:4001)
- **Frontend Dev Server**: [http://localhost:4000](http://localhost:4000) (Proxies `/api` requests to `localhost:4001`)
- **API Documentation (Scalar)**: [http://localhost:4001/api/scalar](http://localhost:4001/api/scalar)

### Running Components Individually

```bash
# Start backend server only
bun dev:server

# Start frontend dev server only (requires backend to be running on 4001)
bun dev:vite
```

---

## 4. Code Quality & Standards

This project enforces strict code quality, type safety, and formatting standards using **Oxc (oxlint/oxfmt)** and **TypeScript**.

### Quality Check Commands

```bash
# Check code formatting with oxfmt
bun run format:check

# Check code quality and lint rules with oxlint
bun run lint:check

# Verify TypeScript types without emitting JavaScript
bun run type:check
```

### Pre-commit Quality Gate (Lefthook)

The project uses **Lefthook** to execute pre-commit hooks automatically before each Git commit:

- **`oxlint`**: Lints staged `.js, .ts, .jsx, .tsx` files and automatically fixes auto-fixable issues.
- **`oxfmt`**: Formats staged source, markdown, CSS, and configuration files.

To manually trigger pre-commit hooks:

```bash
bunx lefthook run pre-commit
```

---

## 5. Database Management Workflow

Database operations use **Drizzle ORM** and **Drizzle Kit**. The schema in
`server/database/` is the single canonical source; committed migrations in
`drizzle/` are generated from it.

### Run Migrations

Apply the committed migrations to your local database (start the
infrastructure containers first, see section 2.4):

```bash
bun db:migrate
```

Schema changes must land as a new committed migration, generated from the
schema:

```bash
bunx drizzle-kit generate
```

Production migrations run from CI only (`cd.yml` migrate job) — never at
container startup. Schema push (`drizzle-kit push`) is not used; CI fails on
drift between the schema and the migration history.

### Inspect Database (Drizzle Studio)

Launch interactive database browser UI:

```bash
bun db:studio
```

---

## 7. UI Components & Design System

The application uses **shadcn/ui** components.

### Add New Component

To add a new pre-built component:

```bash
bun shadcn add <component-name>
```

Components are output into `src/components/ui/`.

---

## 8. Testing Strategy

All contributions must include appropriate unit or E2E tests.

### Running Tests

```bash
# Run Unit & Integration Tests (Vitest)
bun run test:unit

# Run End-to-End Tests (Playwright)
bun run test:e2e
```

### Writing Tests

- **Unit Tests (`tests/unit/`)**: Place test files with the `.test.ts` or `.test.tsx` extension. Tests are executed via Vitest with JSDOM environment support.
- **E2E Tests (`tests/e2e/`)**: Place E2E test specifications under `tests/e2e/` with the `.spec.ts` extension. Tests are executed via Playwright against running browser instances.

---

## 9. Pull Request Workflow

1. **Create Feature Branch**:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. **Verify Locally**:
   Ensure all checks pass cleanly before committing:
   ```bash
   bun run format:check && bun run lint:check && bun run type:check && bun run test:unit
   ```
3. **Submit Pull Request**:
   Push your branch and open a PR against `main`.

### Continuous Integration (CI) Checks

Every PR automatically triggers GitHub Actions (`.github/workflows/ci.yml`).
The CI job runs against a clean frozen install and runs one named step per
gate, so each gate's exact command and outcome is visible in the run output
and any failing gate fails the run:

- **Frozen lockfile install**: `bun install --frozen-lockfile` — fails if
  `bun.lock` is out of date with `package.json`. Bun is pinned to the
  `packageManager` field of `package.json`.
- **Format Check**: Executes `bun run format:check`.
- **Linting**: Executes `bun run lint:check`.
- **Typecheck**: Executes `bun run type:check`.
- **Build Verification**: Builds production assets via `bun run build`.
- **Tests**: Runs `test` (unit + integration) and `test:e2e` (Playwright).
- **Dependency Audit**: Executes `bun run security:audit` (`bun audit
--audit-level=high`) against the committed lockfile.
- **Secret Scanning**: gitleaks scans commits for exposed tokens or secrets.

The CI job is the required status check for merge: branch protection on `main`
requires it. The `legacy/` reference tree is excluded from all gates.

On `main`, CI completion also triggers the downstream release chain
(`publish.yml` → `cd.yml`). See [DEPLOYMENT.md](./DEPLOYMENT.md#2-release-flow)
for the full pipeline.
