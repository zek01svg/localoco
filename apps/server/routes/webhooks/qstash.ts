import { env } from "@server/env";
import { sendEmail } from "@server/lib/mailer";
import logger from "@server/lib/pino";
import type { EmailPayload } from "@shared/types/email.types";
import { Receiver } from "@upstash/qstash";
import { Hono } from "hono";

const receiver = new Receiver({
  currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
});

const qstashWebhook = new Hono()

  /**
   * Handle incoming email processing tasks from QStash.
   * Verifies the QStash signature before processing to ensure authenticity.
   */
  .post("/email", async (c) => {
    const signature = c.req.header("upstash-signature");
    if (!signature) {
      return c.text("Unauthorized", 401);
    }

    const body = await c.req.text();

    // Verify QStash signature
    const isValid = await receiver
      .verify({
        signature,
        body,
      })
      .catch(() => false);

    if (!isValid) {
      logger.warn("Received invalid QStash signature");
      return c.text("Invalid Signature", 401);
    }

    try {
      const payload: EmailPayload = JSON.parse(body);
      logger.info(`processing qstash email for: ${payload.to}`);

      await sendEmail(payload.to, payload.subject, payload.htmlContent);

      return c.json({ success: true });
    } catch (error: any) {
      logger.error(
        {
          error: error?.message,
        },
        "qstash email processing failed"
      );
      return c.json({ error: "Failed to process email" }, 500);
    }
  });

export default qstashWebhook;
