import type { Context, Next } from "hono";

import { describe, expect, it, vi } from "vitest";

// hono/bun's adapter destructures `Bun` at module top level, which does not
// exist in vitest's runtime. The routes under test never reach static serving,
// so a pass-through mock preserves the real behavior.
vi.mock("hono/bun", () => ({
  serveStatic: () => (_c: Context, next: Next) => next(),
}));

// Sentinel values for server-only vars. Under NODE_ENV=test, skipValidation
// would otherwise leave these undefined and JSON.stringify would drop them,
// which would make the VITE_-only assertion pass even if the key filter in
// server/index.ts were deleted. Seeding real values first means the negative
// assertions below only pass when the filter actually strips server keys.
process.env.DATABASE_URL = "postgresql://sentinel-db-zzz";
process.env.SMTP_PASS = "sentinel-smtp-pass-zzz";

// Dynamic import so the env assignments above land before the server entry
// module (which snapshots `env` at load time) is evaluated.
const { app } = await import("#server/index");

describe("server HTTP seam", () => {
  it("GET /health returns status ok", async () => {
    const response = await app.request("/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("GET /api/runtime.js only exposes VITE_-prefixed keys", async () => {
    const response = await app.request("/api/runtime.js");

    expect(response.status).toBe(200);
    const body = await response.text();
    // The route serializes `window.__env = { ... }` with quoted keys; extract
    // them without JSON.parse, whose `any` return would need an unsafe cast.
    const keys = Array.from(body.matchAll(/"([A-Za-z_][A-Za-z0-9_]*)"\s*:/gu), m => m[1]);
    expect(keys).toContain("VITE_APP_URL");
    expect(keys.every(key => key.startsWith("VITE_"))).toBe(true);
    // Server-only values must never leak into the client runtime bundle.
    expect(body).not.toContain("DATABASE_URL");
    expect(body).not.toContain("sentinel-db-zzz");
    expect(body).not.toContain("sentinel-smtp-pass-zzz");
  });
});
