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

    // Mail (wired when the auth/smtp slice ships)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_SECURE: z.coerce.boolean().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),

    // Object storage (wired when the R2 slice ships)
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_REGION: z.string().optional(),
    AWS_S3_ENDPOINT: z.string().optional(),
    AWS_S3_BUCKET: z.string().optional(),
    FORCE_PATH_STYLE: z.coerce.boolean().optional(),
  },
  clientPrefix: "VITE_",
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

    // Mail
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,

    // Minio
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_ENDPOINT: process.env.AWS_S3_ENDPOINT,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    FORCE_PATH_STYLE: process.env.FORCE_PATH_STYLE,
  },
  emptyStringAsUndefined: true,
  skipValidation:
    !!process.env.CI ||
    process.env.npm_lifecycle_event === "lint:check" ||
    process.env.NODE_ENV === "test",
});
