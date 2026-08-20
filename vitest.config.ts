import { defineConfig } from "vitest/config";

import path from "path";

const baseResolve = {
  alias: {
    "#client": path.resolve(import.meta.dirname, "./src"),
    "#server": path.resolve(import.meta.dirname, "./server"),
    "#shared": path.resolve(import.meta.dirname, "./shared"),
    // Bun's built-in "bun" module cannot be resolved by vitest's node
    // runtime; the stub at tests/stubs/bun.ts satisfies module loading
    // (production never runs through vite).
    bun: path.resolve(import.meta.dirname, "./tests/stubs/bun.ts"),
    src: path.resolve(import.meta.dirname, "./src"),
    "@": path.resolve(import.meta.dirname, "./src"),
  },
};

export const baseConfig = defineConfig({
  resolve: baseResolve,
  test: {
    coverage: {
      provider: "v8",
      reporter: [
        "text",
        "html",
        [
          "json",
          {
            file: `../coverage.json`,
          },
        ],
      ],
      enabled: true,
      all: true,
      include: ["server/**", "src/**", "shared/**"],
      exclude: [
        "src/components/ui/**",
        "src/routeTree.gen.ts",
        "server/database/drizzle/**",
        "**/tests/**",
        "**/*.d.ts",
        "**/node_modules/**",
        "**/dist/**",
      ],
    },
    projects: [
      {
        resolve: baseResolve,
        test: {
          name: "server-unit",
          environment: "node",
          include: ["server/tests/unit/**/*.test.ts"],
          exclude: ["tests/e2e/**", "**/node_modules/**", "**/dist/**"],
        },
      },
      {
        resolve: baseResolve,
        test: {
          name: "client-unit",
          environment: "jsdom",
          include: ["src/**/*.test.ts?(x)"],
          exclude: ["tests/e2e/**", "**/node_modules/**", "**/dist/**"],
          setupFiles: [path.resolve(import.meta.dirname, "./src/tests/setup.ts")],
        },
      },
      {
        resolve: baseResolve,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          exclude: ["tests/e2e/**", "**/node_modules/**", "**/dist/**"],
        },
      },
    ],
  },
});

export default baseConfig;
