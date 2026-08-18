import { and, eq, lt } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod/v4";

import { mediaObject } from "#server/database/media";
import { db } from "#server/lib/db";
import { processEmailJob, verifyQStashSignature } from "#server/lib/email";
import { HttpError } from "#server/lib/errors";
import { deleteObject } from "#server/lib/media-storage";

const webhookPayloadSchema = z.object({
  jobId: z
    .string({ error: "Missing or invalid jobId in payload" })
    .trim()
    .min(1, "Missing or invalid jobId in payload"),
});

const sweepPayloadSchema = z.object({
  job: z.literal("media-sweep"),
});

// Pending uploads older than this are abandoned: their presigned grant has
// long expired and the client never completed them.
const PENDING_SWEEP_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const SWEEP_BATCH_SIZE = 500;

// QStash-signed webhooks share one verification path: the signature must be
// valid and the body must be JSON. Each endpoint then validates its own
// payload shape.
async function verifyQStashRequest(
  signature: string | undefined,
  rawBody: string,
  url: string
): Promise<unknown> {
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

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new HttpError(400, "invalid_request", "Malformed JSON payload");
  }
}

const parsePayload = <T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> => {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(
      400,
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Invalid payload"
    );
  }
  return parsed.data;
};

export const webhooksRoutes = new Hono()
  .post(
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
      const rawJson = await verifyQStashRequest(signature, rawBody, c.req.url);
      const payload = parsePayload(webhookPayloadSchema, rawJson);

      const result = await processEmailJob(payload.jobId);

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
  )
  .post(
    "/webhooks/qstash/media-sweep",
    describeRoute({
      description:
        "QStash scheduled webhook that purges abandoned pending photo uploads and their storage objects",
      responses: {
        200: {
          description: "Sweep completed",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  deleted: { type: "number", example: 3 },
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
          description: "A storage delete failed; QStash retries the sweep",
        },
      },
    }),
    async c => {
      const signature = c.req.header("upstash-signature");
      const rawBody = await c.req.text();
      const rawJson = await verifyQStashRequest(signature, rawBody, c.req.url);
      parsePayload(sweepPayloadSchema, rawJson);

      const cutoff = new Date(Date.now() - PENDING_SWEEP_THRESHOLD_MS);
      const stale = await db
        .select({ id: mediaObject.id, key: mediaObject.key })
        .from(mediaObject)
        .where(and(eq(mediaObject.status, "pending"), lt(mediaObject.createdAt, cutoff)))
        .limit(SWEEP_BATCH_SIZE);

      let deleted = 0;
      for (const row of stale) {
        try {
          await deleteObject(row.key);
        } catch (cause) {
          // The object survives; the row survives with it, so the next sweep
          // retries this row. Failures are partial and idempotent.
          throw new HttpError(503, "dependency_unavailable", "Media sweep failed", undefined, {
            cause,
          });
        }
        await db.delete(mediaObject).where(eq(mediaObject.id, row.id));
        deleted += 1;
      }

      return c.json({ deleted }, 200);
    }
  );
