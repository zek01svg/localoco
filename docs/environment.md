# Environment Variables

All variables are validated at startup via `apps/server/env.ts` using [T3 Env](https://env.t3.gg/) + Zod. The server will throw immediately if any required variable is missing or invalid.

Copy the example file and fill in the values:

```bash
cp apps/server/.env.example apps/server/.env
```

## Server

| Variable                     | Description                                            |
| ---------------------------- | ------------------------------------------------------ |
| `NODE_ENV`                   | `development` or `production` (default: `development`) |
| `PORT`                       | Port the Bun server listens on                         |
| `DATABASE_URL`               | Supabase PostgreSQL connection string                  |
| `BETTER_AUTH_SECRET`         | Secret key for Better Auth session signing             |
| `APP_URL`                    | Canonical application URL (used by Better Auth)        |
| `GOOGLE_CLIENT_ID`           | Google OAuth client ID                                 |
| `GOOGLE_CLIENT_SECRET`       | Google OAuth client secret                             |
| `QSTASH_TOKEN`               | Upstash QStash API token (email queue producer)        |
| `QSTASH_CURRENT_SIGNING_KEY` | QStash signing key for webhook signature verification  |
| `QSTASH_NEXT_SIGNING_KEY`    | QStash next signing key (for key rotation)             |
| `UPSTASH_REDIS_REST_URL`     | Upstash Redis REST API URL                             |
| `UPSTASH_REDIS_REST_TOKEN`   | Upstash Redis REST API token                           |
| `RESEND_API_KEY`             | Resend API key for transactional emails                |
| `SENTRY_DSN`                 | Sentry DSN for server-side error tracking              |
| `SUPABASE_URL`               | Supabase project URL                                   |
| `SUPABASE_SECRET_KEY`        | Supabase service role key (admin access for storage)   |

## Client (prefixed `VITE_`)

Injected into the frontend at runtime via the `/api/runtime` endpoint.

| Variable                   | Description                         |
| -------------------------- | ----------------------------------- |
| `VITE_APP_URL`             | Public-facing app URL               |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key      |
| `VITE_ONEMAP_EMAIL`        | OneMap API account email            |
| `VITE_ONEMAP_PASSWORD`     | OneMap API account password         |
| `VITE_SENTRY_DSN`          | Sentry DSN for client-side tracking |
| `VITE_TEST_EMAIL`          | E2E test user email                 |
| `VITE_TEST_PASSWORD`       | E2E test user password              |
