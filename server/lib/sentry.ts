import * as Sentry from "@sentry/bun";

import { env } from "#server/env";

const sentryDsn = env.SENTRY_DSN ?? env.VITE_SENTRY_DSN;
export function initSentry() {
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === "development" ? 1 : 0.2,
    });
  }
}
