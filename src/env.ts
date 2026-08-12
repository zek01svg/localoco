type ClientEnv = {
  VITE_APP_URL: string;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_ORG?: string;
  VITE_SENTRY_PROJECT?: string;
};

export const env: ClientEnv = {
  VITE_APP_URL: window.__env?.VITE_APP_URL ?? import.meta.env.VITE_APP_URL,
  VITE_SENTRY_DSN: window.__env?.VITE_SENTRY_DSN ?? import.meta.env.VITE_SENTRY_DSN,
  VITE_SENTRY_ORG: window.__env?.VITE_SENTRY_ORG ?? import.meta.env.VITE_SENTRY_ORG,
  VITE_SENTRY_PROJECT: window.__env?.VITE_SENTRY_PROJECT ?? import.meta.env.VITE_SENTRY_PROJECT,
};
