import { describe, expect, it, vi } from "vitest";

import { env } from "#server/env";
import { publishEmailJob, verifyQStashSignature } from "#server/lib/email/qstash";

const { mockVerify, mockPublishJSON } = vi.hoisted(() => ({
  mockVerify: vi.fn<() => Promise<boolean>>(),
  mockPublishJSON: vi.fn<() => Promise<{ messageId: string }>>(),
}));

vi.mock("@upstash/qstash", () => {
  function MockReceiver() {
    return { verify: mockVerify };
  }
  function MockClient() {
    return { publishJSON: mockPublishJSON };
  }
  return {
    Receiver: MockReceiver,
    Client: MockClient,
  };
});

describe("verifyQStashSignature - missing keys", () => {
  it("returns false when signing keys are missing in options and environment", async () => {
    const originalCurrent = env.QSTASH_CURRENT_SIGNING_KEY;
    const originalNext = env.QSTASH_NEXT_SIGNING_KEY;
    try {
      (env as Record<string, unknown>).QSTASH_CURRENT_SIGNING_KEY = undefined;
      (env as Record<string, unknown>).QSTASH_NEXT_SIGNING_KEY = undefined;

      const result = await verifyQStashSignature({
        signature: "sig_abc",
        body: '{"jobId":"123"}',
      });
      expect(result).toBe(false);
    } finally {
      (env as Record<string, unknown>).QSTASH_CURRENT_SIGNING_KEY = originalCurrent;
      (env as Record<string, unknown>).QSTASH_NEXT_SIGNING_KEY = originalNext;
    }
  });
});

describe("verifyQStashSignature - verification outcomes", () => {
  it("verifies successfully using configured keys", async () => {
    mockVerify.mockResolvedValueOnce(true);

    const result = await verifyQStashSignature({
      signature: "sig_valid",
      body: '{"jobId":"job_1"}',
      url: "https://localoco.ciav.dev/api/webhooks/qstash/email-delivery",
      currentSigningKey: "key_current",
      nextSigningKey: "key_next",
    });

    expect(result).toBe(true);
    expect(mockVerify).toHaveBeenCalledWith({
      signature: "sig_valid",
      body: '{"jobId":"job_1"}',
      url: "https://localoco.ciav.dev/api/webhooks/qstash/email-delivery",
    });
  });

  it("returns false when receiver.verify throws (e.g. clock drift, invalid signature format)", async () => {
    mockVerify.mockRejectedValueOnce(new Error("Signature verification failed: clock drift"));

    const result = await verifyQStashSignature({
      signature: "sig_expired",
      body: '{"jobId":"job_2"}',
      currentSigningKey: "key_current",
      nextSigningKey: "key_next",
    });

    expect(result).toBe(false);
  });
});

describe("publishEmailJob", () => {
  it("throws an error when QSTASH_TOKEN is not configured", async () => {
    const originalToken = env.QSTASH_TOKEN;
    try {
      (env as Record<string, unknown>).QSTASH_TOKEN = undefined;

      await expect(
        publishEmailJob({
          jobId: "job_999",
          destinationUrl: "https://localoco.ciav.dev/webhook",
        })
      ).rejects.toThrow("QSTASH_TOKEN is not configured");
    } finally {
      (env as Record<string, unknown>).QSTASH_TOKEN = originalToken;
    }
  });

  it("publishes opaque jobId payload to destination URL", async () => {
    mockPublishJSON.mockResolvedValueOnce({ messageId: "msg_qstash_789" });

    const result = await publishEmailJob({
      jobId: "job_999",
      destinationUrl: "https://localoco.ciav.dev/api/webhooks/qstash/email-delivery",
      token: "custom_token",
      qstashUrl: "https://qstash.custom.upstash.io",
    });

    expect(result).toEqual({ messageId: "msg_qstash_789" });
    expect(mockPublishJSON).toHaveBeenCalledWith({
      url: "https://localoco.ciav.dev/api/webhooks/qstash/email-delivery",
      body: { jobId: "job_999" },
    });
  });
});
