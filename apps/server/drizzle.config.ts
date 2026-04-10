import { defineConfig } from "drizzle-kit";

import { env } from "./env";

export default defineConfig({
  out: "./database/drizzle",
  schema: "./database/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
