import { createAuthClient } from "better-auth/react";

import { env } from "#client/env.ts";

const appUrl =
  env.VITE_APP_URL ||
  (typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "http://localhost:4000");

export const auth = createAuthClient({
  baseURL: `${appUrl}/api/auth`,
});
