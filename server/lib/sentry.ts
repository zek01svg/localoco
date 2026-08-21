import * as Sentry from "@sentry/bun";

import { env } from "#server/env";
import { resolveRelease } from "#shared/release.ts";

export function initSentry(): void {
  if (typeof Bun === "undefined" || !env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: resolveRelease(env.SENTRY_RELEASE ?? env.VITE_SENTRY_RELEASE),
    tracesSampleRate: env.NODE_ENV === "development" ? 1.0 : 0.1,
  });
}
