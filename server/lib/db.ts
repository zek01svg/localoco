import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "#server/database/index";
import { env } from "#server/env";

export const db = drizzle({
  connection: {
    url: env.DATABASE_URL,
  },
  schema,
});
