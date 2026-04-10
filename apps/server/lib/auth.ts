import db from "@server/database/db";
import { account, session, user, verification } from "@server/database/schema";
import { env } from "@server/env";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { enqueueEmail } from "./email-queue";
import { getResetPasswordEmailHtml, getVerificationEmailHtml } from "./mailer";
import redis from "./redis";

/**
 * Better-Auth configuration for LocaLoco.
 * Handles Drizzle adapter, custom user fields, email/password, and Google OAuth.
 */
const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  secondaryStorage: {
    get: async (key) => {
      const value = await redis.get<string>(key);
      return value ? JSON.parse(value) : null;
    },
    set: async (key, value, ttl) => {
      if (ttl) {
        await redis.set(key, JSON.stringify(value), { ex: ttl });
      } else {
        await redis.set(key, JSON.stringify(value));
      }
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  user: {
    additionalFields: {
      hasBusiness: {
        type: "boolean",
        input: false,
      },
      referralCode: {
        type: "string",
        input: false,
      },
      referredByUserID: {
        type: "string",
        input: false,
      },
      bio: {
        type: "string",
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }, _request) => {
      const subject = "Reset your LocaLoco password";
      const htmlBody = getResetPasswordEmailHtml(url, user);

      await enqueueEmail({
        to: user.email,
        subject,
        htmlContent: htmlBody,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }, _request) => {
      const subject = "Welcome to LocaLoco! Please verify your email";
      const htmlBody = getVerificationEmailHtml(url);

      await enqueueEmail({
        to: user.email,
        subject,
        htmlContent: htmlBody,
      });
    },
    sendOnSignUp: true,
  },
  trustedOrigins: ["http://localhost:3000"],
  socialProviders: {
    google: {
      prompt: "select_account consent",
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      getUserInfo: async (token) => {
        const response: any = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: {
              Authorization: `Bearer ${token.accessToken}`,
            },
          }
        );
        const profile = await response.json();
        return {
          user: {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
            emailVerified: profile.verified_email,
          },
          data: profile,
        };
      },
    },
  },
});

export default auth;
