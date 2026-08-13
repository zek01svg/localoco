import * as Sentry from "@sentry/react";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { configureAppLogging, getAppLogger } from "#shared/logger.ts";

import { env } from "./env";
import "./globals.css";
import { NuqsProvider } from "./providers/nuqs";
import { ReactQueryProvider } from "./providers/react-query";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new router instance
const router = createRouter({ routeTree });
const sentryDsn = env.VITE_SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.DEV ? 1 : 0.2,
  });
}

configureAppLogging({
  runtime: "browser",
  isDevelopment: import.meta.env.DEV,
  enableSentrySink: Boolean(sentryDsn),
});

const logger = getAppLogger("browser", "bootstrap");
logger.info("frontend.startup", {
  mode: import.meta.env.MODE,
  sentryEnabled: Boolean(sentryDsn),
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Render the app
const rootElement = document.querySelector("#root");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ReactQueryProvider>
        <NuqsProvider>
          <RouterProvider router={router} />
        </NuqsProvider>
      </ReactQueryProvider>
    </StrictMode>
  );
}
