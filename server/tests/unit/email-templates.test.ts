import { describe, expect, it } from "vitest";

import {
  renderChangeEmailConfirmationEmail,
  renderPasswordResetEmail,
  renderVerificationEmail,
} from "#server/lib/email/templates";

describe("renderVerificationEmail", () => {
  it("renders email with escaped user name and url", () => {
    const rendered = renderVerificationEmail({
      name: "Alice <script>alert('xss')</script>",
      url: 'https://localoco.ciav.dev/verify?token=abc&ref="test"',
    });

    expect(rendered.subject).toBe("Verify your LocaLoco email address");
    expect(rendered.html).toContain("Alice &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain(
      "https://localoco.ciav.dev/verify?token=abc&amp;ref=&quot;test&quot;"
    );
    expect(rendered.text).toContain("Hi Alice <script>alert('xss')</script>");
    expect(rendered.text).toContain('https://localoco.ciav.dev/verify?token=abc&ref="test"');
  });

  it("uses fallback name 'there' when name is null or undefined", () => {
    const rendered = renderVerificationEmail({
      url: "https://localoco.ciav.dev/verify?token=123",
    });

    expect(rendered.html).toContain(
      "Hi there, please confirm your email address for LocaLoco by clicking the button below."
    );
    expect(rendered.text).toContain("Hi there,");
  });

  it("handles null name explicitly", () => {
    const rendered = renderVerificationEmail({
      name: null,
      url: "https://localoco.ciav.dev/verify?token=123",
    });

    expect(rendered.html).toContain(
      "Hi there, please confirm your email address for LocaLoco by clicking the button below."
    );
    expect(rendered.text).toContain("Hi there,");
  });
});

describe("renderChangeEmailConfirmationEmail", () => {
  it("renders the new email address escaped and the confirmation url escaped", () => {
    const rendered = renderChangeEmailConfirmationEmail({
      name: "Alice <script>alert('xss')</script>",
      newEmail: "new@example.com <b>oops</b>",
      url: 'https://localoco.ciav.dev/verify?token=abc&ref="test"',
    });

    expect(rendered.subject).toBe("Confirm your email address change");
    expect(rendered.html).toContain("Alice &lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
    expect(rendered.html).toContain("new@example.com &lt;b&gt;oops&lt;/b&gt;");
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain(
      "https://localoco.ciav.dev/verify?token=abc&amp;ref=&quot;test&quot;"
    );
    expect(rendered.text).toContain('https://localoco.ciav.dev/verify?token=abc&ref="test"');
  });

  it("uses fallback name 'there' when name is not provided", () => {
    const rendered = renderChangeEmailConfirmationEmail({
      newEmail: "new@example.com",
      url: "https://localoco.ciav.dev/verify?token=xyz",
    });

    expect(rendered.html).toContain("Hi there,");
    expect(rendered.text).toContain("Hi there,");
  });
});

describe("renderPasswordResetEmail", () => {
  it("renders email with escaped user name and url", () => {
    const rendered = renderPasswordResetEmail({
      name: "Bob <b>bold</b> & 'quotes'",
      url: "https://localoco.ciav.dev/reset-password?token=xyz&email=test@example.com",
    });

    expect(rendered.subject).toBe("Reset your LocaLoco password");
    expect(rendered.html).toContain("Bob &lt;b&gt;bold&lt;/b&gt; &amp; &#39;quotes&#39;");
    expect(rendered.html).not.toContain("<b>bold</b>");
    expect(rendered.html).toContain(
      "https://localoco.ciav.dev/reset-password?token=xyz&amp;email=test@example.com"
    );
    expect(rendered.text).toContain("Hi Bob <b>bold</b> & 'quotes',");
    expect(rendered.text).toContain(
      "https://localoco.ciav.dev/reset-password?token=xyz&email=test@example.com"
    );
  });

  it("uses fallback name 'there' when name is not provided", () => {
    const rendered = renderPasswordResetEmail({
      url: "https://localoco.ciav.dev/reset-password?token=xyz",
    });

    expect(rendered.html).toContain(
      "Hi there, we received a request to reset your password for LocaLoco."
    );
    expect(rendered.text).toContain("Hi there,");
  });
});
