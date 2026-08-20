import * as Sentry from "@sentry/react";
import { createRouter } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { env } from "#client/env";
import { initClientSentry } from "#client/lib/sentry";
import { routeTree } from "#client/routeTree.gen";

type ClientInitOptions = {
  dsn: string;
  environment: string;
  release: string;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  tracesSampleRate: number;
};

type ReplayOptions = {
  maskAllText: boolean;
  blockAllMedia: boolean;
  maskAllInputs: boolean;
  networkDetailAllowUrls: string[];
  networkCaptureBodies: boolean;
};

vi.mock("@sentry/react", () => ({
  init: vi.fn<(options: ClientInitOptions) => void>(),
  tanstackRouterBrowserTracingIntegration: vi.fn<(_router: unknown) => { name: string }>(() => ({
    name: "TanStackRouterTracing",
  })),
  replayIntegration: vi.fn<(opts?: ReplayOptions) => { name: string }>(() => ({
    name: "Replay",
  })),
}));

describe("client Sentry initialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes Sentry when VITE_SENTRY_DSN is configured", () => {
    const originalDsn = env.VITE_SENTRY_DSN;
    try {
      Reflect.set(env, "VITE_SENTRY_DSN", "https://examplePublicKey@o0.ingest.sentry.io/123456");
      const router = createRouter({ routeTree });
      initClientSentry(router);

      const calls = vi.mocked(Sentry.init).mock.calls;
      expect(calls.length).toBe(1);
      const [options] = calls[0];
      expect(options.dsn).toBe("https://examplePublicKey@o0.ingest.sentry.io/123456");
      expect(options.environment).toBe(import.meta.env.MODE);
      expect(options.release).toMatch(/^localoco@\d+\.\d+\.\d+/u);
      expect(options.replaysSessionSampleRate).toBe(0);
      expect(options.replaysOnErrorSampleRate).toBe(1.0);
      expect(options.tracesSampleRate).toBe(1.0);

      expect(Sentry.tanstackRouterBrowserTracingIntegration).toHaveBeenCalledWith(router);

      const replayCalls = vi.mocked(Sentry.replayIntegration).mock.calls;
      expect(replayCalls.length).toBe(1);
      const [replayOpts] = replayCalls[0];
      expect(replayOpts?.maskAllText).toBe(true);
      expect(replayOpts?.blockAllMedia).toBe(true);
      expect(replayOpts?.maskAllInputs).toBe(true);
      expect(replayOpts?.networkDetailAllowUrls).toEqual([]);
      expect(replayOpts?.networkCaptureBodies).toBe(false);
    } finally {
      Reflect.set(env, "VITE_SENTRY_DSN", originalDsn);
    }
  });

  it("safely skips Sentry initialization when VITE_SENTRY_DSN is absent", () => {
    const originalDsn = env.VITE_SENTRY_DSN;
    try {
      Reflect.set(env, "VITE_SENTRY_DSN", undefined);
      const router = createRouter({ routeTree });
      initClientSentry(router);
      expect(Sentry.init).not.toHaveBeenCalled();
    } finally {
      Reflect.set(env, "VITE_SENTRY_DSN", originalDsn);
    }
  });
});
