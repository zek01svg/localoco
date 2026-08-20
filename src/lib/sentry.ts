import type { AnyRouter } from "@tanstack/react-router";

import * as Sentry from "@sentry/react";

import { resolveRelease } from "#shared/release.ts";

import { env } from "../env";

export function initClientSentry(router: AnyRouter): void {
  const dsn = env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: resolveRelease(env.VITE_SENTRY_RELEASE),
    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.tanstackRouterBrowserTracingIntegration(router),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
        networkDetailAllowUrls: [],
        networkCaptureBodies: false,
      }),
    ],
  });
}
