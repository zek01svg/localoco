import type { EmailDelivery } from "#server/database/email";
import type { FakeEmailProvider } from "#server/lib/email";
import type { Mock } from "vitest";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  claimEmailJob,
  createFakeProvider,
  enqueueEmail,
  processEmailJob,
} from "#server/lib/email";

import {
  executeMockGeneralUpdate,
  executeMockProcessingUpdate,
  mockDbRows,
  seedJob,
} from "./email-test-helper";

vi.mock("#server/lib/db", () => ({
  db: {
    insert: vi.fn<(_table: unknown) => unknown>().mockImplementation(() => ({
      values: vi
        .fn<(_data: Record<string, unknown>) => Promise<EmailDelivery[]>>()
        .mockImplementation((data: Record<string, unknown>) => {
          const row: EmailDelivery = {
            id: typeof data.id === "string" ? data.id : crypto.randomUUID(),
            recipient: typeof data.recipient === "string" ? data.recipient : "",
            subject: typeof data.subject === "string" ? data.subject : "",
            htmlBody: typeof data.htmlBody === "string" ? data.htmlBody : "",
            textBody: typeof data.textBody === "string" ? data.textBody : null,
            fromAddress: typeof data.fromAddress === "string" ? data.fromAddress : "",
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
          };
          mockDbRows.set(row.id, row);
          return Promise.resolve([row]);
        }),
    })),
    update: vi.fn<(_table: unknown) => unknown>().mockImplementation(() => ({
      set: vi
        .fn<(_setData: Record<string, unknown>) => unknown>()
        .mockImplementation((setData: Record<string, unknown>) => ({
          where: vi.fn<(_clause?: unknown) => unknown>().mockImplementation(() => {
            const res =
              setData.status === "processing"
                ? executeMockProcessingUpdate()
                : executeMockGeneralUpdate(setData);
            const p = Promise.resolve(res);
            return Object.assign(p, {
              returning: () => Promise.resolve(res),
            });
          }),
        })),
    })),
  },
}));

let fakeProvider: FakeEmailProvider;
let publishJobMock: Mock<(_jobId: string) => Promise<{ messageId: string }>>;

describe("enqueueEmail - valid jobs", () => {
  beforeEach(() => {
    mockDbRows.clear();
    fakeProvider = createFakeProvider();
    publishJobMock = vi
      .fn<(_jobId: string) => Promise<{ messageId: string }>>()
      .mockResolvedValue({ messageId: "msg_123" });
  });

  it("persists email to database and enqueues job with only jobId payload", async () => {
    const result = await enqueueEmail(
      {
        to: "user@example.com",
        subject: "Welcome to LocaLoco",
        html: "<p>Welcome!</p>",
        text: "Welcome!",
        from: "LocaLoco <noreply@localoco.ciav.dev>",
      },
      {
        publishJob: publishJobMock,
      }
    );

    expect(result.jobId).toBeDefined();
    expect(publishJobMock).toHaveBeenCalledWith(result.jobId);
    expect(mockDbRows.has(result.jobId)).toBe(true);

    const saved = mockDbRows.get(result.jobId);
    expect(saved?.recipient).toBe("user@example.com");
    expect(saved?.subject).toBe("Welcome to LocaLoco");
    expect(saved?.status).toBe("pending");
    expect(saved?.attemptCount).toBe(0);
    expect(saved?.maxAttempts).toBe(3);
  });
});

describe("enqueueEmail - validation", () => {
  beforeEach(() => {
    mockDbRows.clear();
    fakeProvider = createFakeProvider();
    publishJobMock = vi
      .fn<(_jobId: string) => Promise<{ messageId: string }>>()
      .mockResolvedValue({ messageId: "msg_123" });
  });

  it("rejects invalid recipients before db insertion or queue publishing", async () => {
    await expect(
      enqueueEmail(
        {
          to: "invalid-email-address",
          subject: "Hello",
          html: "<p>Hello</p>",
        },
        {
          publishJob: publishJobMock,
        }
      )
    ).rejects.toThrow("Invalid email address format");

    expect(publishJobMock).not.toHaveBeenCalled();
    expect(mockDbRows.size).toBe(0);
  });

  it("rejects header CRLF injection in subject or from fields", async () => {
    await expect(
      enqueueEmail(
        {
          to: "user@example.com",
          subject: "Subject\r\nBcc: attacker@example.com",
          html: "<p>Hello</p>",
        },
        {
          publishJob: publishJobMock,
        }
      )
    ).rejects.toThrow('CRLF injection detected in header "subject"');

    expect(publishJobMock).not.toHaveBeenCalled();
    expect(mockDbRows.size).toBe(0);
  });
});

describe("claimEmailJob", () => {
  beforeEach(() => {
    mockDbRows.clear();
  });

  it("atomically claims a pending job, increments attempt count, and sets status to processing", async () => {
    seedJob("job_pending_1");
    const claimed = await claimEmailJob("job_pending_1");
    expect(claimed).not.toBeNull();
    expect(claimed?.status).toBe("processing");
    expect(claimed?.attemptCount).toBe(1);
  });

  it("returns null if job is already processing or exceeded max attempts", async () => {
    seedJob("job_maxed_1", { status: "processing", attemptCount: 3, maxAttempts: 3 });
    const claimed = await claimEmailJob("job_maxed_1");
    expect(claimed).toBeNull();
  });

  it("recovers stale in-flight processing jobs when lease has expired (>5 minutes)", async () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000);
    seedJob("job_stale_1", {
      status: "processing",
      attemptCount: 1,
      maxAttempts: 3,
      updatedAt: sixMinutesAgo,
    });

    const claimed = await claimEmailJob("job_stale_1");
    expect(claimed).not.toBeNull();
    expect(claimed?.status).toBe("processing");
    expect(claimed?.attemptCount).toBe(2);
  });

  it("handles concurrent claims by allowing only one winner", async () => {
    seedJob("job_concurrent_1");
    const firstClaim = await claimEmailJob("job_concurrent_1");
    const secondClaim = await claimEmailJob("job_concurrent_1");

    expect(firstClaim).not.toBeNull();
    expect(firstClaim?.attemptCount).toBe(1);
    expect(secondClaim).toBeNull();
  });
});

describe("processEmailJob - successful delivery", () => {
  beforeEach(() => {
    mockDbRows.clear();
    fakeProvider = createFakeProvider();
  });

  it("successfully delivers email, updates delivery state, and returns delivered outcome", async () => {
    seedJob("job_success_1");
    const outcome = await processEmailJob("job_success_1", { provider: fakeProvider });

    expect(outcome.outcome).toBe("delivered");
    expect(outcome).toHaveProperty("providerMessageId");

    expect(fakeProvider.sentEmails).toHaveLength(1);
    expect(fakeProvider.sentEmails[0]?.to).toBe("user@example.com");

    const row = mockDbRows.get("job_success_1");
    expect(row?.status).toBe("delivered");
    expect(row?.deliveredAt).toBeDefined();
  });

  it("skips already delivered email on duplicate trigger", async () => {
    seedJob("job_dup_1");
    const firstOutcome = await processEmailJob("job_dup_1", { provider: fakeProvider });
    expect(firstOutcome.outcome).toBe("delivered");

    const secondOutcome = await processEmailJob("job_dup_1", { provider: fakeProvider });
    expect(secondOutcome.outcome).toBe("skipped");
  });
});

describe("processEmailJob - retry handling and boundaries", () => {
  beforeEach(() => {
    mockDbRows.clear();
    fakeProvider = createFakeProvider();
  });

  it("handles retryable errors by updating status to retryable when attempts remain", async () => {
    seedJob("job_retryable_1");
    fakeProvider.shouldFailWith = new Error("Rate limit exceeded 429");

    const outcome = await processEmailJob("job_retryable_1", { provider: fakeProvider });

    expect(outcome.outcome).toBe("retryable");
    expect(outcome).toHaveProperty("error");
    const row = mockDbRows.get("job_retryable_1");
    expect(row?.status).toBe("retryable");
    expect(row?.lastError).toContain("Rate limit");
  });

  it("exhausts retries and transitions to failed state when max attempts are reached", async () => {
    seedJob("job_exhaust_1", { attemptCount: 2, maxAttempts: 3, status: "retryable" });
    fakeProvider.shouldFailWith = new Error("503 Service Unavailable");

    const outcome = await processEmailJob("job_exhaust_1", { provider: fakeProvider });

    expect(outcome.outcome).toBe("failed");
    expect(outcome).toHaveProperty("error");
    const row = mockDbRows.get("job_exhaust_1");
    expect(row?.status).toBe("failed");
    expect(row?.attemptCount).toBe(3);
    expect(row?.failedAt).toBeDefined();
    expect(row?.errorClassification).toBe("terminal");
  });
});

describe("processEmailJob - terminal and structured errors", () => {
  beforeEach(() => {
    mockDbRows.clear();
    fakeProvider = createFakeProvider();
  });

  it("marks status as failed when error is terminal or max attempts are reached", async () => {
    seedJob("job_terminal_1", { recipient: "invalid@example.com" });
    fakeProvider.shouldFailWith = new Error("400 Bad Request: invalid recipient");

    const outcome = await processEmailJob("job_terminal_1", { provider: fakeProvider });

    expect(outcome.outcome).toBe("failed");
    expect(outcome).toHaveProperty("error");
    const row = mockDbRows.get("job_terminal_1");
    expect(row?.status).toBe("failed");
    expect(row?.failedAt).toBeDefined();
  });

  it("handles structured error objects with status code", async () => {
    seedJob("job_structured_1");
    const structuredErr = Object.assign(new Error("Unprocessable Entity"), { status: 422 });
    fakeProvider.shouldFailWith = structuredErr;

    const outcome = await processEmailJob("job_structured_1", { provider: fakeProvider });

    expect(outcome.outcome).toBe("failed");
    const row = mockDbRows.get("job_structured_1");
    expect(row?.status).toBe("failed");
  });

  it("returns skipped outcome if job cannot be claimed", async () => {
    const outcome = await processEmailJob("non_existent_job", { provider: fakeProvider });
    expect(outcome.outcome).toBe("skipped");
  });
});
