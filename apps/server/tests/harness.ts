import { sql } from "drizzle-orm";
import IoRedis from "ioredis";
import { vi, beforeAll, afterAll, beforeEach } from "vitest";

import app from "../app";
import auth from "../lib/auth";
import { setupTestDatabase, teardownTestDatabase } from "./setup";

/**
 * Harness state to hold real test container instances
 * used by shifted mocks.
 * We use globalThis to ensure access from hoisted vi.mock factories.
 */
// --- MOCK DATABASE ---
vi.mock("@server/database/db", () => ({
  default: new Proxy(
    {},
    {
      get: (_, prop) => {
        const db = (globalThis as any).__TEST_DB__;
        if (!db)
          throw new Error(
            "Test DB not initialized. Ensure useIntegrationHarness() is called."
          );
        return db[prop];
      },
    }
  ),
}));

// --- MOCK REDIS (Upstash Compatibility Layer) ---
vi.mock("@server/lib/redis", () => {
  const redisProxy = new Proxy(
    {},
    {
      get: (_, prop) => {
        const redis = (globalThis as any).__TEST_REDIS__;
        if (!redis) throw new Error("Test Redis not initialized.");

        if (prop === "get") {
          return async (key: string) => {
            const val = await redis.get(key);
            try {
              return val ? JSON.parse(val) : null;
            } catch {
              return val;
            }
          };
        }
        if (prop === "set") {
          return async (key: string, value: any, options?: { ex?: number }) => {
            const val =
              typeof value === "string" ? value : JSON.stringify(value);
            if (options?.ex) {
              return await redis.set(key, val, "EX", options.ex);
            }
            return await redis.set(key, val);
          };
        }
        if (prop === "del") {
          return async (...keys: string[]) => {
            return await redis.del(...keys);
          };
        }
        return redis[prop];
      },
    }
  );
  return { default: redisProxy };
});

// --- MOCK SUPABASE ---
vi.mock("@server/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: vi.fn(() => ({
        upload: vi
          .fn()
          .mockResolvedValue({ data: { path: "test.png" }, error: null }),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "http://localhost/test.png" },
        })),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    },
  },
}));

// --- MOCK AUTH ---
vi.mock("@server/lib/auth", () => ({
  default: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
    handler: vi.fn(),
  },
}));

// --- MOCK Hono Bun Adapter (prevents ReferenceError: Bun is not defined) ---
vi.mock("hono/bun", () => ({
  serveStatic: () => async (_c: any, next: any) => await next(),
}));

// --- MOCK EXTERNAL SERVICES ---
vi.mock("@server/lib/email-queue", () => ({
  enqueueEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@server/lib/mailer", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  generateNewBusinessListingEmail: vi.fn().mockReturnValue("<html></html>"),
  getResetPasswordEmailHtml: vi.fn().mockReturnValue("<html></html>"),
  getVerificationEmailHtml: vi.fn().mockReturnValue("<html></html>"),
}));

export function useIntegrationHarness() {
  beforeAll(async () => {
    const setup = await setupTestDatabase();
    (globalThis as any).__TEST_DB__ = setup.db;
    (globalThis as any).__TEST_REDIS__ = new IoRedis(setup.redisUri);
  }, 60000);

  beforeEach(async () => {
    const redis = (globalThis as any).__TEST_REDIS__;
    if (redis) {
      await redis.flushall();
    }

    const db = (globalThis as any).__TEST_DB__;
    if (db) {
      // Get all tables from the schema to truncate them
      const tables = [
        "user",
        "session",
        "account",
        "verification",
        "businesses",
        "business_payment_options",
        "bookmarked_businesses",
        "business_reviews",
        "business_announcements",
        "forum_posts",
        "forum_posts_replies",
        "user_points",
        "vouchers",
      ];
      for (const table of tables) {
        await db.execute(sql`TRUNCATE TABLE ${sql.identifier(table)} CASCADE`);
      }
    }
  });

  afterAll(async () => {
    const redis = (globalThis as any).__TEST_REDIS__;
    if (redis) await redis.quit();
    (globalThis as any).__TEST_DB__ = null;
    (globalThis as any).__TEST_REDIS__ = null;
    await teardownTestDatabase();
  });

  // Create a proxy helper for the test file to use, mimicking the Upstash interface
  const redisHelper = new Proxy(
    {},
    {
      get: (_, prop) => {
        const redis = (globalThis as any).__TEST_REDIS__;
        if (!redis) throw new Error("Test Redis not initialized in helper.");

        if (prop === "get") {
          return async (key: string) => {
            const val = await redis.get(key);
            try {
              return val ? JSON.parse(val) : null;
            } catch {
              return val;
            }
          };
        }
        if (prop === "set") {
          return async (key: string, value: any, options?: { ex?: number }) => {
            const val =
              typeof value === "string" ? value : JSON.stringify(value);
            if (options?.ex) {
              return await redis.set(key, val, "EX", options.ex);
            }
            return await redis.set(key, val);
          };
        }
        if (prop === "del") {
          return async (...keys: string[]) => await redis.del(...keys);
        }
        return redis[prop];
      },
    }
  );

  return {
    get app() {
      return app;
    },
    get db() {
      return (globalThis as any).__TEST_DB__;
    },
    get redis() {
      return redisHelper as any;
    },
  };
}

/**
 * Helper to mock an authenticated session in Hono context
 */
export function mockAuthSession(
  sessionInfo: any = { user: { id: "test-user-id" } }
) {
  (auth.api.getSession as any).mockResolvedValue(sessionInfo);
}
