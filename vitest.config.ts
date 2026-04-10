import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["node_modules", "coverage", "build", "playwright", "tests/e2e"],
    coverage: {
      provider: "istanbul" as const,
      enabled: true,
      reporter: [
        ["json", { file: "coverage/coverage.json" }],
        ["html"],
        ["text-summary"],
        ["dot"],
      ] as const,
    },
  },
});
