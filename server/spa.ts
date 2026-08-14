import { readFileSync } from "node:fs";

// The SPA shell boots the client-rendered React application. Page routes
// answer 200 with this shell; the router renders route-level pending,
// error, not-found, and empty states client-side.
let spaShell: string | undefined;
export function getSpaShell(): string {
  if (!spaShell) {
    try {
      spaShell = readFileSync(new URL("../dist/static/index.html", import.meta.url), "utf-8");
    } catch {
      spaShell = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>LocaLoco</title></head><body><div id="root"></div></body></html>`;
    }
  }
  return spaShell;
}
