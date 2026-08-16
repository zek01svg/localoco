import { Client, Receiver } from "@upstash/qstash";

import { env } from "#server/env";

export interface VerifyQStashSignatureOptions {
  signature: string;
  body: string;
  url?: string;
  currentSigningKey?: string;
  nextSigningKey?: string;
}

/**
 * Verifies the cryptographic signature of an incoming QStash webhook request.
 */
export async function verifyQStashSignature(
  options: VerifyQStashSignatureOptions
): Promise<boolean> {
  const currentSigningKey = options.currentSigningKey ?? env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = options.nextSigningKey ?? env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentSigningKey || !nextSigningKey) {
    return false;
  }

  try {
    const receiver = new Receiver({
      currentSigningKey,
      nextSigningKey,
    });

    return await receiver.verify({
      signature: options.signature,
      body: options.body,
      url: options.url,
    });
  } catch {
    return false;
  }
}

export interface PublishEmailJobOptions {
  jobId: string;
  destinationUrl: string;
  token?: string;
  qstashUrl?: string;
}

/**
 * Publishes an opaque `{ jobId }` message to the QStash email delivery queue.
 */
export async function publishEmailJob(
  options: PublishEmailJobOptions
): Promise<{ messageId: string }> {
  const token = options.token ?? env.QSTASH_TOKEN;
  if (!token) {
    throw new Error("QSTASH_TOKEN is not configured");
  }

  const client = new Client({
    token,
    baseUrl: options.qstashUrl ?? env.QSTASH_URL,
  });

  const response = await client.publishJSON({
    url: options.destinationUrl,
    body: { jobId: options.jobId },
  });

  return { messageId: response.messageId };
}
