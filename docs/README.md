# Documentation Overview

This directory contains detailed guides, technical references, and architectural explanations for developing, maintaining, and deploying the LocaLoco application.

Documentation is organized according to the [Diataxis framework](https://diataxis.fr/) into clear functional areas.

---

## Documentation Sitemap

```
docs/
├── README.md         # Documentation index and overview (this file)
├── ARCHITECTURE.md   # System architecture, design decisions, and data flow
├── CONTRIBUTING.md   # Developer setup, coding standards, database workflows, & testing
├── DEPLOYMENT.md     # Production build, Docker containerization, & environment setup
└── API.md            # API design, routes, OpenAPI specifications, & error schemas
```

---

## Navigating the Docs

### Architecture & Concepts

If you want to understand how the system is structured, how client and server communicate, or how dynamic environment variables work:

- [**Architecture Guide**](./ARCHITECTURE.md)
  - System Component Overview (Mermaid Diagram)
  - Runtime Environment Variable Injection (`/api/runtime.js`)
  - Frontend & Backend Technology Stack Breakdown
  - Database Architecture & Authentication Flow
  - Telemetry & Logging (Logtape + Sentry)

### Development & Contribution

If you are setting up your local environment, adding new features, or submitting a pull request:

- [**Contributing Guide**](./CONTRIBUTING.md)
  - Local Environment Prerequisites & Setup (`bun dev`)
  - Infrastructure with Docker Compose (Postgres, Maildev, MinIO)
  - Code Quality Standards (Oxlint, Oxfmt, Lefthook git hooks)
  - Database Migrations (`drizzle-kit`) & Seeding (`scripts/db-seed.ts`)
  - Testing Strategy (Vitest unit tests & Playwright E2E tests)

### Production & Deployment

If you are deploying the application to staging or production using Docker:

- [**Deployment Guide**](./DEPLOYMENT.md)
  - Multi-stage Docker Build Pipeline (`Dockerfile`)
  - Runtime Environment Variable Configuration
  - Static Asset Serving & Health Check Endpoints
  - Docker Compose Service Definitions

### API Reference & Standards

If you are developing backend endpoints or integrating frontend components with server routes:

- [**API Documentation**](./API.md)
  - Hono Router Structure & Path Alias Imports (`#server/*`, `#client/*`, `#shared/*`)
  - Interactive API Reference (`/api/scalar`) & OpenAPI Specs (`/api/openapi`)
  - Authentication Endpoints (`/api/auth/*`)
  - Standardized Error Formats & Validation Handling

---

## Quick Links & Commands

| Action               | Command         | Reference                                                                  |
| :------------------- | :-------------- | :------------------------------------------------------------------------- |
| **Start Dev Suite**  | `bun dev`       | [CONTRIBUTING.md](./CONTRIBUTING.md#3-development-workflow)                |
| **Run Unit Tests**   | `bun test:unit` | [CONTRIBUTING.md](./CONTRIBUTING.md#8-testing-strategy)                    |
| **Run E2E Tests**    | `bun test:e2e`  | [CONTRIBUTING.md](./CONTRIBUTING.md#8-testing-strategy)                    |
| **Database Studio**  | `bun db:studio` | [CONTRIBUTING.md](./CONTRIBUTING.md#5-database-management-workflow)        |
| **Production Build** | `bun build`     | [DEPLOYMENT.md](./DEPLOYMENT.md#2-docker-container-deployment-recommended) |
