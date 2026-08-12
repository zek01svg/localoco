import { Scalar } from "@scalar/hono-api-reference";
import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { describeRoute, openAPIRouteHandler } from "hono-openapi";
import { serveStatic } from "hono/bun";

import { env } from "#server/env";
import { auth } from "#server/lib/auth.ts";
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
      { "Content-Type": "application/javascript" }
    );
  })
  .on(["POST", "GET"], "/api/auth/*", c => {
    return auth.handler(c.req.raw);
  })
  .use("/assets/*", serveStatic({ root: "./dist/static" }))
  .use("/*", serveStatic({ root: "./dist/static" }))
  .get("*", serveStatic({ path: "./dist/static/index.html" }));

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
  );

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
  port: 4001,
  fetch: app.fetch,
};

getAppLogger("server", "bootstrap").info("server.started", {
  port: server.port,
  sentryEnabled: Boolean(sentryDsn),
});

export { app, server };
export default server;
