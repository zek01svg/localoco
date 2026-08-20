type ClientEnv = {
  VITE_APP_URL: string;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_ORG?: string;
  VITE_SENTRY_PROJECT?: string;
  VITE_SENTRY_RELEASE?: string;
  VITE_GOOGLE_MAPS_API_KEY?: string;
};

const win = typeof window !== "undefined" ? window : undefined;

export const env: ClientEnv = {
  VITE_APP_URL:
    win?.__env?.VITE_APP_URL ?? import.meta.env?.VITE_APP_URL ?? "http://localhost:4000",
  VITE_SENTRY_DSN: win?.__env?.VITE_SENTRY_DSN ?? import.meta.env?.VITE_SENTRY_DSN,
  VITE_SENTRY_ORG: win?.__env?.VITE_SENTRY_ORG ?? import.meta.env?.VITE_SENTRY_ORG,
  VITE_SENTRY_PROJECT: win?.__env?.VITE_SENTRY_PROJECT ?? import.meta.env?.VITE_SENTRY_PROJECT,
  VITE_SENTRY_RELEASE: win?.__env?.VITE_SENTRY_RELEASE ?? import.meta.env?.VITE_SENTRY_RELEASE,
  VITE_GOOGLE_MAPS_API_KEY:
    win?.__env?.VITE_GOOGLE_MAPS_API_KEY ?? import.meta.env?.VITE_GOOGLE_MAPS_API_KEY,
};
