import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import postgres from "postgres";
import { describe, expect, it } from "vitest";

import * as schema from "#server/database/index";

import {
  runSeed,
  SEED_ANNOUNCEMENTS,
  SEED_BOOKMARKS,
  SEED_BUSINESS_HOURS,
  SEED_BUSINESSES,
  SEED_EVENTS,
  SEED_FORUM_POSTS,
  SEED_FORUM_REPLIES,
  SEED_LISTINGS,
  SEED_POST_LIKES,
  SEED_REPLY_LIKES,
  SEED_REVIEW_LIKES,
  SEED_REVIEWS,
  SEED_USERS,
} from "../../scripts/seed";
import { runMigrate } from "./auth-helpers";

describe("production seed bootstrap", () => {
  it("seeds an empty migrated database, enforces security/domain invariants, and exact rerun is a no-op", async () => {
    const container = await new PostgreSqlContainer("postgres:17-alpine").start();
    const databaseUrl = container.getConnectionUri();

    try {
      // 1. Migrate empty database
      runMigrate(databaseUrl);

      const client = postgres(databaseUrl, { max: 5 });
      const testDb = drizzle(client, { schema });
      const pool = new Pool({ connectionString: databaseUrl });

      try {
        // 2. Execute first seed run
        const stats = await runSeed(testDb);

        expect(stats).toEqual({
          users: SEED_USERS.length,
          businesses: SEED_BUSINESSES.length,
          listings: SEED_LISTINGS.length,
          businessHours: SEED_BUSINESS_HOURS.length,
          reviews: SEED_REVIEWS.length,
          forumPosts: SEED_FORUM_POSTS.length,
          forumReplies: SEED_FORUM_REPLIES.length,
          reviewLikes: SEED_REVIEW_LIKES.length,
          postLikes: SEED_POST_LIKES.length,
          replyLikes: SEED_REPLY_LIKES.length,
          announcements: SEED_ANNOUNCEMENTS.length,
          events: SEED_EVENTS.length,
          bookmarks: SEED_BOOKMARKS.length,
        });

        // 3. Verify row counts in PostgreSQL
        const countTable = async (tableName: string): Promise<number> => {
          const res = await pool.query<{ count: string }>(
            `SELECT count(*)::int as count FROM "${tableName}"`
          );
          return Number(res.rows[0].count);
        };

        expect(await countTable("user")).toBe(SEED_USERS.length);
        expect(await countTable("business")).toBe(SEED_BUSINESSES.length);
        expect(await countTable("listing")).toBe(SEED_LISTINGS.length);
        expect(await countTable("business_hours")).toBe(SEED_BUSINESS_HOURS.length);
        expect(await countTable("review")).toBe(SEED_REVIEWS.length);
        expect(await countTable("forum_post")).toBe(SEED_FORUM_POSTS.length);
        expect(await countTable("forum_reply")).toBe(SEED_FORUM_REPLIES.length);
        expect(await countTable("review_like")).toBe(SEED_REVIEW_LIKES.length);
        expect(await countTable("forum_post_like")).toBe(SEED_POST_LIKES.length);
        expect(await countTable("forum_reply_like")).toBe(SEED_REPLY_LIKES.length);
        expect(await countTable("announcement")).toBe(SEED_ANNOUNCEMENTS.length);
        expect(await countTable("event")).toBe(SEED_EVENTS.length);
        expect(await countTable("bookmark")).toBe(SEED_BOOKMARKS.length);

        // 4. Assert Synthetic Persona Authentication Invariant:
        // ZERO Better Auth password, OAuth account, or session rows exist for synthetic seed personas.
        expect(await countTable("account")).toBe(0);
        expect(await countTable("session")).toBe(0);

        // 5. Assert Domain & Authorization Invariants:
        // a) No self-reviews: a Business Owner must NEVER review their own Business
        const selfReviews = await pool.query(
          `SELECT r.id FROM "review" r
           JOIN "business" b ON r.business_id = b.id
           WHERE r.user_id = b.owner_id`
        );
        expect(selfReviews.rows).toHaveLength(0);

        // b) All seeded user emails use reserved non-routable domains (RFC 2606 / RFC 6761)
        const userEmails = await pool.query<{ email: string }>(`SELECT email FROM "user"`);
        const invalidUserEmails = userEmails.rows.filter(
          row => !/@([a-z0-9.-]+\.)?(example\.com|example\.org|example\.net)$/u.test(row.email)
        );
        expect(invalidUserEmails).toHaveLength(0);

        // c) All seeded business contact emails and websites use reserved domains
        const listingEmails = await pool.query<{ email: string }>(
          `SELECT email FROM "listing" WHERE email IS NOT NULL`
        );
        const invalidListingEmails = listingEmails.rows.filter(
          row => !/@([a-z0-9.-]+\.)?(example\.com|example\.org|example\.net)$/u.test(row.email)
        );
        expect(invalidListingEmails).toHaveLength(0);

        const listingWebsites = await pool.query<{ website: string }>(
          `SELECT website FROM "listing" WHERE website IS NOT NULL`
        );
        const invalidWebsites = listingWebsites.rows.filter(
          row =>
            !/^https:\/\/[a-z0-9.-]+\.(example\.com|example\.org|example\.net)$/u.test(row.website)
        );
        expect(invalidWebsites).toHaveLength(0);

        // d) All seeded listings are in "published" lifecycle state
        const nonPublishedListings = await pool.query(
          `SELECT id FROM "listing" WHERE status != 'published'`
        );
        expect(nonPublishedListings.rows).toHaveLength(0);

        // e) All seeded events are active and have ends_at >= starts_at in the future
        const now = new Date();
        const invalidEvents = await pool.query<{ id: string }>(
          `SELECT id FROM "event" WHERE status != 'active' OR ends_at < starts_at OR ends_at <= $1`,
          [now]
        );
        expect(invalidEvents.rows).toHaveLength(0);

        // f) All seeded announcements are active with valid date bounds
        const invalidAnnouncements = await pool.query<{ id: string }>(
          `SELECT id FROM "announcement" WHERE status != 'active' OR (starts_at IS NOT NULL AND ends_at IS NOT NULL AND ends_at < starts_at)`
        );
        expect(invalidAnnouncements.rows).toHaveLength(0);

        // 6. Rerun seed script against the already-seeded database and assert exact idempotency (no-op)
        const rerunStats = await runSeed(testDb);
        expect(rerunStats).toEqual(stats);

        // Assert all counts remain strictly unchanged
        expect(await countTable("user")).toBe(SEED_USERS.length);
        expect(await countTable("business")).toBe(SEED_BUSINESSES.length);
        expect(await countTable("listing")).toBe(SEED_LISTINGS.length);
        expect(await countTable("business_hours")).toBe(SEED_BUSINESS_HOURS.length);
        expect(await countTable("review")).toBe(SEED_REVIEWS.length);
        expect(await countTable("forum_post")).toBe(SEED_FORUM_POSTS.length);
        expect(await countTable("forum_reply")).toBe(SEED_FORUM_REPLIES.length);
        expect(await countTable("review_like")).toBe(SEED_REVIEW_LIKES.length);
        expect(await countTable("forum_post_like")).toBe(SEED_POST_LIKES.length);
        expect(await countTable("forum_reply_like")).toBe(SEED_REPLY_LIKES.length);
        expect(await countTable("announcement")).toBe(SEED_ANNOUNCEMENTS.length);
        expect(await countTable("event")).toBe(SEED_EVENTS.length);
        expect(await countTable("bookmark")).toBe(SEED_BOOKMARKS.length);
        expect(await countTable("account")).toBe(0);
        expect(await countTable("session")).toBe(0);
      } finally {
        await client.end();
        await pool.end();
      }
    } finally {
      await container.stop();
    }
  }, 300_000);
});
