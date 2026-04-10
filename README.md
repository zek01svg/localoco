# LocaLoco

> Discover, support, and grow local businesses — interactive maps, community reviews, and real-time engagement tools for Singapore's independent entrepreneurs.

<div align="center">

[![CI](https://github.com/zek01svg/localoco/actions/workflows/ci.yml/badge.svg)](https://github.com/zek01svg/localoco/actions/workflows/ci.yml)
[![Bun](https://img.shields.io/badge/Bun-%E2%89%A51.3-black?logo=bun)](https://bun.sh)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Hono](https://img.shields.io/badge/Hono-v4-E36002?logo=hono&logoColor=white)](https://hono.dev)
[![Drizzle](https://img.shields.io/badge/Drizzle_ORM-v0.45-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-ESNext-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)

</div>

## What It Does

Small businesses lose customers to franchise-dominated search results. LocaLoco fixes this with a purpose-built discovery platform:

- **Interactive map** (Google Maps + OneMap) — find businesses near you with real-time proximity data
- **Vendor storefronts** — manage descriptions, photos, hours, and contact details
- **Reviews & forum** — community-driven ratings and discussion
- **Referral rewards** — unique codes with SGD 5–10 vouchers for word-of-mouth growth

## Tech Stack

<div align="center">

|    Layer     | Technology                                                        |
| :----------: | :---------------------------------------------------------------- |
| **Frontend** | React 19 + Vite 7 + TanStack Router + Tailwind CSS v4 + shadcn/ui |
| **Backend**  | Hono on Bun + Drizzle ORM + PostgreSQL (Supabase)                 |
|   **Auth**   | Better Auth — Email/Password + Google OAuth                       |
|  **Infra**   | Upstash Redis · QStash (email queue) · Supabase Storage · Sentry  |

</div>

## Quick Start

```bash
git clone https://github.com/zek01svg/localoco.git
cd localoco
pnpm install --frozen-lockfile
cp apps/server/.env.example apps/server/.env
# Fill in env vars — see docs/environment.md
pnpm --filter @localoco/server db:push
pnpm run dev
```

Requires [Bun](https://bun.sh/) ≥ 1.3 and [pnpm](https://pnpm.io/) ≥ 10.30.

## Docs

- [Architecture & tech stack](docs/architecture.md)
- [Development guide & scripts](docs/development.md)
- [Environment variables](docs/environment.md)
- [Server API reference](apps/server/README.md)

## License

IS216 Web Application Development II coursework.
