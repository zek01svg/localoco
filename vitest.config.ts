import { defineConfig, defineProject, mergeConfig } from "vitest/config";

import path from "path";

export const baseConfig = defineConfig({
  resolve: {
    alias: {
      "#client": path.resolve(import.meta.dirname, "./src"),
      "#server": path.resolve(import.meta.dirname, "./server"),
      "#shared": path.resolve(import.meta.dirname, "./shared"),
      src: path.resolve(import.meta.dirname, "./src"),
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    coverage: {
      provider: "istanbul" as const,
      reporter: [
        [
          "json",
          {
            file: `../coverage.json`,
          },
        ],
      ] as const,
      enabled: true,
    },
  },
});

const uiConfig = mergeConfig(
  baseConfig,
  defineProject({
    test: {
      environment: "jsdom",
      include: [
        "server/tests/unit/**/*.test.ts",
        "src/**/*.test.ts?(x)",
        "tests/integration/**/*.test.ts",
      ],
      exclude: ["tests/e2e/**", "**/node_modules/**", "**/dist/**"],
    },
  })
);

export default uiConfig;
