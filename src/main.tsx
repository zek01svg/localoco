import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { configureAppLogging, getAppLogger } from "#shared/logger.ts";

import "@fontsource/young-serif/400.css";
import "@fontsource-variable/overpass/index.css";
import "@fontsource/spline-sans-mono/400.css";
import "@fontsource/spline-sans-mono/500.css";

import { env } from "./env";
import "./globals.css";
import { initClientSentry } from "./lib/sentry";
import { ReactQueryProvider } from "./providers/react-query";
import { AppThemeProvider } from "./providers/theme";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new router instance
const router = createRouter({ routeTree });

initClientSentry(router);

configureAppLogging({
  runtime: "browser",
  isDevelopment: import.meta.env.DEV,
  enableSentrySink: Boolean(env.VITE_SENTRY_DSN),
});

const logger = getAppLogger("browser", "bootstrap");
logger.info("frontend.startup", {
  mode: import.meta.env.MODE,
  sentryEnabled: Boolean(env.VITE_SENTRY_DSN),
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
        <AppThemeProvider>
          <RouterProvider router={router} />
        </AppThemeProvider>
      </ReactQueryProvider>
    </StrictMode>
  );
}
