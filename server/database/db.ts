import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import { env } from 'env';

const sslConfig = env.NODE_ENV === 'production'
  ? { rejectUnauthorized: true }
  : { rejectUnauthorized: false }

const db = drizzle(mysql.createPool({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    port: env.DB_PORT,
    ssl: sslConfig
}));

// test for the connection
(async () => {
    try {
        const result = await db.execute(`SELECT 1 + 1 AS test`);
        console.log('✅ Database connection successful! Test result:', result[0]);
    } catch (err) {
        console.error('❌ Database connection failed:', err);
    }
})();

export default db