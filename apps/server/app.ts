import * as Sentry from "@sentry/node";
import { env } from "@server/env";
import auth from "@server/lib/auth";
import errorHandler from "@server/middleware/error-handler";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import type { AppVariables } from "./lib/types";
import announcementRouter from "./routes/announcement/index.routes";
import bookmarkRouter from "./routes/bookmark/index.routes";
import businessRouter from "./routes/business/index.routes";
import fileRouter from "./routes/file/index.routes";
import forumRouter from "./routes/forum/index.routes";
import reviewRouter from "./routes/review/index.routes";
import userRouter from "./routes/user/index.routes";
import qstashWebhook from "./routes/webhooks/qstash";

// init hono with custom variables to include session
const app = new Hono<{ Variables: AppVariables }>();

// enable CORS
app.use(
  "*",
  cors({
    origin: env.APP_URL,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

// enable secure headers
app.use("*", secureHeaders());

// initialize sentry
Sentry.init({
  dsn: env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  enableLogs: true,
  integrations: [Sentry.pinoIntegration()],
});

// mount the error handling middleware
app.onError(errorHandler);

// mount the routers
const routes = app
  .route("/api/businesses", businessRouter)
  .route("/api/users", userRouter)
  .route("/api/reviews", reviewRouter)
  .route("/api/announcements", announcementRouter)
  .route("/api/bookmarks", bookmarkRouter)
  .route("/api/forum", forumRouter)
  .route("/api/files", fileRouter)
  .route("/api/webhooks", qstashWebhook);

export type ApiType = typeof routes;

// this endpoint dynamically injects environment variables into the client at runtime
app.get("/api/runtime", async (c) => {
  return c.text(
    `window.__env = ${JSON.stringify(Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith("VITE_"))), null, 2)}`.trim(),
    200,
    {
      "Content-Type": "application/javascript",
    }
  );
});

app.get("/health", async (c) => {
  return c.json(
    {
      health: "ok",
    },
    200
  );
});

// handler for better-auth
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

export default app;
