import path from "node:path";
import { fileURLToPath } from "node:url";
import { includeIgnoreFile } from "@eslint/compat";
import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, ".gitignore");

const restrictEnvAccess = tseslint.config(
    {
        ignores: ["**/env.ts", "**/server/env.ts", "**/src/env.ts"],
    },
    {
        files: ["**/*.js", "**/*.ts", "**/*.tsx"],
        rules: {
            "no-restricted-properties": [
                "error",
                {
                    object: "process",
                    property: "env",
                    message:
                        "Use `import { env } from 'env'` instead to ensure validated types.",
                },
            ],
            "no-restricted-imports": [
                "error",
                {
                    name: "process",
                    importNames: ["env"],
                    message:
                        "Use `import { env } from 'env'` instead to ensure validated types.",
                },
            ],
        },
    },
);

export default tseslint.config(
    includeIgnoreFile(gitignorePath),
    { ignores: ["**/*.config.*", "dist", "build", ".drizzle", "coverage"] },

    // 2. Base Configuration
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ["**/*.js", "**/*.ts", "**/*.tsx"],
        languageOptions: {
            ecmaVersion: 2020,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname,
            },
        },
        plugins: {
            import: importPlugin,
        },
        rules: {
            // RELAXED RULESET
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/ban-ts-comment": "off",

            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],

            "@typescript-eslint/consistent-type-imports": [
                "warn",
                { prefer: "type-imports", fixStyle: "separate-type-imports" },
            ],

            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "import/extensions": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "no-console": "off",
        },
    },

    // 3. Frontend Specific Config (src/)
    {
        files: ["src/**/*.{ts,tsx}"],
        languageOptions: {
            globals: { ...globals.browser },
        },
        plugins: {
            "react-hooks": reactHooks,
        },
        rules: {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
        },
    },

    // 4. Backend Specific Config (server/)
    {
        files: ["server/**/*.{ts,js}"],
        languageOptions: {
            globals: { ...globals.node },
        },
    },

    ...restrictEnvAccess,
);
