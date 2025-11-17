import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
    client: {
        VITE_APP_URL: z.url(),
    },
    server: {
        NODE_ENV: z.enum(["development", "production"]).default("development"),
        PORT: z.number(),

        // db connection stuff
        DATABASE_URL: z.url(),
        DB_HOST: z.string(),
        DB_USER: z.string(),
        DB_PASSWORD: z.string(),
        DB_NAME: z.string(),
        DB_PORT: z.coerce.number(),
        SSL_PATH: z.string(),

        // better-auth
        BETTER_AUTH_SECRET: z.string(),

        // for google logins
        GOOGLE_CLIENT_ID: z.string(),
        GOOGLE_CLIENT_SECRET: z.string(),

        // for azure blob storage
        AZURE_STORAGE_CONNECTION_STRING: z.string(),

        // for azure email communication services
        COMMUNICATION_SERVICES_CONNECTION_STRING: z.string(),
        SENDER_ADDRESS: z. string(),

        APP_URL: z.url()
    },
    clientPrefix: "VITE_",
    runtimeEnv: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,

        // db connection stuff
        DATABASE_URL: process.env.DATABASE_URL,
        DB_HOST: process.env.DB_HOST,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME,
        DB_PORT: process.env.DB_PORT,
        SSL_PATH: process.env.SSL_PATH,

        // better-auth
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,

        // for google logins
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

        // for azure blob storage
        AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,

        // for azure email communication services
        COMMUNICATION_SERVICES_CONNECTION_STRING: process.env.COMMUNICATION_SERVICES_CONNECTION_STRING,
        SENDER_ADDRESS: process.env.SENDER_ADDRESS,
        
        APP_URL: process.env.APP_URL
    },
    skipValidation:
        !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});

export type Env = {
    [K in keyof typeof env as K extends `VITE_${string}` ? K : never]: string;
};