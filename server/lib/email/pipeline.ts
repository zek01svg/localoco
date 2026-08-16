import type { EmailDelivery } from "#server/database/email";
import type { ClassifiedError, EmailProvider, EnqueueEmailOptions, ProcessOutcome } from "./types";

import { and, eq, inArray, lt, or, sql } from "drizzle-orm";

import { emailDelivery } from "#server/database/email";
import { env } from "#server/env";
import { db } from "#server/lib/db";
import { getAppLogger } from "#shared/logger";

import { classifyEmailError } from "./classifier";
import { getEmailProvider } from "./provider";
import { publishEmailJob } from "./qstash";
import { validateEmailHeader, validateRecipient } from "./sanitizer";

const logger = getAppLogger("server", "email");

// In-flight jobs stuck in 'processing' longer than 5 minutes can be safely reclaimed
const STALE_LEASE_MS = 5 * 60 * 1000;

export interface PipelineDeps {
  db?: typeof db;
  provider?: EmailProvider;
  publishJob?: (jobId: string) => Promise<{ messageId: string }>;
}

async function dispatchEnqueuedJob(jobId: string, deps?: PipelineDeps): Promise<void> {
  if (deps?.publishJob) {
    await deps.publishJob(jobId);
    return;
  }

  if (env.QSTASH_TOKEN) {
    const destinationUrl = `${env.VITE_APP_URL}/api/webhooks/qstash/email-delivery`;
    try {
      await publishEmailJob({ jobId, destinationUrl });
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), {
        jobId,
        destinationUrl,
        message: "Failed to publish job to QStash",
      });
    }
    return;
  }

  if (env.NODE_ENV === "development") {
    setImmediate(() => {
      processEmailJob(jobId, deps).catch(err => {
        logger.error(err instanceof Error ? err : new Error(String(err)), {
          jobId,
          message: "Background processing failed for local development delivery",
        });
      });
    });
  }
}

/**
 * Persists an email delivery record with status 'pending' and enqueues an opaque
 * `{ jobId }` message to Upstash QStash.
 */
export async function enqueueEmail(
  options: EnqueueEmailOptions,
  deps?: PipelineDeps
): Promise<{ jobId: string }> {
  const recipient = validateRecipient(options.to);
  const subject = validateEmailHeader(options.subject, "subject");
  const fromAddress = options.from ? validateEmailHeader(options.from, "from") : env.EMAIL_FROM;

  const jobId = crypto.randomUUID();
  const maxAttempts = options.maxAttempts ?? 3;
  const database = deps?.db ?? db;

  await database.insert(emailDelivery).values({
    id: jobId,
    recipient,
    subject,
    htmlBody: options.html,
    textBody: options.text ?? null,
    fromAddress,
    status: "pending",
    attemptCount: 0,
    maxAttempts,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  logger.info("email.enqueued", { jobId, recipient, subject });

  await dispatchEnqueuedJob(jobId, deps);

  return { jobId };
}

/**
 * Atomically claims a pending, retryable, or expired in-flight email delivery job,
 * advancing its status to 'processing' and incrementing the attempt count.
 */
export async function claimEmailJob(
  jobId: string,
  deps?: PipelineDeps
): Promise<EmailDelivery | null> {
  const database = deps?.db ?? db;
  const staleThreshold = new Date(Date.now() - STALE_LEASE_MS);

  const rows = await database
    .update(emailDelivery)
    .set({
      status: "processing",
      attemptCount: sql`${emailDelivery.attemptCount} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(emailDelivery.id, jobId),
        or(
          inArray(emailDelivery.status, ["pending", "retryable"]),
          and(eq(emailDelivery.status, "processing"), lt(emailDelivery.updatedAt, staleThreshold))
        ),
        lt(emailDelivery.attemptCount, emailDelivery.maxAttempts)
      )
    )
    .returning();

  return rows[0] ?? null;
}

async function recordDeliveredOutcome(
  database: typeof db,
  jobId: string,
  recipient: string,
  providerMessageId: string
): Promise<ProcessOutcome> {
  const now = new Date();
  await database
    .update(emailDelivery)
    .set({
      status: "delivered",
      providerMessageId,
      deliveredAt: now,
      lastError: null,
      errorClassification: null,
      updatedAt: now,
    })
    .where(eq(emailDelivery.id, jobId));

  logger.info("email.delivered", {
    jobId,
    providerMessageId,
    recipient,
  });

  return {
    outcome: "delivered",
    providerMessageId,
  };
}

async function recordJobOutcome(
  database: typeof db,
  job: EmailDelivery,
  classified: ClassifiedError,
  error: unknown
): Promise<ProcessOutcome> {
  const isRetry = classified.isRetryable && job.attemptCount < job.maxAttempts;
  const status = isRetry ? "retryable" : "failed";
  const errorClassification = isRetry ? classified.classification : "terminal";
  const now = new Date();

  await database
    .update(emailDelivery)
    .set({
      status,
      lastError: classified.sanitizedMessage,
      errorClassification,
      failedAt: isRetry ? null : now,
      updatedAt: now,
    })
    .where(eq(emailDelivery.id, job.id));

  if (isRetry) {
    logger.warning("email.retryable", {
      jobId: job.id,
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      error: classified.sanitizedMessage,
    });
    return { outcome: "retryable", error: classified.sanitizedMessage };
  }

  logger.error(error instanceof Error ? error : new Error(classified.sanitizedMessage), {
    jobId: job.id,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    error: classified.sanitizedMessage,
  });

  return { outcome: "failed", error: classified.sanitizedMessage };
}

/**
 * Processes an enqueued email delivery job through the configured provider,
 * transitioning the database record to 'delivered', 'retryable', or 'failed'.
 */
export async function processEmailJob(jobId: string, deps?: PipelineDeps): Promise<ProcessOutcome> {
  const database = deps?.db ?? db;
  const job = await claimEmailJob(jobId, deps);

  if (!job) {
    logger.warning("email.skipped", {
      jobId,
      reason: "Job not available or maximum attempts exceeded",
    });
    return {
      outcome: "skipped",
      reason: "Job not available or maximum attempts exceeded",
    };
  }

  const provider = deps?.provider ?? getEmailProvider();

  try {
    const result = await provider.send({
      to: job.recipient,
      subject: job.subject,
      html: job.htmlBody,
      text: job.textBody ?? undefined,
      from: job.fromAddress,
    });

    return await recordDeliveredOutcome(database, jobId, job.recipient, result.id);
  } catch (error) {
    let status: number | undefined;
    if (error && typeof error === "object") {
      if ("status" in error && typeof error.status === "number") {
        status = error.status;
      } else if ("statusCode" in error && typeof error.statusCode === "number") {
        status = error.statusCode;
      }
    }

    const classified = classifyEmailError(status, error);
    return recordJobOutcome(database, job, classified, error);
  }
}
