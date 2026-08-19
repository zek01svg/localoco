/**
 * @vitest-environment node
 */
import type { db as dbInstance } from "#server/lib/db";
import type { TestAppEnv } from "./auth-helpers";
import type { Context, Hono, Next } from "hono";

import { and, eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { business } from "#server/database/business";
import { businessHours } from "#server/database/business-hours";
import { emailDelivery } from "#server/database/email";
import { businessCreationResponseSchema } from "#shared/contracts/business";
import { errorEnvelopeSchema } from "#shared/contracts/error";

import {
  createTestHonoApp,
  extractSessionCookie,
  registerUser,
  startPostgresContainer,
} from "./auth-helpers";

import { randomUUID } from "node:crypto";

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

const patchHours = (businessId: string, cookie: string, hours: unknown) =>
  testApp.request(`/api/businesses/${businessId}/listing`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ hours }),
  });

const getListing = (businessId: string, cookie: string) =>
  testApp.request(`/api/businesses/${businessId}/listing`, {
    headers: { cookie },
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

const validListing = {
  name: "Mama Lorong Makan",
  category: "Food & Beverage",
  address: "1 Lorong Makan",
  postalCode: "123456",
};

const timed = (day: number, openTime: string, closeTime: string) => ({
  day,
  is24h: false,
  openTime,
  closeTime,
});

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

describe("storing opening hours through the owner Listing API", () => {
  let ownerCookie: string;
  let bizId: string;

  beforeAll(async () => {
    await signUp("Maya", "maya.hours@example.com");
    await verifyEmail("maya.hours@example.com");
    ownerCookie = await signIn("maya.hours@example.com");

    const created = await createBusiness(ownerCookie, {
      uen: "202400201A",
      listing: validListing,
    });
    if (created.status !== 201) {
      throw new Error(`setup failed: expected 201, got ${created.status}`);
    }
    bizId = businessCreationResponseSchema.parse(await created.json()).id;
  });

  it("reports an empty schedule for a Business with no recorded hours", async () => {
    const res = await getListing(bizId, ownerCookie);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ hours: [] });
  });

  it("stores and returns a full week including 24-hour and overnight days", async () => {
    const hours = [
      timed(0, "07:00", "19:00"),
      { day: 1, is24h: true },
      timed(2, "18:00", "02:00"), // overnight: spills into Wednesday morning
      timed(3, "09:00", "18:00"),
      timed(4, "09:00", "18:00"),
      timed(5, "10:00", "16:00"),
      timed(6, "18:00", "02:00"), // overnight: spills into Monday 00:00-02:00
    ];

    const res = await patchHours(bizId, ownerCookie, hours);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ hours });

    const stored = await db
      .select({
        day: businessHours.day,
        is24h: businessHours.is24h,
        openMinute: businessHours.openMinute,
        closeMinute: businessHours.closeMinute,
      })
      .from(businessHours)
      .where(eq(businessHours.businessId, bizId))
      .orderBy(businessHours.day);
    expect(stored).toEqual([
      { day: 0, is24h: false, openMinute: 420, closeMinute: 1140 },
      { day: 1, is24h: true, openMinute: null, closeMinute: null },
      { day: 2, is24h: false, openMinute: 1080, closeMinute: 120 },
      { day: 3, is24h: false, openMinute: 540, closeMinute: 1080 },
      { day: 4, is24h: false, openMinute: 540, closeMinute: 1080 },
      { day: 5, is24h: false, openMinute: 600, closeMinute: 960 },
      { day: 6, is24h: false, openMinute: 1080, closeMinute: 120 },
    ]);
  });

  it("replaces the whole schedule on a subsequent PATCH", async () => {
    const res = await patchHours(bizId, ownerCookie, [timed(0, "08:00", "20:00")]);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ hours: [timed(0, "08:00", "20:00")] });

    expect(await db.$count(businessHours, eq(businessHours.businessId, bizId))).toBe(1);
  });

  it("lets a Business close a previously set day by clearing the whole schedule", async () => {
    await patchHours(bizId, ownerCookie, [timed(0, "08:00", "20:00")]);

    const res = await patchHours(bizId, ownerCookie, []);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ hours: [] });

    expect(await db.$count(businessHours, eq(businessHours.businessId, bizId))).toBe(0);
  });

  it("changes hours without touching Listing fields", async () => {
    const res = await patchHours(bizId, ownerCookie, [timed(1, "09:00", "17:00")]);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      name: validListing.name,
      hours: [timed(1, "09:00", "17:00")],
    });
  });

  it("stores two adjacent overnight days with disjoint coverage", async () => {
    // Monday 18:00-02:00 spills into Tuesday [00:00, 02:00); Tuesday's own
    // coverage is [23:00, 24:00), so the schedule is valid end to end.
    const hours = [timed(0, "18:00", "02:00"), timed(1, "23:00", "01:00")];
    const res = await patchHours(bizId, ownerCookie, hours);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ hours });
  });
});

describe("rejecting invalid schedules at the API boundary", () => {
  let ownerCookie: string;
  let bizId: string;

  beforeAll(async () => {
    await signUp("Nadia", "nadia.hours@example.com");
    await verifyEmail("nadia.hours@example.com");
    ownerCookie = await signIn("nadia.hours@example.com");

    const created = await createBusiness(ownerCookie, {
      uen: "202400202B",
      listing: validListing,
    });
    if (created.status !== 201) {
      throw new Error(`setup failed: expected 201, got ${created.status}`);
    }
    bizId = businessCreationResponseSchema.parse(await created.json()).id;
  });

  it("rejects duplicate day rows with 400", async () => {
    const res = await patchHours(bizId, ownerCookie, [
      timed(0, "09:00", "18:00"),
      timed(0, "10:00", "16:00"),
    ]);
    expect(res.status).toBe(400);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("invalid_request");
  });

  it("rejects an overnight interval overlapping the next day with 400", async () => {
    const res = await patchHours(bizId, ownerCookie, [
      timed(0, "18:00", "02:00"),
      timed(1, "01:00", "10:00"),
    ]);
    expect(res.status).toBe(400);
  });

  it("rejects a 24-hour day preceded by an overnight day with 400", async () => {
    const res = await patchHours(bizId, ownerCookie, [
      timed(0, "18:00", "02:00"),
      { day: 1, is24h: true },
    ]);
    expect(res.status).toBe(400);
  });

  it("rejects a zero-length interval with 400", async () => {
    const res = await patchHours(bizId, ownerCookie, [timed(0, "18:00", "18:00")]);
    expect(res.status).toBe(400);
  });

  it("rejects malformed times and out-of-range days with 400", async () => {
    expect(
      (
        await patchHours(bizId, ownerCookie, [
          { day: 0, is24h: false, openTime: "24:00", closeTime: "18:00" },
        ])
      ).status
    ).toBe(400);
    expect((await patchHours(bizId, ownerCookie, [timed(7, "09:00", "18:00")])).status).toBe(400);
  });

  it("leaves the stored schedule untouched after a rejected PATCH", async () => {
    await patchHours(bizId, ownerCookie, [timed(2, "09:00", "17:00")]);
    const res = await patchHours(bizId, ownerCookie, [
      timed(2, "09:00", "17:00"),
      timed(2, "18:00", "20:00"),
    ]);
    expect(res.status).toBe(400);

    const listingRes = await getListing(bizId, ownerCookie);
    await expect(listingRes.json()).resolves.toMatchObject({ hours: [timed(2, "09:00", "17:00")] });
  });
});

describe("the database enforces the schedule invariants", () => {
  let ownerCookie: string;
  let bizId: string;

  beforeAll(async () => {
    await signUp("Omar", "omar.hours@example.com");
    await verifyEmail("omar.hours@example.com");
    ownerCookie = await signIn("omar.hours@example.com");

    const created = await createBusiness(ownerCookie, {
      uen: "202400203C",
      listing: validListing,
    });
    if (created.status !== 201) {
      throw new Error(`setup failed: expected 201, got ${created.status}`);
    }
    bizId = businessCreationResponseSchema.parse(await created.json()).id;
  });

  it("rejects a duplicate day row with a unique violation", async () => {
    await sql`insert into business_hours (id, business_id, day, is_24h, open_minute, close_minute)
      values (${randomUUID()}, ${bizId}, 0, false, 540, 1080)`;
    await expect(
      sql`insert into business_hours (id, business_id, day, is_24h, open_minute, close_minute)
        values (${randomUUID()}, ${bizId}, 0, false, 600, 960)`
    ).rejects.toThrow(/business_hours_business_day_unique/);
  });

  it("rejects an overnight spill into the next day's coverage", async () => {
    await expect(
      sql`insert into business_hours (id, business_id, day, is_24h, open_minute, close_minute) values
        (${randomUUID()}, ${bizId}, 3, false, 1080, 120),
        (${randomUUID()}, ${bizId}, 4, false, 60, 600)`
    ).rejects.toThrow(/business_hours_overlap_check/);
  });

  it("rejects an overnight spill into a 24-hour day", async () => {
    await sql`insert into business_hours (id, business_id, day, is_24h, open_minute, close_minute)
      values (${randomUUID()}, ${bizId}, 5, false, 1080, 120)`;
    await expect(
      sql`insert into business_hours (id, business_id, day, is_24h, open_minute, close_minute)
        values (${randomUUID()}, ${bizId}, 6, true, null, null)`
    ).rejects.toThrow(/business_hours_overlap_check/);
  });

  it("fires the overlap trigger on UPDATE as well as INSERT", async () => {
    // A day 1 row opens at 10:00 and closes at 18:00.
    await sql`insert into business_hours (id, business_id, day, is_24h, open_minute, close_minute)
      values (${randomUUID()}, ${bizId}, 1, false, 600, 1080)`;
    // Turn day 0 into an overnight interval (18:00-02:00); its spill into
    // day 1 is empty against day 1's current 10:00-18:00 coverage.
    await sql`update business_hours set open_minute = 1080, close_minute = 120
      where business_id = ${bizId} and day = 0`;
    // Moving day 1's open to 01:00 reaches into that spill: the UPDATE must
    // be rejected and the row left untouched.
    await expect(
      sql`update business_hours set open_minute = 60, close_minute = 600 where business_id = ${bizId} and day = 1`
    ).rejects.toThrow(/business_hours_overlap_check/);
    const [row] = await db
      .select({ openMinute: businessHours.openMinute, closeMinute: businessHours.closeMinute })
      .from(businessHours)
      .where(and(eq(businessHours.businessId, bizId), eq(businessHours.day, 1)));
    expect(row).toMatchObject({ openMinute: 600, closeMinute: 1080 });
  });

  it("rejects a 24-hour row carrying times", async () => {
    await expect(
      sql`insert into business_hours (id, business_id, day, is_24h, open_minute, close_minute)
        values (${randomUUID()}, ${bizId}, 2, true, 0, 1439)`
    ).rejects.toThrow(/business_hours_shape_check/);
  });

  it("rejects minutes outside 0..1439 and days outside 0..6", async () => {
    await expect(
      sql`insert into business_hours (id, business_id, day, is_24h, open_minute, close_minute)
        values (${randomUUID()}, ${bizId}, 2, false, -1, 100)`
    ).rejects.toThrow(/business_hours_minute_range_check/);
    await expect(
      sql`insert into business_hours (id, business_id, day, is_24h, open_minute, close_minute)
        values (${randomUUID()}, ${bizId}, 7, false, 100, 200)`
    ).rejects.toThrow(/business_hours_day_range_check/);
  });

  it("deletes a Business's hours with the Business (cascade)", async () => {
    expect(await db.$count(businessHours, eq(businessHours.businessId, bizId))).toBeGreaterThan(0);

    await sql`delete from business where id = ${bizId}`;
    expect(await db.$count(businessHours, eq(businessHours.businessId, bizId))).toBe(0);
  });

  it("does not leak another owner's Business id through hours rows", async () => {
    const [other] = await db
      .select({ id: business.id })
      .from(business)
      .where(eq(business.uen, "202400202B"));
    expect(other).toBeTruthy();
    const res = await testApp.request(`/api/businesses/${other.id}/listing`, {
      headers: { cookie: ownerCookie },
    });
    expect(res.status).toBe(404);
  });
});
