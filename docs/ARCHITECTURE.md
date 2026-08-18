# System Architecture

This document provides a comprehensive technical breakdown of the **React + Hono Template** architecture, design patterns, data flows, and infrastructure integration.

---

## 1. System Overview

The application is structured as a unified full-stack TypeScript repository. It runs a **React 19** Single Page Application (SPA) on the frontend, served and backed by a lightweight, high-performance **Hono** web framework running natively on the **Bun** runtime.

```mermaid
flowchart TB
    subgraph Browser ["Client Browser"]
        SPA["React 19 SPA (TanStack Router & Query)"]
        WinEnv["window.__env (Runtime Config)"]
    end

    subgraph Server ["Hono / Bun Backend (Port 4001)"]
        HonoApp["Hono App (server/index.ts)"]
        RuntimeEP["/api/runtime.js Injector"]
        AuthEP["/api/auth/* (Better Auth)"]
        DocEP["/api/scalar & /api/openapi"]
        Logger["Logtape / Sentry Telemetry"]
    end

    subgraph Storage ["External Services / Infrastructure"]
        PG[("PostgreSQL 17 (Drizzle ORM)")]
        Mail["Maildev / SMTP Mailer"]
        S3["MinIO / AWS S3 Storage"]
        Sentry["Sentry Cloud (Error & Tracing)"]
    end

    SPA -->|1. Fetch /api/runtime.js| RuntimeEP
    RuntimeEP -->|2. Injects VITE_* env| WinEnv
    SPA -->|3. API Requests /api/*| HonoApp
    HonoApp --> AuthEP
    HonoApp --> DocEP
    AuthEP -->|Manage sessions & users| PG
    AuthEP -->|Send verification / reset email| Mail
    HonoApp -->|Queries & Mutations| PG
    HonoApp -->|File Storage| S3
    Logger -->|Logs & Traces| Sentry
    SPA -->|Client Errors| Sentry
```

---

## 2. Directory & Package Module Boundaries

The codebase uses Node.js subpath imports (`imports` in `package.json`) to enforce clean architectural boundaries between server, client, and shared logic without reliance on fragile relative paths:

```json
"imports": {
  "#server/*": "./server/*",
  "#client/*": "./src/*",
  "#shared/*": "./shared/*"
}
```

### Module Responsibilities

| Subpath Alias           | Scope           | Dependencies & Rules                                                                              |
| :---------------------- | :-------------- | :------------------------------------------------------------------------------------------------ |
| `#client/*` (`src/`)    | React Frontend  | Runs in browser context. May import `#shared/*`. **Must never import `#server/*` code.**          |
| `#server/*` (`server/`) | Hono Backend    | Runs on Bun runtime. Handles database, auth, email, S3, API routes. May import `#shared/*`.       |
| `#shared/*` (`shared/`) | Universal Logic | Pure TypeScript definitions, schemas, utilities (e.g., Logtape logging configuration, constants). |

---

## 3. Runtime Environment Injection (`/api/runtime.js`)

A common limitation of modern frontend build tools (such as Vite) is that environment variables starting with `VITE_` are inlined at **build time**. In containerized environments (Docker / Kubernetes), building separate images for development, staging, and production violates the "Build Once, Deploy Anywhere" principle.

### How It Works

To solve this, the template dynamically injects environment variables into the client runtime via a server-rendered JavaScript endpoint:

```
[Server Start] ──► Reads system process.env ──► Filters keys matching VITE_*
                                                           │
[Client Load] ◄── GET /api/runtime.js ◄────────────────────┘
       │
Sets window.__env
       │
[src/env.ts] ──► Fallback: window.__env?.VAR ?? import.meta.env.VAR
```

1. **Server Endpoint (`server/index.ts`)**:

   ```typescript
   app.get("/api/runtime.js", c => {
     const clientEnv = Object.fromEntries(
       Object.entries(env).filter(([key]) => key.startsWith("VITE_"))
     );
     return c.text(`window.__env = ${JSON.stringify(clientEnv, null, 2)}`, 200, {
       "Content-Type": "application/javascript",
     });
   });
   ```

2. **Client HTML Loading (`index.html`)**:

   ```html
   <script type="text/javascript" src="/api/runtime.js"></script>
   ```

3. **Client Env Access (`src/env.ts`)**:
   ```typescript
   export const env: Env = {
     VITE_APP_URL: window.__env?.VITE_APP_URL ?? import.meta.env.VITE_APP_URL,
     VITE_SENTRY_DSN: window.__env?.VITE_SENTRY_DSN ?? import.meta.env.VITE_SENTRY_DSN,
   };
   ```

### Security Guardrails

- Only environment variables explicitly prefixed with `VITE_` are filtered and served by `/api/runtime.js`.
- Server secrets (such as `DATABASE_URL`, `BETTER_AUTH_SECRET`, `SMTP_PASS`) are strictly excluded from client payload generation.

---

## 4. Frontend Architecture

The frontend is a modern React 19 application built with Vite and Tailwind CSS v4.

- **Routing (`src/routes/`)**: Managed by **TanStack Router**, providing full TypeScript route safety and auto-generated route trees (`src/routeTree.gen.ts`).
- **State & Data Fetching**: Managed by **TanStack Query (v5)** for caching, invalidation, background updating, and optimistic UI updates.
- **Styling & UI Components (`src/components/`)**:
  - **Tailwind CSS v4** via `@tailwindcss/vite`.
  - **Radix UI** primitives and **shadcn/ui** reusable components.
  - Lucide React icons, Sonner toast notifications, and Recharts visualization.
- **Form Validation**: Managed by **TanStack Form** or **React Hook Form** paired with **Zod** schema validation.

---

## 5. Backend Architecture

The backend is built with **Hono**, a high-performance web framework designed for edge and server runtimes.

- **Runtime**: Executed via **Bun** for native performance, fast startup, and native TypeScript execution.
- **API Route Division**:
  - `/health`: System health monitoring.
  - `/api/runtime.js`: Dynamic client environment configuration.
  - `/api/auth/*`: Better Auth handlers for user management and authentication.
  - `/api/openapi` & `/api/scalar`: Automatic OpenAPI 3.0 specification generation (`hono-openapi`) and interactive Scalar API explorer UI.
- **Error Handling & Middleware**:
  - Global error handler (`app.onError`) formats validation failures (`400 Bad Request`) and uncaught exceptions (`500 Internal Server Error`).
  - Structured request timing middleware logs HTTP completion metrics (`durationMs`, `status`, `method`, `path`).
- **External providers** (`server/lib/geocoding/`, `server/lib/email/`): each
  provider is a narrow module with constructor-injected fetch, zod validation
  at the trust boundary, and typed classified failures (`not_found`,
  `ambiguous`, `quota_exhausted`, `provider_unavailable`,
  `invalid_response`) — see ADR-0005. Listing writes geocode the address
  before persisting `latitude`/`longitude` (ADR-0006); reads never call the
  provider.

---

## 6. Database & Authentication Architecture

### Database Layer

- **PostgreSQL 17**: Primary relational database storage.
- **Drizzle ORM**: Type-safe ORM located under `server/database/`. Schema definitions and migrations are configured via `drizzle.config.ts`.
- **Database Connection Pool**: Bounded per-instance postgres-js pool (`max: 15`) in `server/lib/db.ts` — three Cloud Run instances x 15 stays under Supabase Free's 60-connection limit. Production migrations run from CI only, against the direct connection, never at container startup.

### Authentication Layer

- **Better Auth (`server/lib/auth.ts`)**: Production-ready authentication engine configured with Drizzle ORM PostgreSQL adapter.
- **Features**:
  - Email and Password authentication enabled by default.
  - Email verification and password reset hooks decoupled via an asynchronous transactional email queue.
  - Interactive OpenAPI authentication documentation plugin attached at `/api/auth/docs`.
  - Client schema generation via `@better-auth/cli` (`server/database/auth.ts`).

---

## 7. Asynchronous Transactional Email Pipeline

The transactional email pipeline decouples latency-sensitive client operations (user registration, password resets) from third-party email delivery providers and network latency.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client / Browser
    participant Auth as Better Auth / API
    participant DB as PostgreSQL (email_delivery)
    participant QStash as Upstash QStash (Queue)
    participant Webhook as Webhook Consumer (/api/webhooks/qstash/*)
    participant Provider as Email Provider (Resend / SMTP)

    User->>Auth: Request password reset / sign up
    Auth->>DB: INSERT email_delivery (status: 'pending')
    Auth->>QStash: Publish message { jobId }
    Auth-->>User: Immediate 200 OK (no delivery wait)

    Note over QStash,Webhook: Asynchronous Dispatch & Retry Loop
    QStash->>Webhook: POST /api/webhooks/qstash/email-delivery (with HMAC signature)
    Webhook->>Webhook: Verify upstash-signature
    Webhook->>DB: Atomic claim (status: 'pending' -> 'processing', attempt_count + 1)
    alt Successfully Claimed
        Webhook->>Provider: Send email payload
        alt Delivery Succeeded
            Webhook->>DB: UPDATE status: 'delivered', provider_message_id
            Webhook-->>QStash: 200 OK (done)
        else Transient Failure (429, 5xx, Network Timeout)
            Webhook->>DB: UPDATE status: 'retryable', last_error
            Webhook-->>QStash: 503 Service Unavailable (QStash retries)
        else Terminal Failure (400, 401, Invalid Recipient)
            Webhook->>DB: UPDATE status: 'failed', last_error
            Webhook-->>QStash: 200 OK (stops retries)
        end
    else Skipped (Already Processing or Max Attempts)
        Webhook-->>QStash: 200 OK (skip duplicate)
    end
```

### Key Architectural Properties

1. **Opaque Queue Payloads**: Only `{ jobId: string }` is enqueued into QStash. Sensitive email content, recipients, and verification tokens remain securely stored inside PostgreSQL with zero third-party queue leakage.
2. **Atomic Job Claiming**: Database status transitions (`pending`/`retryable` -> `processing`) execute with atomic row locks, ensuring exactly-once delivery guarantees even under duplicate webhook delivery.
3. **Robust Sanitization & Defense**:
   - CRLF injection detection on all email headers (`to`, `subject`, `from`).
   - HTML entity escaping on dynamic template parameters (`escapeHtml`).
   - Sensitive credential and token scrubbing in logged error traces (`sanitizeErrorMessage`).
4. **Resilient Provider Seam**: Direct **Resend** integration for production and staging, and a lightweight in-memory **FakeEmailProvider** for local development and hermetic unit/integration testing.

---

## 8. Observability & Telemetry

Observability is built-in across both client and server tiers:

```
                  ┌───────────────────────────────┐
                  │    Logtape Logging Manager    │
                  └──────────────┬────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
      ┌────────────────────┐          ┌────────────────────┐
      │   Console Sink     │          │    Sentry Sink     │
      │ (Formatted JSON /  │          │ (@logtape/sentry)  │
      │ Dev Logs)          │          └──────────┬─────────┘
      └────────────────────┘                     │
                                                 ▼
                                      ┌────────────────────┐
                                      │ Sentry Cloud DSN   │
                                      └────────────────────┘
```

- **Structured Logging**: Powered by **Logtape** (`shared/logger.ts`), operating synchronously or asynchronously with custom log sinks.
- **Error & Performance Tracking**: Powered by **Sentry**:
  - `@sentry/bun` instruments the Hono backend server, capturing uncaught exceptions and tracing HTTP requests via `Sentry.honoIntegration()`.
  - `@sentry/react` instruments client-side rendering errors and performance metrics.
  - `@sentry/vite-plugin` uploads source maps automatically during production builds when Sentry environment variables are provided.

---

## 9. Build & Distribution Pipeline

Production builds combine backend JavaScript bundling with static asset production:

```
bun build --minify --sourcemap --target=bun --outdir=dist server/index.ts
                 │
                 ├──► Generates: dist/index.js (Backend executable)
                 │
vite build
                 │
                 └──► Generates: dist/static/ (Frontend bundle + index.html)
```

During production execution (`bun start`):

1. Bun runs `dist/index.js`.
2. Hono serves API routes at `/api/*`.
3. Hono serves static assets from `dist/static/` via `serveStatic`.
4. Fallback wildcard route `*` returns `dist/static/index.html` for client SPA
   routing with `Cache-Control: no-store`; the client renders the landing page
   and any route-level pending, error, and not-found states. Fingerprinted
   assets under `/assets/*` are served `public, max-age=31536000, immutable` —
   see [DEPLOYMENT.md §5](./DEPLOYMENT.md#5-health-checks--monitoring).
