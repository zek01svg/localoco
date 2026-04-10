import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export const env = createEnv({
  client: {
    VITE_APP_URL: z.url(),
    VITE_GOOGLE_MAPS_API_KEY: z.string(),
    VITE_SENTRY_DSN: z.string(),
    VITE_TEST_EMAIL: z.string(),
    VITE_TEST_PASSWORD: z.string(),
  },
  server: {
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    PORT: z.coerce.number(),
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    QSTASH_TOKEN: z.string(),
    QSTASH_CURRENT_SIGNING_KEY: z.string(),
    QSTASH_NEXT_SIGNING_KEY: z.string(),
    UPSTASH_REDIS_REST_URL: z.url(),
    UPSTASH_REDIS_REST_TOKEN: z.string(),
    RESEND_API_KEY: z.string(),
    SENTRY_DSN: z.string(),
    SUPABASE_URL: z.url(),
    SUPABASE_SECRET_KEY: z.string(),
    APP_URL: z.url(),
  },
  clientPrefix: "VITE_",
  runtimeEnv: process.env,
  skipValidation:
    !!process.env.CI ||
    !!process.env.VITEST ||
    process.env.npm_lifecycle_event === "lint",
});

export type Env = {
  [K in keyof typeof env as K extends `VITE_${string}` ? K : never]: string;
};
