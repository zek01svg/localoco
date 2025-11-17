import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "../database/db";
import { user, session, account, verification } from "../database/schema";
import { sendEmail, getResetPasswordEmailHtml, getVerificationEmailHtml } from "./mailer";
import { env } from "env";

const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "mysql", 
        schema: { user, session, account, verification }
    }),
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    user: {
        additionalFields: {
            hasBusiness: {
                type: "boolean",
                input: false
            },
            referralCode: {
                type: 'string',
                input: false
            },
            referredByUserID: {
                type:'string',
                input:false
            },
            bio: {
                type: 'string',
                input: false
            }
        }
    },
    emailAndPassword: { 
        enabled: true, 
        autoSignIn: true,
        sendResetPassword: async ({ user, url }, _request) => {

            const subject = 'Reset your LocaLoco password';            
            const htmlBody = getResetPasswordEmailHtml(url, user);

            await sendEmail(
                user.email,
                subject,
                htmlBody
            )
        }
    }, 
    emailVerification: {
        sendVerificationEmail: async ({ user, url, token }, _request) => {
            
            const subject = 'Welcome to LocaLoco! Please verify your email';
            const htmlBody = getVerificationEmailHtml(url);

            await sendEmail(
                user.email,
                subject,
                htmlBody
            )
        },
        sendOnSignUp: true,
        
    },
    trustedOrigins: [
        "http://localhost:3000", // for testing
        "http://localhost:5173", // for dev
    ],
    socialProviders: {
        google: {
            prompt: 'select_account consent',
            clientId: env.GOOGLE_CLIENT_ID as string, 
            clientSecret: env.GOOGLE_CLIENT_SECRET as string, 
            getUserInfo: async (token) => {

                const response:any = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: {
                        Authorization: `Bearer ${token.accessToken}`,
                    },
                });
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
            }
        }
    }
})

export default auth