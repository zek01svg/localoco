import { env } from "@server/env";
import type { EmailPayload } from "@shared/types/email.types";
import { Client } from "@upstash/qstash";

import logger from "./pino";

let qstashClient: Client | undefined;

/**
 * Initializes the QStash client and verifies environment variables.
 */
export async function initQueue(): Promise<void> {
  try {
    qstashClient = new Client({
      token: env.QSTASH_TOKEN,
    });

    logger.info({
      msg: "QStash client initialized for email queue",
      time: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "failed to initialize qstash client");
    throw new Error("failed to initialize qstash client", { cause: err });
  }
}

/**
 * Publishes an email job to Upstash QStash.
 * QStash will then push this job to our webhook endpoint.
 * @param payload - The email details (recipient, subject, content).
 */
export async function enqueueEmail(payload: EmailPayload): Promise<boolean> {
  if (!qstashClient) {
    await initQueue();
  }

  // Calculate the absolute URL for the webhook destination
  const destinationUrl = `${env.APP_URL}/api/webhooks/email`;

  try {
    await qstashClient?.publishJSON({
      url: destinationUrl,
      body: payload,
      // Optional: Delay or retries can be configured here
      retries: 3,
    });

    return true;
  } catch (err) {
    logger.error({ err }, "failed to publish email to qstash");
    return false;
  }
}

/**
 * Note: consumeEmails() is removed as consumption is now handled by
 * a standard HTTP POST endpoint triggered by QStash.
 */
