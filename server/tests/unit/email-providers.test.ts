import { beforeEach, describe, expect, it, vi } from "vitest";

import { env } from "#server/env";
import {
  createFakeProvider,
  createResendProvider,
  getEmailProvider,
  resetEmailProvider,
} from "#server/lib/email";

const { mockResendSend } = vi.hoisted(() => ({
  mockResendSend: vi.fn<
    () => Promise<{
      data?: { id?: string };
      error?: { name: string; message: string; statusCode?: number };
    }>
  >(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: mockResendSend,
    };
  },
}));

describe("createResendProvider - configuration and sending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if RESEND_API_KEY is not configured", () => {
    const origKey = env.RESEND_API_KEY;
    try {
      (env as Record<string, unknown>).RESEND_API_KEY = undefined;
      expect(() => createResendProvider()).toThrow("RESEND_API_KEY is not configured");
    } finally {
      (env as Record<string, unknown>).RESEND_API_KEY = origKey;
    }
  });

  it("sends email successfully and returns message ID", async () => {
    mockResendSend.mockResolvedValueOnce({
      data: { id: "resend_msg_123" },
      error: undefined,
    });

    const provider = createResendProvider("mock-resend-api-key");
    const result = await provider.send({
      to: "user@example.com",
      subject: "Hello",
      html: "<p>Hello</p>",
      text: "Hello",
      from: "LocaLoco <noreply@localoco.ciav.dev>",
    });

    expect(result).toEqual({ id: "resend_msg_123" });
    expect(mockResendSend).toHaveBeenCalledWith({
      from: "LocaLoco <noreply@localoco.ciav.dev>",
      to: "user@example.com",
      subject: "Hello",
      html: "<p>Hello</p>",
      text: "Hello",
    });
  });
});

describe("createResendProvider - error handling and status code preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws ResendApiError with status code when Resend API returns error object", async () => {
    mockResendSend.mockResolvedValueOnce({
      data: undefined,
      error: { name: "rate_limit_exceeded", message: "Too many requests", statusCode: 429 },
    });

    const provider = createResendProvider("mock-resend-api-key");
    await expect(
      provider.send({
        to: "bad@example.com",
        subject: "Hello",
        html: "<p>Hello</p>",
      })
    ).rejects.toMatchObject({
      name: "ResendApiError",
      status: 429,
      message: "Resend error: rate_limit_exceeded - Too many requests",
    });
  });

  it("throws error when Resend does not return a message ID", async () => {
    mockResendSend.mockResolvedValueOnce({
      data: {},
      error: undefined,
    });

    const provider = createResendProvider("mock-resend-api-key");
    await expect(
      provider.send({
        to: "user@example.com",
        subject: "Hello",
        html: "<p>Hello</p>",
      })
    ).rejects.toThrow("Resend did not return a message ID");
  });
});

describe("createFakeProvider", () => {
  it("collects sent emails in memory and supports clearing", async () => {
    const fake = createFakeProvider();
    expect(fake.sentEmails).toHaveLength(0);

    const res = await fake.send({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });

    expect(res.id.startsWith("fake_")).toBe(true);
    expect(fake.sentEmails).toHaveLength(1);
    expect(fake.sentEmails[0]?.to).toBe("test@example.com");

    fake.clear();
    expect(fake.sentEmails).toHaveLength(0);
  });
});

describe("getEmailProvider and resetEmailProvider", () => {
  beforeEach(() => {
    resetEmailProvider();
  });

  it("returns fake provider in non-production when RESEND_API_KEY is not set", () => {
    const origKey = env.RESEND_API_KEY;
    try {
      (env as Record<string, unknown>).RESEND_API_KEY = undefined;
      const provider = getEmailProvider();
      expect(provider).toBeDefined();
      expect(typeof provider.send).toBe("function");
    } finally {
      (env as Record<string, unknown>).RESEND_API_KEY = origKey;
    }
  });
});
