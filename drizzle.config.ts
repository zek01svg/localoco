import { defineConfig } from "drizzle-kit";

import { env } from "#server/env.ts";

export default defineConfig({
  out: "./drizzle",
  schema: "./server/database/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
