import type { ClassifiedError, ErrorClassification } from "./types";

// Patterns for scrubbing sensitive credentials from error traces
const SENSITIVE_PATTERNS = [
  /re_[a-zA-Z0-9_]{10,}/gu,
  /Bearer\s+[a-zA-Z0-9_\-.]{10,}/giu,
  /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"]?[a-zA-Z0-9_\-.]+['"]?/giu,
];

/**
 * Sanitizes an error message by scrubbing API keys, tokens, and limiting length.
 */
export function sanitizeErrorMessage(rawMessage: string): string {
  let sanitized = rawMessage;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replaceAll(pattern, "[REDACTED]");
  }
  return sanitized.length > 1000 ? sanitized.slice(0, 997) + "..." : sanitized;
}

const RETRYABLE_KEYWORDS = [
  "timeout",
  "timed out",
  "econnreset",
  "etimedout",
  "econnrefused",
  "enotfound",
  "fetch failed",
  "network error",
  "rate limit",
  "too many requests",
  "service unavailable",
  "bad gateway",
  "gateway timeout",
];

const TERMINAL_KEYWORDS = [
  "invalid recipient",
  "invalid email",
  "domain not found",
  "syntax error",
  "unauthorized",
  "forbidden",
  "not allowed",
  "validation",
];

function extractRawErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "number" || typeof error === "boolean" || typeof error === "bigint") {
    return error.toString();
  }
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return "Unserializable error object";
    }
  }
  return "Unknown error";
}

function resolveClassification(
  status: number | undefined,
  lowerMessage: string
): ErrorClassification {
  if (status !== undefined) {
    if (status === 429 || status >= 500) return "retryable";
    if (status >= 400 && status < 500) return "terminal";
  }

  if (TERMINAL_KEYWORDS.some(k => lowerMessage.includes(k))) return "terminal";
  if (RETRYABLE_KEYWORDS.some(k => lowerMessage.includes(k))) return "retryable";

  return "terminal";
}

/**
 * Classifies an email provider error into either a retryable or terminal failure,
 * sanitizing any sensitive credentials from the error message.
 */
export function classifyEmailError(status: number | undefined, error: unknown): ClassifiedError {
  const rawMessage = extractRawErrorMessage(error);
  const sanitizedMessage = sanitizeErrorMessage(rawMessage);
  const classification = resolveClassification(status, sanitizedMessage.toLowerCase());

  return {
    isRetryable: classification === "retryable",
    classification,
    sanitizedMessage,
  };
}
