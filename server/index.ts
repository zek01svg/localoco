import { Scalar } from "@scalar/hono-api-reference";
import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { serveStatic } from "hono/bun";

import { env } from "#server/env";
import {
  auth,
  authRateLimit,
  createErrorHandler,
  HttpError,
  initSentry,
  publicRateLimit,
} from "#server/lib";
import { healthRoutes, listingsRoutes, smokeRoutes, webhooksRoutes } from "#server/routes";
import { getSpaShell } from "#server/spa.ts";
import { configureAppLogging, getAppLogger } from "#shared/logger.ts";

initSentry();

configureAppLogging({
  runtime: "server",
  isDevelopment: env.NODE_ENV === "development",
  enableSentrySink: Boolean(env.SENTRY_DSN ?? env.VITE_SENTRY_DSN),
});

const logger = getAppLogger("server", "http");

type AppEnv = { Variables: { requestId: string } };

const openapiDocumentation = {
  info: {
    title: "LocaLoco API",
    version: "2.0.0",
    description: "API for the LocaLoco local-business discovery platform.",
  },
  servers: [
    {
      url: "http://localhost:4001",
      description: "Local development server",
    },
  ],
};

// Assets and the SPA shell. Mounted on the app after the /api wildcard so
// the shell's catch-all can never shadow contract routes.
const baseRoutes = new Hono()
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
  .use("/assets/*", c => Promise.resolve(c.notFound()))
  .get("*", c =>
    c.html(getSpaShell(), 200, {
      // The shell is unbustable: it is not content-addressed like the
      // fingerprinted assets, so it must always be revalidated.
      "Cache-Control": "no-store",
    })
  );

// Application-owned API surface. Unknown /api paths answer the not_found
// envelope instead of falling through to the SPA shell.
const apiRoutes = new Hono()
  .get("/runtime.js", c => {
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
  .route("/", smokeRoutes)
  .route("/", webhooksRoutes)
  .use("/auth/*", authRateLimit)
  .on(["POST", "GET"], "/auth/*", c => {
    return auth.handler(c.req.raw);
  })
  .use("*", publicRateLimit)
  .route("/", listingsRoutes);

// Chained from the first call so `typeof app` infers every route: hono/client
// derives its client type from this export.
const app = new Hono<AppEnv>()
  // Every request carries a server-owned correlation id, echoed on the
  // response and attached to all server-side log lines for the request.
  .use(async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set("requestId", requestId);
    c.header("X-Request-Id", requestId);
    await next();
  })
  .route("/api", apiRoutes)
  .route("/", healthRoutes);

// Scalar and the OpenAPI endpoint exist only outside production: the routes
// are not registered at all when NODE_ENV is production. They must be
// registered before the /api/* not-found wildcard below: hono's router
// prefers the first registered match, so a wildcard mounted earlier would
// shadow them.
if (env.NODE_ENV !== "production") {
  app
    .get("/api/openapi", openAPIRouteHandler(app, { documentation: openapiDocumentation }))
    .get("/api/scalar", Scalar({ url: "/api/openapi", theme: "deepSpace" }));
}

// Unknown /api paths answer the not_found envelope instead of falling
// through to the SPA shell. Registered after the contract routes and the
// dev-only openapi/scalar routes, and before the SPA shell below: hono's
// router prefers the first registered match, so registration order decides.
app.all("/api/*", () => {
  throw new HttpError(404, "not_found", "The requested API route does not exist.");
});

// The SPA shell catch-all goes last so nothing under /api can reach it.
app.route("/", baseRoutes);

app.onError(
  createErrorHandler({
    logger,
    captureException:
      (env.SENTRY_DSN ?? env.VITE_SENTRY_DSN) ? e => Sentry.captureException(e) : undefined,
  })
);

const server = {
  port: env.PORT,
  fetch: app.fetch,
};

getAppLogger("server", "bootstrap").info("Server Started", {
  port: server.port,
  sentryEnabled: Boolean(env.SENTRY_DSN ?? env.VITE_SENTRY_DSN),
});

export { app, server };
export type AppType = typeof app;
export default server;
