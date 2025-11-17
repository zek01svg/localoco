import { defineConfig } from 'drizzle-kit'
import { env } from 'env';

export default defineConfig({
    out: './server/database/drizzle',
    schema: './server/database/schema.ts',
    dialect: 'mysql',
    dbCredentials: {
        url: env.DATABASE_URL
    },
    verbose:true,
    strict:true
});