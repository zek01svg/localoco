import { defineConfig, defineProject, mergeConfig } from "vitest/config";

export const baseConfig = defineConfig({
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
