import { describe, expect, it } from "vitest";

import { escapeHtml, validateEmailHeader, validateRecipient } from "#server/lib/email/sanitizer";
import { HttpError } from "#server/lib/errors";

describe("escapeHtml", () => {
  it("escapes all unsafe HTML characters", () => {
    const raw = `<script>alert("XSS & danger 'quotes'");</script>`;
    const escaped = escapeHtml(raw);

    expect(escaped).toBe(
      "&lt;script&gt;alert(&quot;XSS &amp; danger &#39;quotes&#39;&quot;);&lt;/script&gt;"
    );
    expect(escaped).not.toContain("<");
    expect(escaped).not.toContain(">");
    expect(escaped).not.toContain('"');
    expect(escaped).not.toContain("'");
  });

  it("returns plain text unchanged when no special chars exist", () => {
    expect(escapeHtml("Hello World 123")).toBe("Hello World 123");
  });

  it("handles empty string and repeated special characters", () => {
    expect(escapeHtml("")).toBe("");
    expect(escapeHtml("<<<>>>&&&\"\"\"'''")).toBe(
      "&lt;&lt;&lt;&gt;&gt;&gt;&amp;&amp;&amp;&quot;&quot;&quot;&#39;&#39;&#39;"
    );
  });
});

describe("validateEmailHeader", () => {
  it("accepts clean header values and trims them", () => {
    expect(validateEmailHeader("  Normal Subject Line  ", "subject")).toBe("Normal Subject Line");
  });

  it("throws HttpError 400 when CRLF characters are present", () => {
    expect(() => validateEmailHeader("Subject\r\nBcc: evil@attacker.com", "subject")).toThrow(
      HttpError
    );

    expect(() => validateEmailHeader("Subject\nBcc: evil@attacker.com", "subject")).toThrow(
      /CRLF injection detected/u
    );
  });

  it("detects carriage return alone (\\r) and newline alone (\\n)", () => {
    expect(() => validateEmailHeader("Subject\rInjection", "subject")).toThrow(HttpError);
    expect(() => validateEmailHeader("\nSubject", "subject")).toThrow(HttpError);
    expect(() => validateEmailHeader("Subject\n", "subject")).toThrow(HttpError);
  });
});

describe("validateRecipient", () => {
  it("accepts valid email addresses", () => {
    expect(validateRecipient("user@example.com")).toBe("user@example.com");
    expect(validateRecipient("  user.name+tag@sub.domain.co  ")).toBe(
      "user.name+tag@sub.domain.co"
    );
  });

  it("accepts valid email address up to 254 characters", () => {
    // 64 char local part + @ + domain up to 254 chars total: 64 + 1 + 184 = 249 chars
    const localPart = "a".repeat(64);
    const domainPart = "b".repeat(180) + ".com";
    const validLongEmail = `${localPart}@${domainPart}`;
    expect(validLongEmail.length).toBeLessThanOrEqual(254);
    expect(validateRecipient(validLongEmail)).toBe(validLongEmail);
  });

  it("throws HttpError 400 for recipient exceeding 254 characters", () => {
    // 64 char local part + @ + domain: 64 + 1 + 194 = 259 chars
    const localPart = "a".repeat(64);
    const domainPart = "b".repeat(190) + ".com";
    const tooLongEmail = `${localPart}@${domainPart}`;
    expect(tooLongEmail.length).toBeGreaterThan(254);
    expect(() => validateRecipient(tooLongEmail)).toThrow(HttpError);
  });

  it("throws HttpError 400 for malformed email addresses", () => {
    expect(() => validateRecipient("not-an-email")).toThrow(HttpError);
    expect(() => validateRecipient("user@")).toThrow(HttpError);
    expect(() => validateRecipient("@domain.com")).toThrow(HttpError);
    expect(() => validateRecipient("user@domain@another.com")).toThrow(HttpError);
    expect(() => validateRecipient("user space@domain.com")).toThrow(HttpError);
    expect(() => validateRecipient("")).toThrow(HttpError);
  });

  it("throws HttpError 400 for recipient containing newlines or carriage returns", () => {
    expect(() => validateRecipient("user@example.com\r\nBcc: hacker@example.com")).toThrow(
      HttpError
    );
    expect(() => validateRecipient("user@example.com\n")).toThrow(HttpError);
    expect(() => validateRecipient("\ruser@example.com")).toThrow(HttpError);
  });
});
