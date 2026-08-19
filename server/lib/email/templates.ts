import { escapeHtml } from "./sanitizer";

export interface EmailTemplateParams {
  name?: string | null;
  url: string;
}

export interface ChangeEmailTemplateParams extends EmailTemplateParams {
  newEmail: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface EmailLayoutOptions {
  title: string;
  heading: string;
  bodyHtml: string;
  buttonText: string;
  buttonUrl: string;
  noteHtml: string;
}

function renderEmailLayout(options: EmailLayoutOptions): string {
  const safeTitle = escapeHtml(options.title);
  const safeButtonUrl = escapeHtml(options.buttonUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
    <tr>
      <td style="padding: 32px 32px 24px 32px; text-align: center; background-color: #0f172a;">
        <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">LocaLoco</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 16px 0; color: #1e293b;">${escapeHtml(options.heading)}</h2>
        <div style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 24px 0;">
          ${options.bodyHtml}
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${safeButtonUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 15px; font-weight: 600; border-radius: 6px;">
            ${escapeHtml(options.buttonText)}
          </a>
        </div>
        <p style="font-size: 13px; line-height: 20px; color: #64748b; margin: 24px 0 0 0;">
          Or copy and paste this URL into your browser:<br>
          <a href="${safeButtonUrl}" style="color: #2563eb; word-break: break-all;">${safeButtonUrl}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 32px 0 20px 0;">
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
          ${options.noteHtml}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Renders the verification email with escaped user-provided parameters. The
 * wording is intentionally neutral: this template serves both first-time
 * registration and the second step of an email change (verifying the new
 * address).
 */
export function renderVerificationEmail(params: EmailTemplateParams): RenderedEmail {
  const safeName = params.name ? escapeHtml(params.name) : "there";
  const subject = "Verify your LocaLoco email address";
  const text = `Hi ${params.name ?? "there"},\n\nPlease verify your email address for LocaLoco by clicking the link below:\n${params.url}\n\nIf you did not sign up for LocaLoco, you can safely ignore this email.\n\nBest regards,\nThe LocaLoco Team`;

  const html = renderEmailLayout({
    title: subject,
    heading: "Verify your email address",
    bodyHtml: `<p>Hi ${safeName}, please confirm your email address for LocaLoco by clicking the button below.</p>`,
    buttonText: "Verify Email Address",
    buttonUrl: params.url,
    noteHtml: "If you did not sign up for LocaLoco, you can safely ignore this email.",
  });

  return { subject, html, text };
}

/**
 * Renders the confirmation email for a requested email change, sent to the
 * current (old) address. The new address is escaped like any other
 * user-provided parameter.
 */
export function renderChangeEmailConfirmationEmail(
  params: ChangeEmailTemplateParams
): RenderedEmail {
  const safeName = params.name ? escapeHtml(params.name) : "there";
  const safeNewEmail = escapeHtml(params.newEmail);
  const subject = "Confirm your email address change";
  const text = `Hi ${params.name ?? "there"},\n\nYou requested to change your LocaLoco email address to:\n${params.newEmail}\n\nClick the link below to confirm:\n${params.url}\n\nIf you did not request this change, you can safely ignore this email and your address will stay the same.\n\nBest regards,\nThe LocaLoco Team`;

  const html = renderEmailLayout({
    title: subject,
    heading: "Confirm your email address change",
    bodyHtml: `<p>Hi ${safeName}, you requested to change your LocaLoco email address to <strong>${safeNewEmail}</strong>. Click the button below to confirm.</p>`,
    buttonText: "Confirm Email Change",
    buttonUrl: params.url,
    noteHtml:
      "If you did not request this change, you can safely ignore this email and your address will stay the same.",
  });

  return { subject, html, text };
}

/**
 * Renders the password reset email with escaped user-provided parameters.
 */
export function renderPasswordResetEmail(params: EmailTemplateParams): RenderedEmail {
  const safeName = params.name ? escapeHtml(params.name) : "there";
  const subject = "Reset your LocaLoco password";
  const text = `Hi ${params.name ?? "there"},\n\nWe received a request to reset your password for LocaLoco. Click the link below to set a new password:\n${params.url}\n\nIf you did not request a password reset, you can safely ignore this email.\n\nBest regards,\nThe LocaLoco Team`;

  const html = renderEmailLayout({
    title: subject,
    heading: "Reset your password",
    bodyHtml: `<p>Hi ${safeName}, we received a request to reset your password for LocaLoco.</p>`,
    buttonText: "Reset Password",
    buttonUrl: params.url,
    noteHtml:
      "If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.",
  });

  return { subject, html, text };
}
