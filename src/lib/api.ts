import { env } from "#client/env.ts";

const origin =
  env.VITE_APP_URL ||
  (typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "http://localhost:4000");

export const apiUrl = `${origin}/api`;
