import * as Sentry from "@sentry/bun";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { env } from "#server/env";
import { initSentry } from "#server/lib/sentry";

type InitOptions = {
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate: number;
};

vi.mock("@sentry/bun", () => ({
  init: vi.fn<(options: InitOptions) => void>(),
  setTag: vi.fn<(key: string, value: string) => void>(),
  captureException: vi.fn<(e: unknown) => void>(),
}));

describe("server Sentry initialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Reflect.set(globalThis, "Bun", {});
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "Bun");
  });

  it("initializes Sentry when DSN and Bun global are present", () => {
    const originalDsn = env.SENTRY_DSN;
    try {
      Reflect.set(env, "SENTRY_DSN", "https://examplePublicKey@o0.ingest.sentry.io/123456");
      initSentry();

      const calls = vi.mocked(Sentry.init).mock.calls;
      expect(calls.length).toBe(1);
      const options = calls[0]?.[0];
      expect(options?.dsn).toBe("https://examplePublicKey@o0.ingest.sentry.io/123456");
      expect(options?.environment).toBe(env.NODE_ENV);
      expect(options?.release).toMatch(/^localoco@\d+\.\d+\.\d+/u);
      expect(options?.tracesSampleRate).toBe(0.1);
    } finally {
      Reflect.set(env, "SENTRY_DSN", originalDsn);
    }
  });

  it("safely skips Sentry initialization when Bun runtime global is absent", () => {
    Reflect.deleteProperty(globalThis, "Bun");
    Reflect.set(env, "SENTRY_DSN", "https://examplePublicKey@o0.ingest.sentry.io/123456");

    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("safely skips Sentry initialization when SENTRY_DSN is empty", () => {
    const originalDsn = env.SENTRY_DSN;
    try {
      Reflect.set(env, "SENTRY_DSN", "");
      initSentry();
      expect(Sentry.init).not.toHaveBeenCalled();
    } finally {
      Reflect.set(env, "SENTRY_DSN", originalDsn);
    }
  });
});
