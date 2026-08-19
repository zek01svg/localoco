import type { ListingStatus } from "#server/database/listing";
/**
 * @vitest-environment node
 */
import type { AppType } from "#server/index";
import type { db as dbInstance } from "#server/lib/db";
import type { TestAppEnv } from "./auth-helpers";
import type { Context, Hono, MiddlewareHandler, Next } from "hono";

import { eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { user } from "#server/database/auth";
import { business } from "#server/database/business";
import { businessHours } from "#server/database/business-hours";
import { emailDelivery } from "#server/database/email";
import { listing } from "#server/database/listing";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  listingsCategoriesResponseSchema,
  listingsResponseSchema,
} from "#shared/contracts/listings";

import {
  createTestHonoApp,
  extractSessionCookie,
  registerUser,
  startPostgresContainer,
} from "./auth-helpers";

vi.mock("hono/bun", () => ({
  serveStatic: () => (_c: Context, next: Next) => next(),
}));

vi.mock("#server/lib/email/qstash", () => ({
  publishEmailJob: vi.fn<() => Promise<{ messageId: string }>>().mockResolvedValue({
    messageId: "mock_qstash_msg_123",
  }),
  verifyQStashSignature: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
}));

vi.mock("#server/lib/geocoding", async importOriginal => {
  const original = await importOriginal<typeof import("#server/lib/geocoding")>();
  return {
    ...original,
    geocodeAddress: () => Promise.resolve({ latitude: 1.2956, longitude: 103.7764 }),
  };
});

let container: Awaited<ReturnType<typeof startPostgresContainer>>["container"];
let sql: ReturnType<typeof postgres>;

let app: AppType;
let testApp: Hono<TestAppEnv>;
let db: typeof dbInstance;
let requireAuth: MiddlewareHandler;
let requireVerified: MiddlewareHandler;

const PASSWORD = "Password123!";
const ORIGIN = "http://localhost:4000";

const signUp = async (name: string, email: string) => {
  const res = await registerUser(testApp, { name, email, password: PASSWORD });
  expect(res.status).toBe(200);
  return extractSessionCookie(res);
};

const verifyEmail = async (email: string) => {
  const emails = await db.select().from(emailDelivery).where(eq(emailDelivery.recipient, email));
  const token = emails[0]?.htmlBody.match(/token=([^&"'\s]+)/u)?.[1];
  expect(token, `no verification token for ${email}`).toBeTruthy();
  const res = await testApp.request(`/api/auth/verify-email?token=${token}`, {
    headers: { origin: ORIGIN },
  });
  expect(res.status).toBe(200);
};

const userId = async (email: string) => {
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  expect(rows.length).toBe(1);
  return rows[0].id;
};

// Direct data-seam inserts: discovery behavior is about reads, and the write
// lifecycle (create -> submit -> moderate) is already covered end-to-end by
// listing-moderation.test.ts.
let uenCounter = 0;
const insertListing = async (
  ownerId: string,
  input: { name: string; category: string; address: string; status?: ListingStatus }
) => {
  const uen = `202${String(uenCounter++).padStart(7, "0")}`;
  const [biz] = await db.insert(business).values({ uen, ownerId }).returning({ id: business.id });
  const [row] = await db
    .insert(listing)
    .values({
      businessId: biz.id,
      status: input.status ?? "published",
      name: input.name,
      category: input.category,
      address: input.address,
      postalCode: "123456",
    })
    .returning({ id: listing.id });
  return row.id;
};

const insertListingWithHours = async (
  ownerId: string,
  input: {
    name: string;
    category: string;
    address: string;
    status?: ListingStatus;
    hours?: Array<{ day: number; is24h: boolean; openMinute?: number; closeMinute?: number }>;
  }
) => {
  const uen = `202${String(uenCounter++).padStart(7, "0")}`;
  const [biz] = await db.insert(business).values({ uen, ownerId }).returning({ id: business.id });
  const [row] = await db
    .insert(listing)
    .values({
      businessId: biz.id,
      status: input.status ?? "published",
      name: input.name,
      category: input.category,
      address: input.address,
      postalCode: "123456",
    })
    .returning({ id: listing.id });

  if (input.hours && input.hours.length > 0) {
    for (const h of input.hours) {
      await db.insert(businessHours).values({
        businessId: biz.id,
        day: h.day,
        is24h: h.is24h,
        openMinute: h.openMinute ?? null,
        closeMinute: h.closeMinute ?? null,
      });
    }
  }

  return row.id;
};

const getListings = (query: string) => testApp.request(`/api/listings${query}`);

const parsePage = async (res: Response) => {
  expect(res.status).toBe(200);
  return listingsResponseSchema.parse(await res.json());
};

beforeAll(async () => {
  const started = await startPostgresContainer();
  container = started.container;
  sql = postgres(started.databaseUrl, { max: 2 });

  process.env.DATABASE_URL = started.databaseUrl;
  process.env.BETTER_AUTH_SECRET = "super-secret-test-key-32-chars-long!!";
  process.env.NODE_ENV = "test";
  process.env.VITE_APP_URL = ORIGIN;

  const serverModule = await import("#server/index");
  const dbModule = await import("#server/lib/db");
  const authMwModule = await import("#server/lib/auth-middleware");

  app = serverModule.app;
  db = dbModule.db;
  requireAuth = authMwModule.requireAuth;
  requireVerified = authMwModule.requireVerified;

  const logger = {
    warning: vi.fn<(_msg: string, _props: Record<string, unknown>) => void>(),
    error: vi.fn<(_err: Error, _props: Record<string, unknown>) => void>(),
  };

  testApp = await createTestHonoApp(app, requireAuth, requireVerified, logger);
}, 120_000);

afterAll(async () => {
  await sql.end({ timeout: 5 });
  await container.stop();
});

describe("PRS-184: Business discovery", () => {
  let ownerId: string;

  beforeAll(async () => {
    await signUp("Discovery Owner", "discovery.owner@example.com");
    await verifyEmail("discovery.owner@example.com");
    ownerId = await userId("discovery.owner@example.com");
  });

  describe("Published-only isolation across lifecycle states", () => {
    it("returns published listings and none of draft, pending_review, rejected, or suspended", async () => {
      const draftId = await insertListing(ownerId, {
        name: "Lifecycle Draft",
        category: "Cafe",
        address: "1 Draft Road",
        status: "draft",
      });
      const pendingId = await insertListing(ownerId, {
        name: "Lifecycle Pending",
        category: "Cafe",
        address: "2 Pending Road",
        status: "pending_review",
      });
      const rejectedId = await insertListing(ownerId, {
        name: "Lifecycle Rejected",
        category: "Cafe",
        address: "3 Rejected Road",
        status: "rejected",
      });
      const suspendedId = await insertListing(ownerId, {
        name: "Lifecycle Suspended",
        category: "Cafe",
        address: "4 Suspended Road",
        status: "suspended",
      });
      const publishedId = await insertListing(ownerId, {
        name: "Lifecycle Published",
        category: "Cafe",
        address: "5 Published Road",
      });

      const page = await parsePage(await getListings("?limit=100"));
      const ids = page.items.map(item => item.id);

      expect(ids).toContain(publishedId);
      expect(ids).not.toContain(draftId);
      expect(ids).not.toContain(pendingId);
      expect(ids).not.toContain(rejectedId);
      expect(ids).not.toContain(suspendedId);
    });
  });

  describe("Normalized text search", () => {
    beforeAll(async () => {
      await insertListing(ownerId, {
        name: "Garden   Cove  Cafe",
        category: "Food & Beverage",
        address: "12  Orchard   Road",
      });
      await insertListing(ownerId, {
        name: "Sunrise Roastery",
        category: "Retail",
        address: "88 Tanjong Pagar Road",
      });
    });

    it("matches name despite case and whitespace differences", async () => {
      const page = await parsePage(await getListings("?q=GARDEN%20%20cove%20%20CAFE"));
      expect(page.items.map(item => item.name)).toContain("Garden   Cove  Cafe");
      expect(page.items.map(item => item.name)).not.toContain("Sunrise Roastery");
    });

    it("matches descriptive text (category and address)", async () => {
      const byCategory = await parsePage(await getListings("?q=food%20%26%20beverage"));
      expect(byCategory.items.map(item => item.name)).toContain("Garden   Cove  Cafe");

      const byAddress = await parsePage(await getListings("?q=TANJONG%20PAGAR"));
      expect(byAddress.items.map(item => item.name)).toContain("Sunrise Roastery");
    });

    it("treats LIKE wildcards in q as literals", async () => {
      await insertListing(ownerId, {
        name: "100% Natural Juice",
        category: "Retail",
        address: "5 Percent Lane",
      });

      const page = await parsePage(await getListings("?q=100%25"));
      const names = page.items.map(item => item.name);
      expect(names).toContain("100% Natural Juice");
      // Unescaped, "%" would match every row.
      expect(names).not.toContain("Sunrise Roastery");
    });

    it("returns an honest empty page when nothing matches", async () => {
      const page = await parsePage(await getListings("?q=definitely-not-a-business"));
      expect(page.items).toEqual([]);
      expect(page.nextCursor).toBeNull();
    });
  });

  describe("Category filtering", () => {
    beforeAll(async () => {
      await insertListing(ownerId, {
        name: "Searchable Sunrise Cafe",
        category: "Cafe",
        address: "1 Cafe Road",
      });
      await insertListing(ownerId, {
        name: "Searchable Sunrise Laundry",
        category: "Laundry",
        address: "2 Laundry Road",
      });
      await insertListing(ownerId, {
        name: "Searchable Night Cafe",
        category: "Cafe",
        address: "3 Night Road",
      });
    });

    it("narrows results by exact category", async () => {
      const page = await parsePage(await getListings("?category=Cafe&limit=100"));
      const names = page.items.map(item => item.name);
      expect(names).toContain("Searchable Sunrise Cafe");
      expect(names).toContain("Searchable Night Cafe");
      expect(names).not.toContain("Searchable Sunrise Laundry");
    });

    it("composes with text search", async () => {
      const page = await parsePage(await getListings("?category=Cafe&q=sunrise"));
      const names = page.items.map(item => item.name);
      expect(names).toEqual(["Searchable Sunrise Cafe"]);
    });

    it("returns an honest empty page for an unknown category", async () => {
      const page = await parsePage(await getListings("?category=DoesNotExist"));
      expect(page.items).toEqual([]);
      expect(page.nextCursor).toBeNull();
    });
  });

  describe("Cursor pagination", () => {
    let paginatedIds: string[];

    beforeAll(async () => {
      paginatedIds = [];
      for (const name of [
        "Paginated 01",
        "Paginated 02",
        "Paginated 03",
        "Paginated 04",
        "Paginated 05",
        "Paginated 06",
        "Paginated 07",
      ]) {
        paginatedIds.push(
          await insertListing(ownerId, { name, category: "Cafe", address: "1 Pagination Road" })
        );
      }
      paginatedIds.sort();
    });

    it("walks every row exactly once in deterministic id order", async () => {
      const seen: string[] = [];

      const first = await parsePage(await getListings("?q=Paginated&limit=3"));
      expect(first.items).toHaveLength(3);
      expect(first.nextCursor).not.toBeNull();
      seen.push(...first.items.map(item => item.id));

      const second = await parsePage(
        await getListings(`?q=Paginated&limit=3&cursor=${first.nextCursor}`)
      );
      expect(second.items).toHaveLength(3);
      expect(second.nextCursor).not.toBeNull();
      seen.push(...second.items.map(item => item.id));

      const last = await parsePage(
        await getListings(`?q=Paginated&limit=3&cursor=${second.nextCursor}`)
      );
      expect(last.items).toHaveLength(1);
      expect(last.nextCursor).toBeNull();
      seen.push(...last.items.map(item => item.id));

      expect(new Set(seen).size).toBe(7);
      expect(seen).toEqual(paginatedIds);
    });

    it("reproduces identical order across repeated first-page requests", async () => {
      const a = await parsePage(await getListings("?q=Paginated&limit=3"));
      const b = await parsePage(await getListings("?q=Paginated&limit=3"));
      expect(a.items.map(item => item.id)).toEqual(b.items.map(item => item.id));
    });
  });

  describe("Dependency failure vs empty collection", () => {
    it("returns the 503 error envelope, never an empty page, when the data seam fails", async () => {
      const unsafe = vi.spyOn(db.$client, "unsafe");
      unsafe.mockRejectedValueOnce(new Error("connection refused"));
      try {
        const res = await getListings("");
        expect(res.status).toBe(503);
        const body = errorEnvelopeSchema.parse(await res.json());
        expect(body.error.code).toBe("dependency_unavailable");
      } finally {
        unsafe.mockRestore();
      }

      // And the next request succeeds, proving the failure was reported
      // instead of cached as an empty collection.
      const page = await parsePage(await getListings("?q=Paginated&limit=3"));
      expect(page.items.length).toBeGreaterThan(0);
    });
  });

  describe("Query batching", () => {
    it("serves a listings page with exactly one SQL query regardless of page size", async () => {
      const unsafe = vi.spyOn(db.$client, "unsafe");

      unsafe.mockClear();
      const small = await parsePage(await getListings("?limit=3"));
      expect(small.items).toHaveLength(3);
      expect(unsafe).toHaveBeenCalledTimes(1);
      expect(unsafe.mock.calls[0][0]).toContain('from "listing"');

      unsafe.mockClear();
      const large = await parsePage(await getListings("?limit=100"));
      expect(large.items.length).toBeGreaterThan(3);
      expect(unsafe).toHaveBeenCalledTimes(1);

      unsafe.mockRestore();
    });

    it("serves the category filter options with exactly one query", async () => {
      const unsafe = vi.spyOn(db.$client, "unsafe");

      const res = await testApp.request("/api/listings/categories");
      expect(res.status).toBe(200);
      const body = listingsCategoriesResponseSchema.parse(await res.json());
      expect(body.items.length).toBeGreaterThan(0);

      expect(unsafe).toHaveBeenCalledTimes(1);
      expect(unsafe.mock.calls[0][0]).toContain('from "listing"');

      unsafe.mockRestore();
    });
  });

  describe("Category options endpoint", () => {
    it("returns distinct published categories in ascending order, excluding unpublished ones", async () => {
      await insertListing(ownerId, {
        name: "Options Bakery",
        category: "Bakery",
        address: "1 Bakery Road",
      });
      await insertListing(ownerId, {
        name: "Options Zoo (draft)",
        category: "Zoo",
        address: "2 Zoo Road",
        status: "draft",
      });

      const res = await testApp.request("/api/listings/categories");
      expect(res.status).toBe(200);
      const body = listingsCategoriesResponseSchema.parse(await res.json());

      expect(body.items).toContain("Bakery");
      expect(body.items).toContain("Cafe");
      expect(body.items).not.toContain("Zoo");
      expect(body.items).toEqual(body.items.toSorted());
    });
  });

  describe("Query validation", () => {
    it("rejects q longer than 200 characters", async () => {
      const res = await getListings(`?q=${"a".repeat(201)}`);
      expect(res.status).toBe(400);
    });

    it("rejects category longer than 100 characters", async () => {
      const res = await getListings(`?category=${"a".repeat(101)}`);
      expect(res.status).toBe(400);
    });

    it("rejects invalid openNow query parameters with 400", async () => {
      expect((await getListings("?openNow=invalid")).status).toBe(400);
      expect((await getListings("?openNow=1")).status).toBe(400);
      expect((await getListings("?openNow=TRUE")).status).toBe(400);
    });
  });

  describe("PRS-186: Open-now filter in Business discovery", () => {
    let hoursOwnerId: string;
    let biz24hId: string;
    let bizDaytimeId: string;
    let bizOvernightId: string;
    let bizNoHoursId: string;
    let bizClosedId: string;
    let bizDraftId: string;

    beforeAll(async () => {
      await signUp("Hours Owner", "hours.discovery.owner@example.com");
      await verifyEmail("hours.discovery.owner@example.com");
      hoursOwnerId = await userId("hours.discovery.owner@example.com");

      // 24-hour on Wednesday (day 2)
      biz24hId = await insertListingWithHours(hoursOwnerId, {
        name: "Always Open Bistro",
        category: "Cafe",
        address: "100 24h Way",
        hours: [{ day: 2, is24h: true }],
      });

      // Daytime Wed 09:00 - 18:00 (day 2, 540 to 1080)
      bizDaytimeId = await insertListingWithHours(hoursOwnerId, {
        name: "Daytime Cafe",
        category: "Cafe",
        address: "101 Sun Road",
        hours: [{ day: 2, is24h: false, openMinute: 540, closeMinute: 1080 }],
      });

      // Overnight Wed 18:00 - 02:00 (day 2, 1080 to 120 -> spills to Thu morning)
      bizOvernightId = await insertListingWithHours(hoursOwnerId, {
        name: "Night Owl Bar",
        category: "Bar",
        address: "102 Moon Lane",
        hours: [{ day: 2, is24h: false, openMinute: 1080, closeMinute: 120 }],
      });

      // No hours recorded
      bizNoHoursId = await insertListingWithHours(hoursOwnerId, {
        name: "Hours Unknown Bakery",
        category: "Bakery",
        address: "103 Mystery Street",
      });

      // Closed on Wed, open only Thu 09:00 - 18:00 (day 3)
      bizClosedId = await insertListingWithHours(hoursOwnerId, {
        name: "Thursday Only Club",
        category: "Club",
        address: "104 Thursday Ave",
        hours: [{ day: 3, is24h: false, openMinute: 540, closeMinute: 1080 }],
      });

      // 24h on Wed but draft status
      bizDraftId = await insertListingWithHours(hoursOwnerId, {
        name: "Draft 24h Place",
        category: "Cafe",
        address: "105 Draft Alley",
        status: "draft",
        hours: [{ day: 2, is24h: true }],
      });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("filters to open businesses and excludes closed, draft, and hours-less businesses", async () => {
      // Wed 12:00:00 SG (2026-08-19T04:00:00Z)
      vi.setSystemTime(new Date("2026-08-19T04:00:00Z"));

      const page = await parsePage(await getListings("?openNow=true&limit=100"));
      const ids = page.items.map(item => item.id);

      expect(ids).toContain(biz24hId);
      expect(ids).toContain(bizDaytimeId);
      expect(ids).not.toContain(bizOvernightId); // opens at 18:00
      expect(ids).not.toContain(bizNoHoursId);
      expect(ids).not.toContain(bizClosedId);
      expect(ids).not.toContain(bizDraftId);
    });

    it("evaluates boundary instants at open and close accurately", async () => {
      // Wed 08:59:59 SG (1 sec before 09:00 open) -> closed
      vi.setSystemTime(new Date("2026-08-19T00:59:59Z"));
      const beforeOpen = await parsePage(await getListings("?openNow=true&limit=100"));
      expect(beforeOpen.items.map(i => i.id)).not.toContain(bizDaytimeId);

      // Wed 09:00:00 SG (exact open instant) -> open
      vi.setSystemTime(new Date("2026-08-19T01:00:00Z"));
      const atOpen = await parsePage(await getListings("?openNow=true&limit=100"));
      expect(atOpen.items.map(i => i.id)).toContain(bizDaytimeId);

      // Wed 17:59:59 SG (1 sec before 18:00 close) -> open
      vi.setSystemTime(new Date("2026-08-19T09:59:59Z"));
      const beforeClose = await parsePage(await getListings("?openNow=true&limit=100"));
      expect(beforeClose.items.map(i => i.id)).toContain(bizDaytimeId);

      // Wed 18:00:00 SG (exact close instant) -> closed
      vi.setSystemTime(new Date("2026-08-19T10:00:00Z"));
      const atClose = await parsePage(await getListings("?openNow=true&limit=100"));
      expect(atClose.items.map(i => i.id)).not.toContain(bizDaytimeId);
    });

    it("handles overnight windows across midnight and into the next morning", async () => {
      // Wed 18:00:00 SG (exact overnight open) -> open
      vi.setSystemTime(new Date("2026-08-19T10:00:00Z"));
      const wedEvening = await parsePage(await getListings("?openNow=true&limit=100"));
      expect(wedEvening.items.map(i => i.id)).toContain(bizOvernightId);

      // Wed 23:59:59 SG -> open
      vi.setSystemTime(new Date("2026-08-19T15:59:59Z"));
      const wedLate = await parsePage(await getListings("?openNow=true&limit=100"));
      expect(wedLate.items.map(i => i.id)).toContain(bizOvernightId);

      // Thu 00:00:00 SG (midnight rollover) -> open via Wednesday spill
      vi.setSystemTime(new Date("2026-08-19T16:00:00Z"));
      const thuMidnight = await parsePage(await getListings("?openNow=true&limit=100"));
      expect(thuMidnight.items.map(i => i.id)).toContain(bizOvernightId);

      // Thu 01:59:59 SG (1 sec before 02:00 spill close) -> open
      vi.setSystemTime(new Date("2026-08-19T17:59:59Z"));
      const thuEarly = await parsePage(await getListings("?openNow=true&limit=100"));
      expect(thuEarly.items.map(i => i.id)).toContain(bizOvernightId);

      // Thu 02:00:00 SG (exact overnight close) -> closed
      vi.setSystemTime(new Date("2026-08-19T18:00:00Z"));
      const thuClosed = await parsePage(await getListings("?openNow=true&limit=100"));
      expect(thuClosed.items.map(i => i.id)).not.toContain(bizOvernightId);
    });

    it("does not report an overnight business open on its own calendar day morning", async () => {
      // Wed 01:00:00 SG (2026-08-18T17:00:00Z) -> closed for Wed 18:00-02:00
      vi.setSystemTime(new Date("2026-08-18T17:00:00Z"));
      const wedMorning = await parsePage(await getListings("?openNow=true&limit=100"));
      expect(wedMorning.items.map(i => i.id)).not.toContain(bizOvernightId);
    });

    it("composes correctly with text search and category filtering", async () => {
      // Wed 12:00:00 SG
      vi.setSystemTime(new Date("2026-08-19T04:00:00Z"));

      const combined = await parsePage(await getListings("?openNow=true&category=Cafe&q=daytime"));
      expect(combined.items.map(i => i.name)).toEqual(["Daytime Cafe"]);

      const noMatch = await parsePage(await getListings("?openNow=true&category=Bar&q=daytime"));
      expect(noMatch.items).toEqual([]);
    });

    it("maintains stable and deterministic cursor pagination with openNow=true", async () => {
      // Wed 12:00:00 SG
      vi.setSystemTime(new Date("2026-08-19T04:00:00Z"));

      const paginatedOpenIds: string[] = [];
      for (const name of [
        "Open Paginated 01",
        "Open Paginated 02",
        "Open Paginated 03",
        "Open Paginated 04",
        "Open Paginated 05",
        "Open Paginated 06",
        "Open Paginated 07",
      ]) {
        paginatedOpenIds.push(
          await insertListingWithHours(hoursOwnerId, {
            name,
            category: "Bakery",
            address: "10 Pagination Open Road",
            hours: [{ day: 2, is24h: true }],
          })
        );
      }
      paginatedOpenIds.sort();

      const seen: string[] = [];
      const first = await parsePage(
        await getListings("?openNow=true&category=Bakery&q=Open%20Paginated&limit=3")
      );
      expect(first.items).toHaveLength(3);
      expect(first.nextCursor).not.toBeNull();
      seen.push(...first.items.map(item => item.id));

      const second = await parsePage(
        await getListings(
          `?openNow=true&category=Bakery&q=Open%20Paginated&limit=3&cursor=${first.nextCursor}`
        )
      );
      expect(second.items).toHaveLength(3);
      expect(second.nextCursor).not.toBeNull();
      seen.push(...second.items.map(item => item.id));

      const last = await parsePage(
        await getListings(
          `?openNow=true&category=Bakery&q=Open%20Paginated&limit=3&cursor=${second.nextCursor}`
        )
      );
      expect(last.items).toHaveLength(1);
      expect(last.nextCursor).toBeNull();
      seen.push(...last.items.map(item => item.id));

      expect(new Set(seen).size).toBe(7);
      expect(seen).toEqual(paginatedOpenIds);
    });

    it("serves an open-now page with exactly one SQL query", async () => {
      vi.setSystemTime(new Date("2026-08-19T04:00:00Z"));
      const unsafe = vi.spyOn(db.$client, "unsafe");

      unsafe.mockClear();
      const res = await parsePage(await getListings("?openNow=true&limit=10"));
      expect(res.items.length).toBeGreaterThan(0);
      expect(unsafe).toHaveBeenCalledTimes(1);
      expect(unsafe.mock.calls[0][0]).toContain('from "listing"');

      unsafe.mockRestore();
    });
  });
});
