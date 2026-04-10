import path from "path";

import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for the @localoco/server app.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@server": path.resolve(__dirname, "./"),
      "@shared": path.resolve(__dirname, "../../shared"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    env: {
      DATABASE_URL: "postgres://user:pass@localhost:5432/db",
      UPSTASH_REDIS_REST_URL: "https://localhost",
      UPSTASH_REDIS_REST_TOKEN: "token",
      BETTER_AUTH_SECRET: "12345678901234567890123456789012",
      BETTER_AUTH_URL: "http://localhost:3000",
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      QSTASH_TOKEN: "token",
      QSTASH_CURRENT_SIGNING_KEY: "key",
      QSTASH_NEXT_SIGNING_KEY: "key",
      RESEND_API_KEY: "key",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SECRET_KEY: "key",
      APP_URL: "http://localhost:3000",
      PORT: "3000",
      NODE_ENV: "development",
    },
    coverage: {
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      enabled: true,
      exclude: ["**/node_modules/**", "**/dist/**", "**/tests/**"],
    },
  },
});
