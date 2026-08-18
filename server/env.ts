import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export const env = createEnv({
  client: {
    VITE_APP_URL: z.url(),
    VITE_SENTRY_DSN: z.url().optional(),
    VITE_SENTRY_ORG: z.string().min(1).optional(),
    VITE_SENTRY_PROJECT: z.string().min(1).optional(),
  },
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(4001),
    DATABASE_URL: z.url(),
    SENTRY_DSN: z.url().optional(),
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),

    // Better Auth
    BETTER_AUTH_SECRET: z.string(),

    // Release smoke check gate (set only in production)
    SMOKE_TOKEN: z.string().optional(),

    // Cloud Run injects the serving revision id
    K_REVISION: z.string().optional(),

    // Object storage (MinIO / S3)
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_REGION: z.string().optional(),
    AWS_S3_ENDPOINT: z.string().optional(),
    AWS_S3_BUCKET: z.string().optional(),
    FORCE_PATH_STYLE: z.coerce.boolean().optional(),

    // Upstash Redis (Caching & Rate Limiting)
    UPSTASH_REDIS_REST_URL: z.url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

    // Upstash QStash (Transactional Email Queue)
    QSTASH_TOKEN: z.string().min(1).optional(),
    QSTASH_CURRENT_SIGNING_KEY: z.string().min(1).optional(),
    QSTASH_NEXT_SIGNING_KEY: z.string().min(1).optional(),
    QSTASH_URL: z.url().optional(),

    // Email (Resend)
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().default("LocaLoco <noreply@localoco.ciav.dev>"),

    // Maps (server-side address validation). Server-only credential: never
    // exposed through /api/runtime.js (VITE_-prefixed keys only).
    GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
  },
  clientPrefix: "VITE_",
  // t3-env defaults to "window exists => client", which is wrong under
  // vitest's jsdom. The server bundle only runs where `process` is real.
  isServer: "process" in globalThis,
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT ?? "4001",
    VITE_APP_URL: process.env.VITE_APP_URL ?? `http://localhost:4000`,
    VITE_SENTRY_DSN: process.env.VITE_SENTRY_DSN,
    VITE_SENTRY_ORG: process.env.VITE_SENTRY_ORG,
    VITE_SENTRY_PROJECT: process.env.VITE_SENTRY_PROJECT,
    DATABASE_URL: process.env.DATABASE_URL,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,

    // Better Auth
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,

    // Release smoke check gate (set only in production)
    SMOKE_TOKEN: process.env.SMOKE_TOKEN,

    // Cloud Run injects the serving revision id
    K_REVISION: process.env.K_REVISION,

    // Minio / S3
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_ENDPOINT: process.env.AWS_S3_ENDPOINT,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    FORCE_PATH_STYLE: process.env.FORCE_PATH_STYLE,

    // Upstash Redis
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,

    // Upstash QStash
    QSTASH_TOKEN: process.env.QSTASH_TOKEN,
    QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
    QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
    QSTASH_URL: process.env.QSTASH_URL,

    // Email (Resend)
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,

    // Maps (server-side address validation)
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  },
  emptyStringAsUndefined: true,
  skipValidation:
    !!process.env.CI ||
    process.env.npm_lifecycle_event === "lint:check" ||
    process.env.NODE_ENV === "test",
});
