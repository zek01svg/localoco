import type { EmailDelivery } from "#server/database/email";

export const mockDbRows = new Map<string, EmailDelivery>();

export function seedJob(jobId: string, overrides?: Partial<EmailDelivery>): EmailDelivery {
  const job: EmailDelivery = {
    id: jobId,
    recipient: "user@example.com",
    subject: "Verification",
    htmlBody: "<p>Verify</p>",
    textBody: "Verify",
    fromAddress: "noreply@localoco.ciav.dev",
    status: "pending",
    attemptCount: 0,
    maxAttempts: 3,
    providerMessageId: null,
    lastError: null,
    errorClassification: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deliveredAt: null,
    failedAt: null,
    ...overrides,
  };
  mockDbRows.set(jobId, job);
  return job;
}

export function executeMockProcessingUpdate(): EmailDelivery[] {
  for (const [id, row] of mockDbRows.entries()) {
    const isPendingOrRetryable =
      (row.status === "pending" || row.status === "retryable") &&
      row.attemptCount < row.maxAttempts;
    const isStaleProcessing =
      row.status === "processing" &&
      row.attemptCount < row.maxAttempts &&
      Date.now() - row.updatedAt.getTime() > 5 * 60 * 1000;

    if (isPendingOrRetryable || isStaleProcessing) {
      const updated: EmailDelivery = {
        ...row,
        status: "processing",
        attemptCount: row.attemptCount + 1,
        updatedAt: new Date(),
      };
      mockDbRows.set(id, updated);
      return [updated];
    }
  }
  return [];
}

export function executeMockGeneralUpdate(setData: Partial<EmailDelivery>): EmailDelivery[] {
  for (const [id, row] of mockDbRows.entries()) {
    const updated: EmailDelivery = {
      ...row,
      ...setData,
      updatedAt: new Date(),
    };
    mockDbRows.set(id, updated);
    return [updated];
  }
  return [];
}
