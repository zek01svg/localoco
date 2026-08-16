import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";

import * as authSchema from "#server/database/auth";
import { env } from "#server/env";
import { db } from "#server/lib/db";
import { enqueueEmail, renderPasswordResetEmail, renderVerificationEmail } from "#server/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authSchema.user,
      session: authSchema.session,
      account: authSchema.account,
      verification: authSchema.verification,
    },
  }),
  telemetry: {
    enabled: false,
  },
  baseURL: env.VITE_APP_URL + "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    env.VITE_APP_URL,
    ...(env.NODE_ENV === "production"
      ? []
      : ["http://localhost:4000", "http://localhost:4001", "http://localhost:5173"]),
  ],

  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    cookiePrefix: "localoco",
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }, _request) => {
      const template = renderPasswordResetEmail({
        name: user.name,
        url,
      });
      await enqueueEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }, _request) => {
      const template = renderVerificationEmail({
        name: user.name,
        url,
      });
      await enqueueEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    },
  },
  plugins: [
    openAPI({
      path: "/docs",
    }),
  ],
});
