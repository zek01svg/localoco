export type ErrorClassification = "retryable" | "terminal";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<{ id: string }>;
}

export interface EnqueueEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  maxAttempts?: number;
}

export type ProcessOutcome =
  | { outcome: "delivered"; providerMessageId: string }
  | { outcome: "skipped"; reason?: string }
  | { outcome: "retryable"; error: string }
  | { outcome: "failed"; error: string };

export interface ClassifiedError {
  isRetryable: boolean;
  classification: ErrorClassification;
  sanitizedMessage: string;
}
