import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import { resolveRelease } from "./shared/release.ts";

import path from "path";

// https://vite.dev/config/

export default defineConfig(({ mode }) => {
  // loadEnv is typed Record<string, string>, but absent vars really are
  // undefined at runtime; the honest type keeps the `?.` guards below valid.
  const env: Record<string, string | undefined> = loadEnv(mode, process.cwd(), "");
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN?.trim();
  const sentryOrg = env.VITE_SENTRY_ORG?.trim();
  const sentryProject = env.VITE_SENTRY_PROJECT?.trim();
  const sentryRelease = resolveRelease(env.VITE_SENTRY_RELEASE ?? env.SENTRY_RELEASE);
  const shouldUploadSourcemaps =
    mode === "production" && Boolean(sentryAuthToken && sentryOrg && sentryProject);

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
              release: {
                name: sentryRelease,
              },
              sourcemaps: {
                assets: ["./dist/static/**/*"],
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
