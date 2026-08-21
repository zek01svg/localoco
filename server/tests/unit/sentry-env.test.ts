import { createEnv } from "@t3-oss/env-core";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

const createTestEnv = (runtimeEnv: Record<string, string | undefined>) =>
  createEnv({
    client: {
      VITE_SENTRY_DSN: z.url(),
      VITE_SENTRY_ORG: z.string().min(1).optional(),
      VITE_SENTRY_PROJECT: z.string().min(1).optional(),
      VITE_SENTRY_RELEASE: z.string().min(1).optional(),
    },
    server: {
      NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      SENTRY_DSN: z.url(),
      SENTRY_RELEASE: z.string().min(1).optional(),
      SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
    },
    clientPrefix: "VITE_",
    isServer: true,
    runtimeEnv,
    emptyStringAsUndefined: true,
    skipValidation: false,
  });

describe("Sentry environment schema validation with t3-env", () => {
  it("requires valid URLs for SENTRY_DSN and VITE_SENTRY_DSN", () => {
    const env = createTestEnv({
      NODE_ENV: "production",
      SENTRY_DSN: "https://examplePublicKey@o0.ingest.sentry.io/0",
      VITE_SENTRY_DSN: "https://examplePublicKey@o0.ingest.sentry.io/0",
    });

    expect(env.SENTRY_DSN).toBe("https://examplePublicKey@o0.ingest.sentry.io/0");
    expect(env.VITE_SENTRY_DSN).toBe("https://examplePublicKey@o0.ingest.sentry.io/0");
  });

  it("fails when SENTRY_DSN is missing or invalid URL", () => {
    expect(() =>
      createTestEnv({
        NODE_ENV: "production",
        SENTRY_DSN: "not-a-url",
        VITE_SENTRY_DSN: "https://examplePublicKey@o0.ingest.sentry.io/0",
      })
    ).toThrow(/Invalid/iu);
  });

  it("fails when VITE_SENTRY_DSN is missing", () => {
    expect(() =>
      createTestEnv({
        NODE_ENV: "production",
        SENTRY_DSN: "https://examplePublicKey@o0.ingest.sentry.io/0",
      })
    ).toThrow(/Invalid/iu);
  });

  it("coerces empty string optional fields to undefined via emptyStringAsUndefined", () => {
    const env = createTestEnv({
      NODE_ENV: "production",
      SENTRY_DSN: "https://examplePublicKey@o0.ingest.sentry.io/0",
      VITE_SENTRY_DSN: "https://examplePublicKey@o0.ingest.sentry.io/0",
      SENTRY_RELEASE: "",
      VITE_SENTRY_RELEASE: "",
      SENTRY_AUTH_TOKEN: "",
    });

    expect(env.SENTRY_RELEASE).toBeUndefined();
    expect(env.VITE_SENTRY_RELEASE).toBeUndefined();
    expect(env.SENTRY_AUTH_TOKEN).toBeUndefined();
  });

  it("accepts valid explicit release identifiers and auth token", () => {
    const env = createTestEnv({
      NODE_ENV: "production",
      SENTRY_DSN: "https://examplePublicKey@o0.ingest.sentry.io/0",
      VITE_SENTRY_DSN: "https://examplePublicKey@o0.ingest.sentry.io/0",
      SENTRY_RELEASE: "localoco@2.1.0+sha-1234567",
      VITE_SENTRY_RELEASE: "localoco@2.1.0+sha-1234567",
      SENTRY_AUTH_TOKEN: "sntrys_secret_123",
    });

    expect(env.SENTRY_RELEASE).toBe("localoco@2.1.0+sha-1234567");
    expect(env.VITE_SENTRY_RELEASE).toBe("localoco@2.1.0+sha-1234567");
    expect(env.SENTRY_AUTH_TOKEN).toBe("sntrys_secret_123");
  });
});
