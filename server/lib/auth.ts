import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";

import { env } from "#server/env";
import { db } from "#server/lib/db";
import { mailer } from "#server/lib/mailer";

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
      await mailer.sendMail({
        to: user.email,
        subject: "Reset your password",
        text: `Click the link to reset your password: ${url}`,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }, _request) => {
      await mailer.sendMail({
        to: user.email,
        subject: "Verify your email",
        text: `Click the link to verify your email: ${url}`,
      });
    },
  },
  plugins: [
    openAPI({
      path: "/docs",
    }),
  ],
});
