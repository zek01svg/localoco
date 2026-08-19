import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const journalSchema = z.object({
  entries: z.array(
    z.object({
      idx: z.number(),
      version: z.string(),
      when: z.number(),
      tag: z.string(),
    })
  ),
});

// Every committed migration must be applied by the rehearsal; the expected
// count is derived from the journal rather than hard-coded so future
// migrations do not require editing this test.
const expectedMigrationCount = () =>
  journalSchema.parse(
    JSON.parse(readFileSync("server/database/drizzle/meta/_journal.json", "utf8"))
  ).entries.length;

// Rehearses the exact command CD runs against production (`.github/workflows/cd.yml`
// migrate job) against a real, isolated PostgreSQL from testcontainers. Spawned
// through a shell so the `bun` binary resolves on both Windows and Linux CI.
const runMigrate = (databaseUrl: string) => {
  const result = spawnSync("bun x drizzle-kit migrate", {
    shell: true,
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: databaseUrl },
    encoding: "utf8",
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

describe("committed migration history", () => {
  it("migrates an empty database and re-running is a no-op", async () => {
    const container = await new PostgreSqlContainer("postgres:17-alpine").start();
    try {
      const databaseUrl = container.getConnectionUri();

      const first = runMigrate(databaseUrl);
      expect(first.status, `migrate failed:\n${first.stdout}${first.stderr}`).toBe(0);

      const pool = new Pool({ connectionString: databaseUrl });
      try {
        const tables = await pool.query<{ table_name: string }>(
          `select table_name from information_schema.tables
             where table_schema = 'public' order by table_name`
        );
        expect(tables.rows.map(row => row.table_name)).toEqual(
          expect.arrayContaining([
            "account",
            "email_delivery",
            "listing",
            "session",
            "user",
            "verification",
          ])
        );

        const journal = await pool.query<{ n: number }>(
          `select count(*)::int as n from drizzle."__drizzle_migrations"`
        );
        expect(journal.rows[0].n).toBe(expectedMigrationCount());

        const second = runMigrate(databaseUrl);
        expect(second.status, `re-run failed:\n${second.stdout}${second.stderr}`).toBe(0);
        const journalAfter = await pool.query<{ n: number }>(
          `select count(*)::int as n from drizzle."__drizzle_migrations"`
        );
        expect(journalAfter.rows[0].n).toBe(expectedMigrationCount());
      } finally {
        await pool.end();
      }
    } finally {
      await container.stop();
    }
  }, 300_000);
});
