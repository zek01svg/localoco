import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";

import { createErrorHandler, HttpError, onValidationError } from "#server/lib/errors";
import { errorEnvelopeSchema } from "#shared/contracts/error";

const logger = {
  warning: vi.fn<(...args: unknown[]) => void>(),
  error: vi.fn<(...args: unknown[]) => void>(),
};

const makeApp = (captureException: (err: unknown) => void = () => {}) => {
  const app = new Hono<{ Variables: { requestId: string } }>();
  app.use(async (c, next) => {
    c.set("requestId", "req-123");
    await next();
  });
  app.get("/typed", () => {
    throw new HttpError(404, "not_found", "Listing not found");
  });
  app.get("/typed-details", () => {
    throw new HttpError(422, "validation_failed", "Invalid value", {
      issues: { formErrors: [], fieldErrors: { postalCode: ["Expected 6 digits"] } },
    });
  });
  app.get("/internal", () => {
    throw new Error("connection string: postgresql://secret:password@db.internal/db");
  });
  app.onError(createErrorHandler({ logger, captureException }));
  return app;
};

describe("error envelope", () => {
  it("maps a typed HttpError to its status, code, message, and request id", async () => {
    const response = await makeApp().request("/typed");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "not_found", message: "Listing not found", requestId: "req-123" },
    });
  });

  it("includes safe details when present", async () => {
    const response = await makeApp().request("/typed-details");

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "validation_failed",
        message: "Invalid value",
        details: {
          issues: { formErrors: [], fieldErrors: { postalCode: ["Expected 6 digits"] } },
        },
        requestId: "req-123",
      },
    });
  });

  it("produces envelopes that satisfy the transport schema", async () => {
    const bodies = await Promise.all(
      ["/typed", "/typed-details", "/internal"].map(async path => {
        const response = await makeApp().request(path);
        return errorEnvelopeSchema.safeParse(await response.json());
      })
    );

    for (const result of bodies) {
      expect(result.success).toBe(true);
    }
  });
});

describe("error handler logging", () => {
  it("logs the root cause of a typed error without exposing it in the response", async () => {
    const cause = new Error("connection refused: db.internal:5432");
    const app = new Hono<{ Variables: { requestId: string } }>();
    app.use(async (c, next) => {
      c.set("requestId", "req-123");
      await next();
    });
    app.get("/dependency", () => {
      throw new HttpError(
        503,
        "dependency_unavailable",
        "Listings are temporarily unavailable. Try again shortly.",
        undefined,
        { cause }
      );
    });
    app.onError(createErrorHandler({ logger }));

    const response = await app.request("/dependency");
    expect(response.status).toBe(503);
    const body: unknown = await response.json();
    expect(JSON.stringify(body)).not.toContain("connection refused");
    expect(logger.warning).toHaveBeenCalledWith(
      "request.failed",
      expect.objectContaining({ cause })
    );
  });
});

describe("unexpected error handling", () => {
  it("converts an unexpected error to a generic internal_error and never leaks its message", async () => {
    const captureException = vi.fn<(err: unknown) => void>();
    const response = await makeApp(captureException).request("/internal");

    expect(response.status).toBe(500);
    const body: unknown = await response.json();
    expect(body).toEqual({
      error: {
        code: "internal_error",
        message: "An unexpected error occurred.",
        requestId: "req-123",
      },
    });
    expect(JSON.stringify(body)).not.toContain("postgresql://");
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(captureException).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ request_id: "req-123" })
    );
  });
});

describe("validation failure hook", () => {
  it("throws a 400 invalid_request HttpError with flattened issues", () => {
    expect(() => {
      onValidationError({
        success: false,
        error: [
          { message: "Expected integer", path: ["limit"] },
          { message: "Too long", path: ["cursor"] },
        ],
        data: undefined,
        target: "query",
      });
    }).toThrow(
      expect.objectContaining({
        status: 400,
        code: "invalid_request",
        details: {
          issues: {
            formErrors: [],
            fieldErrors: { limit: ["Expected integer"], cursor: ["Too long"] },
          },
        },
      })
    );
  });

  it("is a no-op on success", () => {
    expect(() => {
      onValidationError({ success: true, data: { limit: 20 }, target: "query" });
    }).not.toThrow();
  });
});
