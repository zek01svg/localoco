/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_URL: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ORG?: string;
  readonly VITE_SENTRY_PROJECT?: string;
  readonly VITE_SENTRY_RELEASE?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface Window {
  __env?: {
    VITE_APP_URL?: string;
    VITE_SENTRY_DSN?: string;
    VITE_SENTRY_ORG?: string;
    VITE_SENTRY_PROJECT?: string;
    VITE_SENTRY_RELEASE?: string;
    VITE_GOOGLE_MAPS_API_KEY?: string;
  };
}
