/**
 * @vitest-environment node
 */
import type { db as dbInstance } from "#server/lib/db";
import type { GeocodeError as GeocodeErrorType, GeocodeQuery } from "#server/lib/geocoding";
import type { TestAppEnv } from "./auth-helpers";
import type { Context, Hono, Next } from "hono";

import { eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { emailDelivery } from "#server/database/email";
import { businessCreationResponseSchema } from "#shared/contracts/business";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import { listingsResponseSchema, ownerListingSchema } from "#shared/contracts/listings";

import {
  createTestHonoApp,
  extractSessionCookie,
  registerUser,
  startPostgresContainer,
} from "./auth-helpers";

// NOTE: nothing from #server/lib/geocoding may be imported statically here —
// the mock factory evaluates the real module through importOriginal, and a
// static import would snapshot #server/env before beforeAll sets
// DATABASE_URL. GeocodeError is therefore resolved dynamically, after env.
let GeocodeErrorClass: typeof GeocodeErrorType;

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
  mockGeocodeAddress:
    vi.fn<(_input: GeocodeQuery) => Promise<{ latitude: number; longitude: number }>>(),
}));

vi.mock("#server/lib/geocoding", async importOriginal => {
  const original = await importOriginal<typeof import("#server/lib/geocoding")>();
  return {
    ...original,
    geocodeAddress: (input: GeocodeQuery) => mockGeocodeAddress(input),
  };
});

let container: Awaited<ReturnType<typeof startPostgresContainer>>["container"];
let sql: ReturnType<typeof postgres>;
let testApp: Hono<TestAppEnv>;
let db: typeof dbInstance;

const PASSWORD = "Password123!";
const ORIGIN = "http://localhost:4000";

const COORDS = { latitude: 1.2956, longitude: 103.7764 };
const MOVED_COORDS = { latitude: 1.3521, longitude: 103.8198 };

const validListing = {
  name: "Ah Kow Kopitiam",
  category: "Food & Beverage",
  address: "1 Example Street #01-01",
  postalCode: "123456",
};

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

beforeAll(async () => {
  const started = await startPostgresContainer();
  container = started.container;
  sql = postgres(started.databaseUrl, { max: 2 });

  process.env.DATABASE_URL = started.databaseUrl;
  process.env.BETTER_AUTH_SECRET = "super-secret-test-key-32-chars-long!!";
  process.env.NODE_ENV = "test";
  process.env.VITE_APP_URL = ORIGIN;

  GeocodeErrorClass = (await import("#server/lib/geocoding")).GeocodeError;

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

describe("address validation on Business writes", () => {
  let aliceCookie: string;

  beforeAll(async () => {
    await signUp("Alice", "alice.geo@example.com");
    await verifyEmail("alice.geo@example.com");
    aliceCookie = await signIn("alice.geo@example.com");
  });

  beforeEach(() => {
    mockGeocodeAddress.mockReset().mockResolvedValue(COORDS);
  });

  const createWithUen = async (uen: string) =>
    businessCreationResponseSchema.parse(
      await (await createBusiness(aliceCookie, { uen, listing: validListing })).json()
    );

  it("validates the address server-side and persists coordinates in the same write", async () => {
    const { id } = await createWithUen("202400131A");

    expect(mockGeocodeAddress).toHaveBeenCalledWith({
      address: "1 Example Street #01-01",
      postalCode: "123456",
    });

    const [row] = await sql<
      Array<{ address: string; latitude: number | null; longitude: number | null }>
    >`
      select address, latitude, longitude from listing where business_id = ${id}
    `;
    expect(row).toMatchObject({ address: "1 Example Street #01-01", ...COORDS });
  });

  it("rejects coordinates submitted by the client; they are never stored", async () => {
    const res = await createBusiness(aliceCookie, {
      uen: "202400132B",
      listing: { ...validListing, latitude: 9.9, longitude: 9.9 },
    });
    expect(res.status).toBe(201);

    const [row] = await sql<Array<{ latitude: number | null }>>`
      select latitude from listing
      join business on business.id = listing.business_id
      where business.uen = '202400132B'
    `;
    expect(row.latitude).toBe(COORDS.latitude);
  });

  it("answers 409 for a duplicate UEN without calling the provider", async () => {
    await createWithUen("202400130A");
    mockGeocodeAddress.mockClear();

    const res = await createBusiness(aliceCookie, { uen: "202400130A", listing: validListing });
    expect(res.status).toBe(409);

    expect(mockGeocodeAddress).not.toHaveBeenCalled();
  });

  it("re-geocodes when the address changes on a listing update", async () => {
    const { id } = await createWithUen("202400133C");
    mockGeocodeAddress.mockReset().mockResolvedValue(MOVED_COORDS);

    const res = await testApp.request(`/api/businesses/${id}/listing`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: aliceCookie },
      body: JSON.stringify({ address: "2 New Street #02-02" }),
    });
    expect(res.status).toBe(200);

    expect(mockGeocodeAddress).toHaveBeenCalledWith({
      address: "2 New Street #02-02",
      postalCode: "123456", // the unchanged current value is used
    });

    const [row] = await sql<Array<{ latitude: number | null; longitude: number | null }>>`
      select latitude, longitude from listing where business_id = ${id}
    `;
    expect(row).toMatchObject(MOVED_COORDS);
  });

  it("re-geocodes when only the postal code changes", async () => {
    const { id } = await createWithUen("202400134D");

    const res = await testApp.request(`/api/businesses/${id}/listing`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: aliceCookie },
      body: JSON.stringify({ postalCode: "654321" }),
    });
    expect(res.status).toBe(200);

    expect(mockGeocodeAddress).toHaveBeenCalledWith({
      address: "1 Example Street #01-01",
      postalCode: "654321",
    });
  });

  it("never calls the provider for an update without address or postal code", async () => {
    const { id } = await createWithUen("202400135E");
    mockGeocodeAddress.mockClear();

    const res = await testApp.request(`/api/businesses/${id}/listing`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: aliceCookie },
      body: JSON.stringify({ phone: "+65 9000 0000" }),
    });
    expect(res.status).toBe(200);

    expect(mockGeocodeAddress).not.toHaveBeenCalled();
  });

  it("never calls the provider for a UEN-only business update", async () => {
    const { id } = await createWithUen("202400136F");
    mockGeocodeAddress.mockClear();

    const res = await testApp.request(`/api/businesses/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: aliceCookie },
      body: JSON.stringify({ uen: "202400136G" }),
    });
    expect(res.status).toBe(200);

    expect(mockGeocodeAddress).not.toHaveBeenCalled();
  });

  it("answers 503 dependency_unavailable and leaves the row untouched when the quota is exhausted", async () => {
    const { id } = await createWithUen("202400137H");
    mockGeocodeAddress.mockRejectedValue(
      new GeocodeErrorClass("quota_exhausted", "The address validation quota is exhausted")
    );

    const res = await testApp.request(`/api/businesses/${id}/listing`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: aliceCookie },
      body: JSON.stringify({ address: "3 Third Street" }),
    });
    expect(res.status).toBe(503);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("dependency_unavailable");
    expect(body.error.details).toMatchObject({ reason: "quota_exhausted" });

    const [row] = await sql<Array<{ address: string }>>`
      select address from listing where business_id = ${id}
    `;
    expect(row.address).toBe("1 Example Street #01-01");
  });

  it("answers 400 invalid_request and leaves the row untouched when the address is ambiguous", async () => {
    const { id } = await createWithUen("202400138I");
    mockGeocodeAddress.mockRejectedValue(
      new GeocodeErrorClass("ambiguous", "The address matched only partially")
    );

    const res = await testApp.request(`/api/businesses/${id}/listing`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: aliceCookie },
      body: JSON.stringify({ address: "Somewhere" }),
    });
    expect(res.status).toBe(400);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("invalid_request");
    expect(body.error.details).toMatchObject({ reason: "ambiguous" });

    const [row] = await sql<Array<{ address: string }>>`
      select address from listing where business_id = ${id}
    `;
    expect(row.address).toBe("1 Example Street #01-01");
  });

  it("fails creation with 503 and stores nothing when the provider is unavailable", async () => {
    mockGeocodeAddress.mockRejectedValue(
      new GeocodeErrorClass(
        "provider_unavailable",
        "The address validation provider is unreachable"
      )
    );

    const res = await createBusiness(aliceCookie, { uen: "202400139J", listing: validListing });
    expect(res.status).toBe(503);
    const body = errorEnvelopeSchema.parse(await res.json());
    expect(body.error.code).toBe("dependency_unavailable");
    expect(body.error.details).toMatchObject({ reason: "provider_unavailable" });

    const [biz] = await sql<Array<{ id: string }>>`
      select business.id from business where business.uen = '202400139J'
    `;
    expect(biz).toBeUndefined();
  });

  it("returns stored coordinates from the public listings feed without geocoding", async () => {
    const { id } = await createWithUen("202400140K");
    await sql`update listing set status = 'published' where business_id = ${id}`;

    const res = await testApp.request("/api/listings");
    expect(res.status).toBe(200);
    const body = listingsResponseSchema.parse(await res.json());
    const item = body.items.find(candidate => candidate.address === "1 Example Street #01-01");
    expect(item).toMatchObject(COORDS);
  });

  it("returns stored coordinates on the owned listing endpoint", async () => {
    const { id } = await createWithUen("202400141L");

    const res = await testApp.request(`/api/businesses/${id}/listing`, {
      headers: { cookie: aliceCookie },
    });
    expect(res.status).toBe(200);
    const body = ownerListingSchema.parse(await res.json());
    expect(body).toMatchObject(COORDS);
  });
});
