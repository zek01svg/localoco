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
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { user } from "#server/database/auth";
import { business } from "#server/database/business";
import { emailDelivery } from "#server/database/email";
import { listing } from "#server/database/listing";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import { listingsResponseSchema } from "#shared/contracts/listings";

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

let uenCounter = 8000;
const insertListing = async (
  ownerId: string,
  input: {
    name: string;
    category: string;
    address: string;
    status?: ListingStatus;
    latitude?: number | null;
    longitude?: number | null;
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
      latitude: input.latitude === undefined ? 1.2956 : input.latitude,
      longitude: input.longitude === undefined ? 103.7764 : input.longitude,
    })
    .returning({ id: listing.id });
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

describe("PRS-187: Map viewport filter", () => {
  let ownerId: string;

  beforeAll(async () => {
    await signUp("Viewport Owner", "viewport.owner@example.com");
    await verifyEmail("viewport.owner@example.com");
    ownerId = await userId("viewport.owner@example.com");
  });

  describe("Viewport bounds filtering", () => {
    let marinaBayId: string;
    let orchardId: string;
    let jurongEastId: string;
    let pasirRisId: string;
    let noCoordsId: string;

    beforeAll(async () => {
      // Marina Bay: Lat 1.2840, Lng 103.8580
      marinaBayId = await insertListing(ownerId, {
        name: "Marina Bay Bakery",
        category: "Bakery",
        address: "10 Bayfront Avenue",
        latitude: 1.284,
        longitude: 103.858,
      });

      // Orchard: Lat 1.3050, Lng 103.8320
      orchardId = await insertListing(ownerId, {
        name: "Orchard Cafe",
        category: "Cafe",
        address: "2 Orchard Turn",
        latitude: 1.305,
        longitude: 103.832,
      });

      // Jurong East: Lat 1.3330, Lng 103.7430
      jurongEastId = await insertListing(ownerId, {
        name: "Jurong Tech Hub",
        category: "Services",
        address: "3 Gateway Drive",
        latitude: 1.333,
        longitude: 103.743,
      });

      // Pasir Ris: Lat 1.3720, Lng 103.9490
      pasirRisId = await insertListing(ownerId, {
        name: "Pasir Ris Watersports",
        category: "Recreation",
        address: "125 Elias Road",
        latitude: 1.372,
        longitude: 103.949,
      });

      // Legacy row with no coordinates
      noCoordsId = await insertListing(ownerId, {
        name: "Vintage Shop Without Pin",
        category: "Retail",
        address: "99 Old Road",
        latitude: null,
        longitude: null,
      });
    });

    it("filters results server-side by viewport bounding box", async () => {
      // Bounding box for Central Singapore: Lat [1.27, 1.31], Lng [103.82, 103.87]
      const res = await getListings("?north=1.31&south=1.27&east=103.87&west=103.82&limit=50");
      const page = await parsePage(res);
      const ids = page.items.map(item => item.id);

      expect(ids).toContain(marinaBayId);
      expect(ids).toContain(orchardId);
      expect(ids).not.toContain(jurongEastId);
      expect(ids).not.toContain(pasirRisId);
      expect(ids).not.toContain(noCoordsId);
    });

    it("returns all listings when no viewport bounding box is supplied", async () => {
      const res = await getListings("?limit=100");
      const page = await parsePage(res);
      const ids = page.items.map(item => item.id);

      expect(ids).toContain(marinaBayId);
      expect(ids).toContain(orchardId);
      expect(ids).toContain(jurongEastId);
      expect(ids).toContain(pasirRisId);
      expect(ids).toContain(noCoordsId);
    });

    it("composes viewport bounds with text search and category filter", async () => {
      // Viewport includes both Marina Bay and Orchard, but q=bakery matches only Marina Bay
      const qRes = await getListings(
        "?north=1.31&south=1.27&east=103.87&west=103.82&q=bakery&limit=50"
      );
      const qPage = await parsePage(qRes);
      expect(qPage.items.map(i => i.id)).toEqual([marinaBayId]);

      // Category=Cafe matches only Orchard
      const catRes = await getListings(
        "?north=1.31&south=1.27&east=103.87&west=103.82&category=Cafe&limit=50"
      );
      const catPage = await parsePage(catRes);
      expect(catPage.items.map(i => i.id)).toEqual([orchardId]);
    });

    it("returns an honest empty page when no listings fall in the bounding box", async () => {
      // Small bounding box over open water / empty area
      const res = await getListings("?north=1.20&south=1.19&east=103.70&west=103.69");
      const page = await parsePage(res);
      expect(page.items).toEqual([]);
      expect(page.nextCursor).toBeNull();
    });
  });

  describe("Cursor pagination with viewport filtering", () => {
    let paginatedIds: string[];

    beforeAll(async () => {
      paginatedIds = [];
      for (let i = 1; i <= 5; i++) {
        paginatedIds.push(
          await insertListing(ownerId, {
            name: `Bounded Cafe ${String(i).padStart(2, "0")}`,
            category: "Cafe",
            address: `Bounded Address ${i}`,
            latitude: 1.285 + i * 0.001,
            longitude: 103.85 + i * 0.001,
          })
        );
      }
      paginatedIds.sort();
    });

    it("paginates stably with cursor under viewport bounds", async () => {
      const bounds = "north=1.295&south=1.280&east=103.860&west=103.845";
      const firstRes = await getListings(`?${bounds}&q=Bounded%20Cafe&limit=2`);
      const first = await parsePage(firstRes);
      expect(first.items).toHaveLength(2);
      expect(first.nextCursor).not.toBeNull();

      const secondRes = await getListings(
        `?${bounds}&q=Bounded%20Cafe&limit=2&cursor=${first.nextCursor}`
      );
      const second = await parsePage(secondRes);
      expect(second.items).toHaveLength(2);
      expect(second.nextCursor).not.toBeNull();

      const thirdRes = await getListings(
        `?${bounds}&q=Bounded%20Cafe&limit=2&cursor=${second.nextCursor}`
      );
      const third = await parsePage(thirdRes);
      expect(third.items).toHaveLength(1);
      expect(third.nextCursor).toBeNull();

      const allFetchedIds = [...first.items, ...second.items, ...third.items].map(i => i.id);
      expect(allFetchedIds).toEqual(paginatedIds);
    });
  });

  describe("Query validation for viewport parameters", () => {
    it("rejects incomplete bounding box parameters", async () => {
      const res1 = await getListings("?north=1.35&south=1.25");
      expect(res1.status).toBe(400);

      const res2 = await getListings("?north=1.35&south=1.25&east=104.0");
      expect(res2.status).toBe(400);
    });

    it("rejects when south latitude exceeds north latitude", async () => {
      const res = await getListings("?north=1.25&south=1.35&east=104.0&west=103.0");
      expect(res.status).toBe(400);
    });

    it("rejects non-numeric coordinates", async () => {
      const res = await getListings("?north=abc&south=1.25&east=104.0&west=103.0");
      expect(res.status).toBe(400);
    });

    it("rejects out-of-range coordinates", async () => {
      const res = await getListings("?north=95.0&south=1.25&east=104.0&west=103.0");
      expect(res.status).toBe(400);
    });
  });

  describe("Dependency failure handling", () => {
    it("returns 503 on database failure, never an empty collection", async () => {
      const unsafe = vi.spyOn(db.$client, "unsafe");
      unsafe.mockRejectedValueOnce(new Error("connection terminated"));

      try {
        const res = await getListings("?north=1.35&south=1.25&east=104.0&west=103.0");
        expect(res.status).toBe(503);
        const body = errorEnvelopeSchema.parse(await res.json());
        expect(body.error.code).toBe("dependency_unavailable");
      } finally {
        unsafe.mockRestore();
      }
    });
  });
});
