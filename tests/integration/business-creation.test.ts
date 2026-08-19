/**
 * @vitest-environment node
 */
import type { db as dbInstance } from "#server/lib/db";
import type { TestAppEnv } from "./auth-helpers";
import type { Context, Hono, Next } from "hono";

import { eq } from "drizzle-orm";
import { Client } from "pg";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { user } from "#server/database/auth";
import { business } from "#server/database/business";
import { emailDelivery } from "#server/database/email";
import { listing } from "#server/database/listing";
import { businessCreationResponseSchema } from "#shared/contracts/business";
import { errorEnvelopeSchema } from "#shared/contracts/error";

import {
  createTestHonoApp,
  extractSessionCookie,
  registerUser,
  startPostgresContainer,
} from "./auth-helpers";

vi.mock("hono/bun", () => ({
  serveStatic: () => (_c: Context, next: Next) => next(),
}));

const { mockPublishEmailJob } = vi.hoisted(() => ({
  mockPublishEmailJob: vi.fn<() => Promise<{ messageId: string }>>().mockResolvedValue({
    messageId: "mock_qstash_msg_123",
  }),
}));

vi.mock("#server/lib/email/qstash", () => ({
  publishEmailJob: () => mockPublishEmailJob(),
  verifyQStashSignature: vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
}));

const { mockGeocodeAddress } = vi.hoisted(() => ({
  mockGeocodeAddress: vi
    .fn<() => Promise<{ latitude: number; longitude: number }>>()
    .mockResolvedValue({ latitude: 1.2956, longitude: 103.7764 }),
}));

vi.mock("#server/lib/geocoding", async importOriginal => {
  const original = await importOriginal<typeof import("#server/lib/geocoding")>();
  return { ...original, geocodeAddress: () => mockGeocodeAddress() };
});

let container: Awaited<ReturnType<typeof startPostgresContainer>>["container"];
let sql: ReturnType<typeof postgres>;
let testApp: Hono<TestAppEnv>;
let db: typeof dbInstance;

const PASSWORD = "Password123!";
const ORIGIN = "http://localhost:4000";

const createBusiness = (cookie: string | undefined, body: object) =>
  testApp.request("/api/businesses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });

const signIn = async (email: string) => {
  const res = await testApp.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ORIGIN },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  expect(res.status).toBe(200);
  return extractSessionCookie(res);
};

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
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  expect(row, `no user for ${email}`).toBeTruthy();
  return row.id;
};

const listingFor = (businessId: string) =>
  db.select().from(listing).where(eq(listing.businessId, businessId)).limit(1);

const validListing = {
  name: "Ah Kow Kopitiam",
  category: "Food & Beverage",
  address: "1 Example Street #01-01",
  postalCode: "123456",
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

  db = dbModule.db;
  const logger = {
    warning: vi.fn<(_msg: string, _props: Record<string, unknown>) => void>(),
    error: vi.fn<(_err: Error, _props: Record<string, unknown>) => void>(),
  };
  testApp = await createTestHonoApp(
    serverModule.app,
    authMwModule.requireAuth,
    authMwModule.requireVerified,
    logger
  );
}, 120_000);

afterAll(async () => {
  await sql.end({ timeout: 5 });
  await container.stop();
});

describe("creating a Business and its draft Listing", () => {
  let aliceCookie: string;
  let aliceId: string;

  beforeAll(async () => {
    await signUp("Alice", "alice.biz@example.com");
    await verifyEmail("alice.biz@example.com");
    aliceCookie = await signIn("alice.biz@example.com");
    aliceId = await userId("alice.biz@example.com");
  });

  it("creates a Business and its draft Listing atomically for a verified user", async () => {
    const res = await createBusiness(aliceCookie, {
      uen: "202400123A",
      listing: validListing,
    });
    const body = businessCreationResponseSchema.parse(await res.json());
    expect(body.id).toBeTruthy();
    expect(body.uen).toBe("202400123A");
    expect(body.listing).toMatchObject({ ...validListing, status: "draft" });

    const [biz] = await db
      .select({ id: business.id, ownerId: business.ownerId, uen: business.uen })
      .from(business)
      .where(eq(business.uen, "202400123A"));
    expect(biz).toMatchObject({ uen: "202400123A", ownerId: aliceId });

    const [draft] = await listingFor(biz.id);
    expect(draft.status).toBe("draft");
    expect(draft.name).toBe(validListing.name);
  });

  it("normalizes and uppercases the UEN before storing", async () => {
    const res = await createBusiness(aliceCookie, {
      uen: "  201800123a ",
      listing: validListing,
    });
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ uen: "201800123A" });
  });

  it("rejects internal whitespace in a UEN with 400", async () => {
    const res = await createBusiness(aliceCookie, {
      uen: "2018 00123A",
      listing: validListing,
    });
    expect(res.status).toBe(400);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("invalid_request");
  });

  it("strips a client-supplied owner identifier; ownership derives from the session", async () => {
    const [other] = await db.select({ id: user.id }).from(user).limit(1);
    const res = await createBusiness(aliceCookie, {
      uen: "202400124B",
      listing: validListing,
      ownerId: other.id,
    });
    expect(res.status).toBe(201);
    const [biz] = await db
      .select({ ownerId: business.ownerId })
      .from(business)
      .where(eq(business.uen, "202400124B"));
    expect(biz.ownerId).toBe(aliceId);
  });

  it("stores optional phone, email, website, payment options, and price range", async () => {
    const res = await createBusiness(aliceCookie, {
      uen: "202400125C",
      listing: {
        ...validListing,
        phone: "+65 6123 4567",
        email: "hello@ahkow.example",
        website: "https://ahkow.example",
        paymentOptions: ["PayNow", "NETS"],
        priceRange: "$10–$30",
      },
    });
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      listing: {
        phone: "+65 6123 4567",
        email: "hello@ahkow.example",
        website: "https://ahkow.example",
        paymentOptions: ["PayNow", "NETS"],
        priceRange: "$10–$30",
      },
    });
  });

  it("rejects a UEN in an unsupported format with 400", async () => {
    const res = await createBusiness(aliceCookie, { uen: "NOT-A-UEN", listing: validListing });
    expect(res.status).toBe(400);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("invalid_request");
  });

  it("rejects over-bound fields at the boundary with 400", async () => {
    const res = await createBusiness(aliceCookie, {
      uen: "202400126D",
      listing: { ...validListing, name: "x".repeat(201) },
    });
    expect(res.status).toBe(400);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("invalid_request");
  });

  it("rejects an anonymous request with 401", async () => {
    const res = await createBusiness(undefined, { uen: "202400127E", listing: validListing });
    expect(res.status).toBe(401);
  });

  it("rejects an unverified user with 403", async () => {
    const unverifiedCookie = await signUp("Carol", "carol.unverified.biz@example.com");
    const res = await createBusiness(unverifiedCookie, {
      uen: "202400128F",
      listing: validListing,
    });
    expect(res.status).toBe(403);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("forbidden");
  });
});

describe("UEN uniqueness under concurrency", () => {
  let ownerCookie: string;

  beforeAll(async () => {
    await signUp("Dana", "dana.biz@example.com");
    await verifyEmail("dana.biz@example.com");
    ownerCookie = await signIn("dana.biz@example.com");
  });

  it("resolves two concurrent same-UEN requests to exactly one success", async () => {
    const uen = "202400130H";
    const [a, b] = await Promise.all([
      createBusiness(ownerCookie, { uen, listing: validListing }),
      createBusiness(ownerCookie, { uen, listing: validListing }),
    ]);
    const statuses = [a.status, b.status].toSorted((x, y) => x - y);
    expect(statuses).toEqual([201, 409]);

    const failed = a.status === 409 ? a : b;
    const body = errorEnvelopeSchema.parse(await failed.json());
    expect(body.error.code).toBe("conflict");

    const [biz] = await db.select({ id: business.id }).from(business).where(eq(business.uen, uen));
    expect(biz).toBeTruthy();
    const [draft] = await listingFor(biz.id);
    expect(draft).toBeTruthy();
  });

  it("answers 409 for a duplicate UEN and leaves nothing behind", async () => {
    const uen = "202400131I";
    await createBusiness(ownerCookie, { uen, listing: validListing });

    const countBefore = await db.$count(business);
    const listingCountBefore = await db.$count(listing);
    const res = await createBusiness(ownerCookie, { uen, listing: validListing });
    expect(res.status).toBe(409);
    expect(await db.$count(business)).toBe(countBefore);
    expect(await db.$count(listing)).toBe(listingCountBefore);
  });

  it("rolls back the whole write when the Listing insert fails", async () => {
    const uen = "202400132J";
    const businessCountBefore = await db.$count(business);
    const listingCountBefore = await db.$count(listing);
    await sql`create or replace function fail_listing_insert() returns trigger as $$
      begin
        raise exception 'forced listing insert failure';
      end;
      $$ language plpgsql`;
    await sql`create trigger trg_fail_listing_insert before insert on "listing"
      for each row execute function fail_listing_insert()`;
    try {
      const res = await createBusiness(ownerCookie, { uen, listing: validListing });
      expect(res.status).toBe(500);

      // The Business insert succeeded inside the transaction, but the failed
      // Listing insert must roll it back: no orphan Business, no half row.
      const [biz] = await db
        .select({ id: business.id })
        .from(business)
        .where(eq(business.uen, uen));
      expect(biz).toBeUndefined();
      expect(await db.$count(business)).toBe(businessCountBefore);
      expect(await db.$count(listing)).toBe(listingCountBefore);
    } finally {
      await sql`drop trigger if exists trg_fail_listing_insert on "listing"`;
      await sql`drop function if exists fail_listing_insert()`;
    }
  }, 60_000);
});

describe("viewing and editing an owned draft Listing", () => {
  let ownerCookie: string;
  let otherCookie: string;
  let bizId: string;

  beforeAll(async () => {
    await signUp("Erin", "erin.biz@example.com");
    await verifyEmail("erin.biz@example.com");
    ownerCookie = await signIn("erin.biz@example.com");
    await signUp("Frank", "frank.biz@example.com");
    await verifyEmail("frank.biz@example.com");
    otherCookie = await signIn("frank.biz@example.com");

    const created = await createBusiness(ownerCookie, { uen: "202400133K", listing: validListing });
    if (created.status !== 201) {
      throw new Error(`setup failed: expected 201, got ${created.status}`);
    }
    bizId = businessCreationResponseSchema.parse(await created.json()).id;
  });

  it("lets the owner view their draft Listing", async () => {
    const res = await testApp.request(`/api/businesses/${bizId}/listing`, {
      headers: { cookie: ownerCookie },
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      ...validListing,
      status: "draft",
    });
  });

  it("lets the owner edit their draft Listing, applying only provided fields", async () => {
    const res = await testApp.request(`/api/businesses/${bizId}/listing`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: ownerCookie },
      body: JSON.stringify({ name: "Ah Kow Kopitiam (Renovating)" }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      name: "Ah Kow Kopitiam (Renovating)",
      category: "Food & Beverage",
    });

    const [draft] = await listingFor(bizId);
    expect(draft.name).toBe("Ah Kow Kopitiam (Renovating)");
  });

  it("lets the owner clear an optional field by patching it to an empty value, stored as NULL", async () => {
    const res = await testApp.request(`/api/businesses/${bizId}/listing`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: ownerCookie },
      body: JSON.stringify({ website: "" }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ website: null });

    const [row] = await db
      .select({ website: listing.website })
      .from(listing)
      .where(eq(listing.businessId, bizId));
    expect(row.website).toBeNull();
  });

  it("hides another user's Listing: 404 for a non-owner", async () => {
    const res = await testApp.request(`/api/businesses/${bizId}/listing`, {
      headers: { cookie: otherCookie },
    });
    expect(res.status).toBe(404);
  });

  it("hides a missing Business: 404 for an unknown id", async () => {
    const res = await testApp.request("/api/businesses/no-such-business/listing", {
      headers: { cookie: ownerCookie },
    });
    expect(res.status).toBe(404);
  });
});

describe("draft Listings are not publicly discoverable", () => {
  let ownerCookie: string;

  beforeAll(async () => {
    await signUp("Grace", "grace.biz@example.com");
    await verifyEmail("grace.biz@example.com");
    ownerCookie = await signIn("grace.biz@example.com");
  });

  it("excludes drafts from the public listings list", async () => {
    await createBusiness(ownerCookie, { uen: "202400134L", listing: validListing });

    const res = await testApp.request("/api/listings");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ items: [] });
  });
});

describe("ownership and uniqueness are re-checked at the write boundary", () => {
  let ownerCookie: string;

  beforeAll(async () => {
    await signUp("Harry", "harry.biz@example.com");
    await verifyEmail("harry.biz@example.com");
    ownerCookie = await signIn("harry.biz@example.com");
    await signUp("Ida", "ida.biz@example.com");
    await verifyEmail("ida.biz@example.com");
    await signIn("ida.biz@example.com");
  });

  it("answers 409 when a Business is patched onto an existing UEN, leaving the row unchanged", async () => {
    await createBusiness(ownerCookie, { uen: "202400135M", listing: validListing });
    const second = businessCreationResponseSchema.parse(
      await (await createBusiness(ownerCookie, { uen: "202400136N", listing: validListing })).json()
    );

    const res = await testApp.request(`/api/businesses/${second.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: ownerCookie },
      body: JSON.stringify({ uen: "202400135M" }),
    });
    expect(res.status).toBe(409);

    const [row] = await db
      .select({ uen: business.uen })
      .from(business)
      .where(eq(business.id, second.id));
    expect(row.uen).toBe("202400136N");
  });

  it("denies the Listing write when ownership changes after the read, and leaves the row untouched", async () => {
    const biz = businessCreationResponseSchema.parse(
      await (await createBusiness(ownerCookie, { uen: "202400137P", listing: validListing })).json()
    );
    const takerId = (
      await db.select({ id: user.id }).from(user).where(eq(user.email, "ida.biz@example.com"))
    )[0].id;

    // Swap ownership on a separate connection and hold the row lock while the
    // handler's own transaction runs: its authorization read passes under the
    // old ownership, its FOR UPDATE parks on the lock, and after the commit
    // the write predicate is re-evaluated against the new owner.
    const swapClient = new Client({ connectionString: process.env.DATABASE_URL });
    await swapClient.connect();
    try {
      await swapClient.query("BEGIN");
      await swapClient.query("UPDATE business SET owner_id = $1 WHERE id = $2", [takerId, biz.id]);

      const patchPromise = testApp.request(`/api/businesses/${biz.id}/listing`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: ownerCookie },
        body: JSON.stringify({ priceRange: "$20-$40" }),
      });

      const deadline = Date.now() + 45_000;
      let blocked = false;
      while (Date.now() < deadline && !blocked) {
        const [row] = await sql<{ n: number }[]>`
            select count(*)::int as n from pg_stat_activity
            where wait_event_type = 'Lock' and query ilike 'select "id" from "business"%for update%'
          `;
        blocked = Boolean(row.n);
        if (!blocked) {
          await new Promise<void>(resolve => {
            setTimeout(resolve, 100);
          });
        }
      }
      expect(blocked, "handler FOR UPDATE never blocked on the ownership swap").toBe(true);

      await swapClient.query("COMMIT");
      const res = await patchPromise;
      expect(res.status).toBe(404);

      const [row] = await db
        .select({ priceRange: listing.priceRange })
        .from(listing)
        .where(eq(listing.businessId, biz.id));
      expect(row.priceRange).toBeNull();
    } finally {
      await swapClient.end();
    }
  }, 60_000);

  it("enforces payment option length in PostgreSQL, not only at the API boundary", async () => {
    const biz = businessCreationResponseSchema.parse(
      await (await createBusiness(ownerCookie, { uen: "202400138Q", listing: validListing })).json()
    );

    const tooLong = "x".repeat(33);
    await expect(
      sql`update "listing" set "payment_options" = array[${tooLong}] where "business_id" = ${biz.id}`
    ).rejects.toThrow(/payment_options_element_length_check/);

    const ok = "y".repeat(32);
    await sql`update "listing" set "payment_options" = array[${ok}] where "business_id" = ${biz.id}`;
    await expect(
      sql`update "listing" set "payment_options" = null where "business_id" = ${biz.id}`
    ).resolves.toBeDefined();
  });
});
