import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod/v4";

import { processEmailJob, verifyQStashSignature } from "#server/lib/email";
import { HttpError } from "#server/lib/errors";

const webhookPayloadSchema = z.object({
  jobId: z
    .string({ error: "Missing or invalid jobId in payload" })
    .trim()
    .min(1, "Missing or invalid jobId in payload"),
});

async function extractAndVerifyJobId(
  signature: string | undefined,
  rawBody: string,
  url: string
): Promise<string> {
  if (!signature) {
    throw new HttpError(401, "unauthorized", "Invalid QStash signature");
  }

  const isValid = await verifyQStashSignature({
    signature,
    body: rawBody,
    url,
  });

  if (!isValid) {
    throw new HttpError(401, "unauthorized", "Invalid QStash signature");
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(rawBody);
  } catch {
    throw new HttpError(400, "invalid_request", "Malformed JSON payload");
  }

  const parsed = webhookPayloadSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw new HttpError(
      400,
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Invalid payload"
    );
  }

  return parsed.data.jobId;
}

export const webhooksRoutes = new Hono().post(
  "/webhooks/qstash/email-delivery",
  describeRoute({
    description: "QStash webhook endpoint for processing queued transactional emails",
    responses: {
      200: {
        description: "Email job completed or failed terminally without further retries",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                outcome: { type: "string", example: "delivered" },
              },
            },
          },
        },
      },
      400: {
        description: "Invalid or malformed payload",
      },
      401: {
        description: "Missing or invalid QStash cryptographic signature",
      },
      503: {
        description: "Transient error encountered, requests QStash retry",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: false },
                outcome: { type: "string", example: "retryable" },
                error: { type: "string" },
              },
            },
          },
        },
      },
    },
  }),
  async c => {
    const signature = c.req.header("upstash-signature");
    const rawBody = await c.req.text();
    const jobId = await extractAndVerifyJobId(signature, rawBody, c.req.url);

    const result = await processEmailJob(jobId);

    if (result.outcome === "retryable") {
      return c.json(
        {
          success: false,
          outcome: result.outcome,
          error: result.error,
        },
        503
      );
    }

    return c.json(
      {
        success: true,
        outcome: result.outcome,
      },
      200
    );
  }
);
