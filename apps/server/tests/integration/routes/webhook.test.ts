import * as mailer from "@server/lib/mailer";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useIntegrationHarness } from "../../harness";

const { mockVerify } = vi.hoisted(() => ({
  mockVerify: vi.fn(),
}));

vi.mock("@upstash/qstash", () => ({
  Receiver: function Receiver() {
    this.verify = mockVerify;
  },
}));

vi.mock("@server/lib/pino", () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

describe("Webhook Routes - Integration Tests", () => {
  const harness = useIntegrationHarness();

  const emailPayload = JSON.stringify({
    to: "recipient@example.com",
    subject: "Hello",
    htmlContent: "<p>Test email</p>",
  });

  beforeEach(() => {
    vi.mocked(mailer.sendEmail).mockResolvedValue(undefined);
  });

  function postEmail(body: string, signature?: string) {
    const headers: Record<string, string> = {
      "Content-Type": "text/plain",
    };
    if (signature) {
      headers["upstash-signature"] = signature;
    }
    return harness.app.request("/api/webhooks/email", {
      method: "POST",
      headers,
      body,
    });
  }

  describe("POST /api/webhooks/email", () => {
    it("returns 401 when no signature header", async () => {
      const res = await postEmail(emailPayload);
      expect(res.status).toBe(401);
    });

    it("returns 401 when signature verification fails", async () => {
      mockVerify.mockRejectedValueOnce(new Error("invalid signature"));
      const res = await postEmail(emailPayload, "bad-sig");
      expect(res.status).toBe(401);
    });

    it("processes email and returns success when signature is valid", async () => {
      mockVerify.mockResolvedValueOnce(true);

      const res = await postEmail(emailPayload, "valid-sig");
      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - dynamic body
      expect(data.success).toBe(true);
      expect(vi.mocked(mailer.sendEmail)).toHaveBeenCalledWith(
        "recipient@example.com",
        "Hello",
        "<p>Test email</p>"
      );
    });

    it("returns 500 when email processing throws", async () => {
      mockVerify.mockResolvedValueOnce(true);
      vi.mocked(mailer.sendEmail).mockRejectedValueOnce(
        new Error("SMTP failure")
      );

      const res = await postEmail(emailPayload, "valid-sig");
      expect(res.status).toBe(500);
      const data = await res.json();
      // @ts-expect-error - dynamic body
      expect(data.error).toMatch(/Failed to process email/);
    });
  });
});
