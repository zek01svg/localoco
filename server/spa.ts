import { readFileSync } from "node:fs";

// Maintenance release (PRS-168): page routes answer 503 + Retry-After so
// crawlers and monitors read the status correctly; /health keeps returning
// success so Cloud Run knows the process is alive. The shell boots the SPA,
// whose LandingPage feature renders the branded maintenance copy.
export const MAINTENANCE_RETRY_AFTER = "3600";

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
