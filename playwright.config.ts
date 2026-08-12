import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bun run dev:server",
    url: "http://localhost:4001/health",
    reuseExistingServer: !process.env.CI,
    env: {
      // NODE_ENV=test makes server/env.ts skip validation, so the webServer
      // boots without a .env file. Set via Playwright's env option (not a
      // POSIX shell prefix) because Playwright spawns commands through cmd on
      // Windows, where `VAR=x cmd` breaks.
      NODE_ENV: "test",
    },
  },
});
