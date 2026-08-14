import { Scalar } from "@scalar/hono-api-reference";
import * as Sentry from "@sentry/bun";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, openAPIRouteHandler } from "hono-openapi";
import { serveStatic } from "hono/bun";

import { env } from "#server/env";
import { auth } from "#server/lib/auth.ts";
import { db } from "#server/lib/db.ts";
import { getSpaShell } from "#server/spa.ts";
import { configureAppLogging, getAppLogger } from "#shared/logger.ts";

const sentryDsn = env.SENTRY_DSN ?? env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "development" ? 1 : 0.2,
  });
}

configureAppLogging({
  runtime: "server",
  isDevelopment: env.NODE_ENV === "development",
  enableSentrySink: Boolean(sentryDsn),
});

const logger = getAppLogger("server", "http");
const app = new Hono();

const logRequestCompleted = ({
  method,
  path,
  status,
  durationMs,
  trace_id,
  span_id,
}: {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  trace_id?: string;
  span_id?: string;
}) => {
  logger.info("request.completed", {
    method,
    path,
    status,
    durationMs,
    trace_id,
    span_id,
  });
};

app.use(async (c, next) => {
  const requestName = `${c.req.method} ${c.req.path}`;
  const startTime = performance.now();

  if (sentryDsn) {
    return Sentry.startSpan(
      {
        op: "http.server",
        name: requestName,
      },
      async () => {
        await next();
        const activeSpan = Sentry.getActiveSpan();
        const span = activeSpan ? Sentry.spanToJSON(activeSpan) : undefined;
        logRequestCompleted({
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          durationMs: Math.round((performance.now() - startTime) * 100) / 100,
          trace_id: span?.trace_id,
          span_id: span?.span_id,
        });
      }
    );
  }

  await next();
  logRequestCompleted({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Math.round((performance.now() - startTime) * 100) / 100,
  });
});

const baseRoutes = new Hono()
  .get(
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
  )
  .get("/api/runtime.js", c => {
    return c.text(
      `
    window.__env = ${JSON.stringify(Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith("VITE_"))), null, 2)}
    `.trim(),
      200,
      {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-store",
      }
    );
  })
  .on(["POST", "GET"], "/api/auth/*", c => {
    return auth.handler(c.req.raw);
  })
  .use("/assets/*", async (c, next) => {
    // Vite fingerprints every emitted asset, so content-addressed URLs are
    // immutable once published. The header must be set before serveStatic
    // runs: hono/bun's serveStatic returns the body without calling next().
    c.header("Cache-Control", "public, max-age=31536000, immutable");
    await next();
    if (c.res.status !== 200) {
      // Never cache misses or errors with the immutable directive.
      c.header("Cache-Control", "no-store");
    }
  })
  .use("/assets/*", serveStatic({ root: "./dist/static" }))
  .use("/assets/*", c => c.notFound())
  .get("*", c =>
    c.html(getSpaShell(), 200, {
      "Cache-Control": "no-store",
    })
  );

const apiRoutes = new Hono()
  .get(
    "/openapi",
    openAPIRouteHandler(app, {
      documentation: {
        info: {
          title: "React Hono API",
          version: "1.0.0",
          description: "API Documentation for the React Hono Template",
        },
        servers: [
          {
            url: `http://localhost:4001`,
            description: "Local Development Server",
          },
        ],
      },
    })
  )
  .get(
    "/scalar",
    Scalar({
      url: "/api/openapi",
      theme: "deepSpace",
    })
  )
  .get("/smoke", async c => {
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

app.route("/api", apiRoutes);
app.route("/", baseRoutes);

app.onError((err, c) => {
  if (err instanceof Error && err.name === "ValidationError") {
    logger.warning("request.validation_failed", {
      path: c.req.path,
      method: c.req.method,
      details: err.message,
    });
    return c.json(
      {
        error: "Validation failed",
        details: err.message,
      },
      400
    );
  }

  logger.error("request.unhandled_error", err);
  if (sentryDsn) {
    Sentry.captureException(err);
  }
  return c.json(
    {
      error: "Internal Server Error",
      message: err.message,
    },
    500
  );
});

const server = {
  port: env.PORT,
  fetch: app.fetch,
};

getAppLogger("server", "bootstrap").info("server.started", {
  port: server.port,
  sentryEnabled: Boolean(sentryDsn),
});

export { app, server };
export default server;
