import type * as PipelineModule from "#server/lib/email/pipeline";
import type { Context, Next } from "hono";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { errorEnvelopeSchema } from "#shared/contracts/error";

// hono/bun's adapter destructures `Bun` at module top level, which does not exist in vitest's runtime
vi.mock("hono/bun", () => ({
  serveStatic: () => (_c: Context, next: Next) => next(),
}));

const { mockVerify, mockProcessEmailJob } = vi.hoisted(() => ({
  mockVerify: vi.fn<(_opts: unknown) => Promise<boolean>>(),
  mockProcessEmailJob: vi.fn<(_jobId: string) => Promise<unknown>>(),
}));

vi.mock("#server/lib/email/qstash", () => ({
  verifyQStashSignature: (opts: unknown) => mockVerify(opts),
  publishEmailJob: vi.fn<() => Promise<{ messageId: string }>>(),
}));

vi.mock("#server/lib/email/pipeline", async importOriginal => {
  const actual = await importOriginal<typeof PipelineModule>();
  return {
    ...actual,
    processEmailJob: (jobId: string) => mockProcessEmailJob(jobId),
  };
});

process.env.DATABASE_URL = "postgresql://sentinel-db-zzz";
process.env.BETTER_AUTH_SECRET = "sentinel-auth-secret-zzz";

const { app } = await import("#server/index");

describe("POST /api/webhooks/qstash/email-delivery - Signature Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when upstash-signature header is missing", async () => {
    const response = await app.request("/api/webhooks/qstash/email-delivery", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ jobId: "job_123" }),
    });

    expect(response.status).toBe(401);
    const body: unknown = await response.json();
    const envelope = errorEnvelopeSchema.parse(body);
    expect(envelope.error.code).toBe("unauthorized");
    expect(envelope.error.message).toContain("Invalid QStash signature");
  });

  it("returns 401 when signature verification fails", async () => {
    mockVerify.mockResolvedValueOnce(false);

    const response = await app.request("/api/webhooks/qstash/email-delivery", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "upstash-signature": "invalid_sig",
      },
      body: JSON.stringify({ jobId: "job_123" }),
    });

    expect(response.status).toBe(401);
    const body: unknown = await response.json();
    const envelope = errorEnvelopeSchema.parse(body);
    expect(envelope.error.code).toBe("unauthorized");
  });
});

describe("POST /api/webhooks/qstash/email-delivery - Payload Format Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when JSON body is malformed", async () => {
    mockVerify.mockResolvedValueOnce(true);

    const response = await app.request("/api/webhooks/qstash/email-delivery", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "upstash-signature": "valid_sig",
      },
      body: "not a valid json {",
    });

    expect(response.status).toBe(400);
    const body: unknown = await response.json();
    const envelope = errorEnvelopeSchema.parse(body);
    expect(envelope.error.code).toBe("invalid_request");
  });

  it("returns 400 when JSON body is a non-object type (array or primitive)", async () => {
    mockVerify.mockResolvedValueOnce(true);

    const response = await app.request("/api/webhooks/qstash/email-delivery", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "upstash-signature": "valid_sig",
      },
      body: JSON.stringify(["job_123"]),
    });

    expect(response.status).toBe(400);
    const body: unknown = await response.json();
    const envelope = errorEnvelopeSchema.parse(body);
    expect(envelope.error.code).toBe("invalid_request");
  });
});

describe("POST /api/webhooks/qstash/email-delivery - Job ID Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when jobId is missing in JSON body", async () => {
    mockVerify.mockResolvedValueOnce(true);

    const response = await app.request("/api/webhooks/qstash/email-delivery", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "upstash-signature": "valid_sig",
      },
      body: JSON.stringify({ foo: "bar" }),
    });

    expect(response.status).toBe(400);
    const body: unknown = await response.json();
    const envelope = errorEnvelopeSchema.parse(body);
    expect(envelope.error.code).toBe("invalid_request");
    expect(envelope.error.message).toContain("Missing or invalid jobId");
  });

  it("returns 400 when jobId is empty or whitespace-only", async () => {
    mockVerify.mockResolvedValueOnce(true);

    const response = await app.request("/api/webhooks/qstash/email-delivery", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "upstash-signature": "valid_sig",
      },
      body: JSON.stringify({ jobId: "   " }),
    });

    expect(response.status).toBe(400);
    const body: unknown = await response.json();
    const envelope = errorEnvelopeSchema.parse(body);
    expect(envelope.error.code).toBe("invalid_request");
  });
});

describe("POST /api/webhooks/qstash/email-delivery - Successful Delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with outcome delivered when email is delivered successfully", async () => {
    mockVerify.mockResolvedValueOnce(true);
    mockProcessEmailJob.mockResolvedValueOnce({
      outcome: "delivered",
      providerMessageId: "msg_resend_999",
    });

    const response = await app.request("/api/webhooks/qstash/email-delivery", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "upstash-signature": "valid_sig",
      },
      body: JSON.stringify({ jobId: "job_456" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      outcome: "delivered",
    });
    expect(mockProcessEmailJob).toHaveBeenCalledWith("job_456");
  });
});

describe("POST /api/webhooks/qstash/email-delivery - Skipped Delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with outcome skipped when job cannot be claimed (e.g. duplicate webhook trigger)", async () => {
    mockVerify.mockResolvedValueOnce(true);
    mockProcessEmailJob.mockResolvedValueOnce({
      outcome: "skipped",
      reason: "Job not available or maximum attempts exceeded",
    });

    const response = await app.request("/api/webhooks/qstash/email-delivery", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "upstash-signature": "valid_sig",
      },
      body: JSON.stringify({ jobId: "job_duplicate" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      outcome: "skipped",
    });
  });
});

describe("POST /api/webhooks/qstash/email-delivery - Terminal Failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with outcome failed when error is terminal (no QStash retry)", async () => {
    mockVerify.mockResolvedValueOnce(true);
    mockProcessEmailJob.mockResolvedValueOnce({
      outcome: "failed",
      error: "400 Bad Request: invalid recipient",
    });

    const response = await app.request("/api/webhooks/qstash/email-delivery", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "upstash-signature": "valid_sig",
      },
      body: JSON.stringify({ jobId: "job_456" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      success: true,
      outcome: "failed",
    });
  });
});

describe("POST /api/webhooks/qstash/email-delivery - Retryable Outcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 503 with retryable outcome so QStash retries delivery", async () => {
    mockVerify.mockResolvedValueOnce(true);
    mockProcessEmailJob.mockResolvedValueOnce({
      outcome: "retryable",
      error: "429 Too Many Requests",
    });

    const response = await app.request("/api/webhooks/qstash/email-delivery", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "upstash-signature": "valid_sig",
      },
      body: JSON.stringify({ jobId: "job_retry_789" }),
    });

    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data).toEqual({
      success: false,
      outcome: "retryable",
      error: "429 Too Many Requests",
    });
  });
});

describe("GET /api/webhooks/qstash/email-delivery - Method Not Allowed / Not Found", () => {
  it("rejects GET requests on webhook endpoint", async () => {
    const response = await app.request("/api/webhooks/qstash/email-delivery", {
      method: "GET",
    });

    expect(response.status).toBe(404);
  });
});
