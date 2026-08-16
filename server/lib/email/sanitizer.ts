import { z } from "zod/v4";

import { HttpError } from "#server/lib/errors";

const htmlEscapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes unsafe HTML characters to prevent XSS in email bodies.
 */
export function escapeHtml(str: string): string {
  if (typeof Bun !== "undefined") {
    return Bun.escapeHTML(str);
  }
  return str.replaceAll(/[&<>"']/gu, char => htmlEscapeMap[char] ?? char);
}

/**
 * Validates that an email header value does not contain CRLF characters,
 * preventing email header injection attacks.
 */
export function validateEmailHeader(value: string, headerName: string): string {
  if (/[\r\n]/u.test(value)) {
    throw new HttpError(
      400,
      "invalid_request",
      `CRLF injection detected in header "${headerName}"`
    );
  }
  return value.trim();
}

const recipientSchema = z
  .email("Invalid email address format")
  .min(1, "Recipient email is required")
  .max(254, "Recipient email exceeds maximum allowed length of 254 characters");

/**
 * Validates recipient email syntax and rejects any headers containing CRLF or invalid structure.
 */
export function validateRecipient(email: string): string {
  const trimmed = validateEmailHeader(email, "to");
  const parsed = recipientSchema.safeParse(trimmed);
  if (!parsed.success) {
    throw new HttpError(
      400,
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Invalid recipient email address"
    );
  }
  return parsed.data;
}
