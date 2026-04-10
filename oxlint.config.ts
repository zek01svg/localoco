import { defineConfig } from "oxlint";

export default defineConfig({
  options: {
    typeAware: true,
  },
  plugins: ["typescript", "unicorn", "import", "promise"],
  categories: {
    correctness: "error",
    suspicious: "warn",
    perf: "warn",
  },
  env: {
    es2024: true,
  },
  ignorePatterns: [
    "node_modules/**",
    "dist/**",
    "build/**",
    ".hono/**",
    "coverage/**",
    "vite.config.ts.timestamp-*",
  ],
  rules: {
    "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    "no-debugger": "error",

    "typescript/no-floating-promises": "error",
    "typescript/no-misused-promises": "error",

    "unicorn/no-null": "off",

    "no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "typescript/consistent-type-imports": [
      "warn",
      { prefer: "type-imports", fixStyle: "separate-type-imports" },
    ],
    "typescript/no-unnecessary-condition": [
      "error",
      { allowConstantLoopConditions: true },
    ],
    "typescript/no-non-null-assertion": "error",
    "typescript/no-explicit-any": "warn",

    "import/no-duplicates": "error",
    "import/first": "error",
    "import/extensions": "off",
    "import/consistent-type-specifier-style": ["error", "prefer-top-level"],

    "no-restricted-imports": [
      "error",
      {
        name: "zod",
        message: "Use `import { z } from 'zod/v4'` instead to ensure v4.",
      },
    ],
  },
});
