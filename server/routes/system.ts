import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";

import { env } from "#server/env";
import { db } from "#server/lib/db.ts";

const healthRoutes = new Hono().get(
  "/health",
  describeRoute({
    description: "Health check endpoint",
    responses: {
      200: {
        description: "Returns the health status of the server",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                status: { type: "string", example: "ok" },
              },
            },
          },
        },
      },
    },
  }),
  c => {
    return c.json({
      status: "ok",
    });
  }
);

// Liveness probe against the real data source, guarded by a deploy token.
// Keeps its pre-envelope raw JSON contract: CD only parses the status code.
const smokeRoutes = new Hono().get("/smoke", async c => {
  const token = c.req.header("Authorization")?.replace(/^Bearer\s+/iu, "");
  if (!env.SMOKE_TOKEN || token !== env.SMOKE_TOKEN) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await db.execute(sql`select 1`);
  return c.json({
    ok: true,
    revision: env.K_REVISION ?? "local",
  });
});

export { healthRoutes, smokeRoutes };
