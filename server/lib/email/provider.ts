import type { EmailProvider, SendEmailOptions } from "./types";

import { Resend } from "resend";

import { env } from "#server/env";

export type * from "./types";

export interface FakeEmailProvider extends EmailProvider {
  sentEmails: SendEmailOptions[];
  shouldFailWith?: Error;
  clear(): void;
}

class ResendApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ResendApiError";
    this.status = status;
  }
}

/**
 * Creates a lightweight Resend email provider preserving HTTP status codes.
 */
export function createResendProvider(apiKey?: string): EmailProvider {
  const key = apiKey ?? env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const client = new Resend(key);

  return {
    async send(options: SendEmailOptions): Promise<{ id: string }> {
      const from = options.from ?? env.EMAIL_FROM;
      const { data, error } = await client.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        const statusCode = typeof error.statusCode === "number" ? error.statusCode : 500;
        throw new ResendApiError(`Resend error: ${error.name} - ${error.message}`, statusCode);
      }

      if (!data.id) {
        throw new ResendApiError("Resend did not return a message ID", 500);
      }

      return { id: data.id };
    },
  };
}

/**
 * Creates a simple in-memory fake email provider for local development and testing.
 */
export function createFakeProvider(): FakeEmailProvider {
  const sentEmails: SendEmailOptions[] = [];
  let shouldFailWith: Error | undefined;

  return {
    sentEmails,
    get shouldFailWith() {
      return shouldFailWith;
    },
    set shouldFailWith(err: Error | undefined) {
      shouldFailWith = err;
    },
    send(options: SendEmailOptions): Promise<{ id: string }> {
      if (shouldFailWith) {
        return Promise.reject(shouldFailWith);
      }
      sentEmails.push(options);
      return Promise.resolve({ id: `fake_${crypto.randomUUID()}` });
    },
    clear(): void {
      sentEmails.length = 0;
      shouldFailWith = undefined;
    },
  };
}

let activeProvider: EmailProvider | undefined;

/**
 * Resolves the configured email provider singleton.
 */
export function getEmailProvider(): EmailProvider {
  if (activeProvider) {
    return activeProvider;
  }

  if (!env.RESEND_API_KEY && env.NODE_ENV !== "production") {
    activeProvider = createFakeProvider();
  } else {
    activeProvider = createResendProvider();
  }

  return activeProvider;
}

/**
 * Resets the active provider instance (useful for testing).
 */
export function resetEmailProvider(): void {
  activeProvider = undefined;
}
