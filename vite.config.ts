import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import path from "path";

// https://vite.dev/config/

export default defineConfig(({ mode }) => {
  // loadEnv is typed Record<string, string>, but absent vars really are
  // undefined at runtime; the honest type keeps the `?.` guards below valid.
  const env: Record<string, string | undefined> = loadEnv(mode, process.cwd(), "");
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN?.trim();
  const sentryOrg = env.VITE_SENTRY_ORG?.trim();
  const sentryProject = env.VITE_SENTRY_PROJECT?.trim();
  const shouldUploadSourcemaps =
    mode === "production" && Boolean(sentryAuthToken && sentryOrg && sentryProject);

  const clientEnv = {
    VITE_APP_URL: env.VITE_APP_URL,
    VITE_SENTRY_DSN: env.VITE_SENTRY_DSN,
    VITE_SENTRY_ORG: env.VITE_SENTRY_ORG,
    VITE_SENTRY_PROJECT: env.VITE_SENTRY_PROJECT,
  };

  return {
    plugins: [
      tanstackRouter({
        target: "react",
      }),
      react(),
      tailwindcss(),
      ...(shouldUploadSourcemaps
        ? [
            sentryVitePlugin({
              authToken: sentryAuthToken,
              org: sentryOrg,
              project: sentryProject,
              telemetry: false,
              sourcemaps: {
                assets: ["./dist/**/*"],
              },
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "#client": path.resolve(import.meta.dirname, "./src"),
        "#server": path.resolve(import.meta.dirname, "./server"),
        "#shared": path.resolve(import.meta.dirname, "./shared"),
        src: path.resolve(import.meta.dirname, "./src"),
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      port: 4000,
      open: false,
      proxy: {
        "/api": {
          target: "http://localhost:4001",
          changeOrigin: true,
        },
      },
    },
    define: {
      process: {
        env: clientEnv,
      },
    },
    build: {
      outDir: "dist/static",
      sourcemap: true,
      rolldownOptions: {
        input: {
          main: path.resolve(import.meta.dirname, "index.html"),
        },
      },
    },
  };
});
