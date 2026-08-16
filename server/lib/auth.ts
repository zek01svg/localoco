import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";

import { env } from "#server/env";
import { db } from "#server/lib/db";
import { enqueueEmail, renderPasswordResetEmail, renderVerificationEmail } from "#server/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  telemetry: {
    enabled: false,
  },
  baseURL: env.VITE_APP_URL + "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
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
