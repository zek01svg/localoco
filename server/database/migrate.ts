import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { env } from "../env";

// Startup migrator for the container: the slim runner has no drizzle-kit CLI,
// so it invokes drizzle's own migrator against the bundled migrations folder.
// `bun build` bundles this file; the Dockerfile runs it before the server.
const pool = new Pool({ connectionString: env.DATABASE_URL });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./src/database/drizzle" });
} finally {
  await pool.end();
}
