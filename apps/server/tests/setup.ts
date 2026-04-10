import { execSync } from "child_process";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer } from "@testcontainers/redis";
import type { StartedRedisContainer } from "@testcontainers/redis";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "../database/schema";

let pgContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;
let pool: pg.Pool;

export async function setupTestDatabase() {
  // Start Containers in parallel
  console.log("Starting test containers...");
  const [startedPg, startedRedis] = await Promise.all([
    new PostgreSqlContainer("postgres:16-alpine").start(),
    new RedisContainer("redis:7-alpine").start(),
  ]);

  pgContainer = startedPg;
  redisContainer = startedRedis;

  const pgUri = pgContainer.getConnectionUri();
  const redisUri = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;

  console.log("Pushing database schema to container...");
  try {
    execSync("pnpm drizzle-kit push --force", {
      env: {
        ...process.env,
        DATABASE_URL: pgUri,
        NODE_ENV: "development",
      },
      stdio: "pipe",
    });
    console.log("Schema pushed successfully.");
  } catch (error: any) {
    console.error(
      "Failed to push schema:",
      error.stderr?.toString() || error.message
    );
    throw error;
  }

  pool = new pg.Pool({
    connectionString: pgUri,
  });

  const db = drizzle(pool, { schema });

  // Store connection info globally for harness to pick up if needed
  (global as any).__TEST_DB_URL__ = pgUri;
  (global as any).__TEST_REDIS_URL__ = redisUri;

  return {
    db,
    pool,
    pgContainer,
    redisContainer,
    redisUri,
  };
}

export async function teardownTestDatabase() {
  await pool.end();
  await Promise.all([pgContainer.stop(), redisContainer.stop()]);
}
