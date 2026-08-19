import { describe, expect, it } from "vitest";

import { classifyEmailError, sanitizeErrorMessage } from "#server/lib/email/classifier";

describe("email classifier - sanitizeErrorMessage", () => {
  it("redacts Resend API keys from error messages", () => {
    const dummyKey = ["re", "mock", "1234567890abcdef"].join("_");
    const msg = `Failed sending email with key ${dummyKey}: invalid auth`;
    const sanitized = sanitizeErrorMessage(msg);
    expect(sanitized).not.toContain(dummyKey);
    expect(sanitized).toContain("[REDACTED]");
  });

  it("redacts Bearer tokens from error messages", () => {
    const dummyToken = ["mock", "jwt", "payload", "1234567890"].join(".");
    const msg = `Unauthorized: Bearer ${dummyToken}`;
    const sanitized = sanitizeErrorMessage(msg);
    expect(sanitized).not.toContain(dummyToken);
    expect(sanitized).toContain("[REDACTED]");
  });

  it("redacts secret/token/password assignments", () => {
    const dummySecret = ["mock", "secret", "token", "12345"].join("_");
    const msg = `Connection error with token='${dummySecret}'`;
    const sanitized = sanitizeErrorMessage(msg);
    expect(sanitized).not.toContain(dummySecret);
    expect(sanitized).toContain("[REDACTED]");
  });

  it("truncates excessively long messages to 1000 characters", () => {
    const longMsg = "a".repeat(2000);
    const sanitized = sanitizeErrorMessage(longMsg);
    expect(sanitized.length).toBeLessThanOrEqual(1000);
    expect(sanitized.endsWith("...")).toBe(true);
  });
});

describe("email classifier - classifyEmailError by status code", () => {
  it("classifies 429 Too Many Requests as retryable", () => {
    const result = classifyEmailError(429, new Error("Rate limit exceeded"));
    expect(result.isRetryable).toBe(true);
    expect(result.classification).toBe("retryable");
  });

  it("classifies 5xx server errors as retryable", () => {
    const statuses = [500, 502, 503, 504];
    for (const status of statuses) {
      const result = classifyEmailError(status, new Error(`Server error ${status}`));
      expect(result.isRetryable).toBe(true);
      expect(result.classification).toBe("retryable");
    }
  });

  it("classifies 4xx client errors as terminal", () => {
    const statuses = [400, 401, 403, 404, 422];
    for (const status of statuses) {
      const result = classifyEmailError(status, new Error(`Client error ${status}`));
      expect(result.isRetryable).toBe(false);
      expect(result.classification).toBe("terminal");
    }
  });
});

describe("email classifier - classifyEmailError by message & sanitization", () => {
  it("classifies network and timeout errors as retryable when status is absent", () => {
    const transientErrors = [
      "Connection timed out after 5000ms",
      "fetch failed: ECONNRESET",
      "connect ETIMEDOUT 104.18.2.1",
      "Service Unavailable temporarily",
    ];
    for (const msg of transientErrors) {
      const result = classifyEmailError(undefined, new Error(msg));
      expect(result.isRetryable).toBe(true);
      expect(result.classification).toBe("retryable");
    }
  });

  it("classifies invalid recipient errors as terminal", () => {
    const result = classifyEmailError(
      undefined,
      new Error("The email address is invalid: invalid recipient")
    );
    expect(result.isRetryable).toBe(false);
    expect(result.classification).toBe("terminal");
  });

  it("sanitizes the error message in the output", () => {
    const dummyKey = ["re", "test", "key", "9876543210"].join("_");
    const result = classifyEmailError(500, new Error(`Internal error with key ${dummyKey}`));
    expect(result.sanitizedMessage).not.toContain(dummyKey);
    expect(result.sanitizedMessage).toContain("[REDACTED]");
  });
});

describe("email classifier - complex and edge error objects", () => {
  it("handles non-Error objects and complex objects gracefully", () => {
    const dummyKey = ["re", "object", "key", "12345678"].join("_");
    const objectError = {
      code: "ECONNREFUSED",
      details: "Connection refused to mail host",
      apiKey: dummyKey,
    };
    const result = classifyEmailError(undefined, objectError);
    expect(result.isRetryable).toBe(true);
    expect(result.sanitizedMessage).not.toContain(dummyKey);
    expect(result.sanitizedMessage).toContain("[REDACTED]");
  });

  it("handles circular objects without crashing", () => {
    const circularObj: Record<string, unknown> = { name: "CircularError" };
    circularObj.self = circularObj;

    const result = classifyEmailError(500, circularObj);
    expect(result.classification).toBe("retryable");
    expect(result.sanitizedMessage).toBe("Unserializable error object");
  });

  it("handles primitive error values (strings, numbers, null, undefined)", () => {
    expect(classifyEmailError(500, "string error").sanitizedMessage).toBe("string error");
    expect(classifyEmailError(500, 404).sanitizedMessage).toBe("404");
    expect(classifyEmailError(500, null).sanitizedMessage).toBe("Unknown error");
    const undefVal: unknown = undefined;
    expect(classifyEmailError(500, undefVal).sanitizedMessage).toBe("Unknown error");
  });

  it("classifies generic 5xx status codes (e.g. 599) as retryable", () => {
    const result = classifyEmailError(599, new Error("Custom server error"));
    expect(result.isRetryable).toBe(true);
    expect(result.classification).toBe("retryable");
  });
});
