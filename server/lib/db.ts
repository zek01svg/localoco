import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "#server/database/index";
import { env } from "#server/env";

// Bounded per-instance pool: 3 Cloud Run instances x 15 = 45 of Supabase
// Free's 60 connections, leaving headroom for release tooling and manual
// runs. The DATABASE_URL secret is the Supabase pooled connection.
export const db = drizzle({
  connection: {
    url: env.DATABASE_URL,
    max: 15,
  },
  schema,
});
