import type { IncomingMessage, ServerResponse } from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import { createGeocoder } from "#server/lib/geocoding";

import { createServer } from "node:http";

type FakeHandler = (url: string) => { status: number; body: unknown };

const servers: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => server.close()));
});

// A local fake of the Geocoding API over real HTTP: the provider is exercised
// end to end (URL construction, query parameters, parsing, classification)
// without any external network.
const startFakeGeocoder = (handler: FakeHandler): Promise<string> =>
  new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const { status, body } = handler(req.url ?? "");
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        servers.push({
          close: () =>
            new Promise(res =>
              server.close(() => {
                res();
              })
            ),
        });
        resolve(`http://127.0.0.1:${address.port}`);
      } else {
        reject(new Error("fake geocoder did not bind a port"));
      }
    });
  });

const okResult = {
  geometry: {
    location: { lat: 1.2956, lng: 103.7764 },
    location_type: "ROOFTOP",
  },
  partial_match: false,
  address_components: [{ short_name: "SG", types: ["country", "political"] }],
};

const geocodeResponse = (status: string, results: unknown[]) => ({ status, results });

describe("geocoding provider - contract against a local fake", () => {
  it("geocodes a valid address and builds the expected query", async () => {
    const baseUrl = await startFakeGeocoder(url => {
      expect(url).toContain("address=1+Boon+Lay+Drive");
      expect(url).toContain("components=country%3ASG%7Cpostal_code%3A640001");
      expect(url).toContain("key=test-key");
      return { status: 200, body: geocodeResponse("OK", [okResult]) };
    });

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(
      geocoder.geocodeAddress({ address: "1 Boon Lay Drive", postalCode: "640001" })
    ).resolves.toEqual({ latitude: 1.2956, longitude: 103.7764 });
  });

  it("falls back to a country-only constraint when no postal code is given", async () => {
    const baseUrl = await startFakeGeocoder(url => {
      expect(url).toContain("components=country%3ASG");
      expect(url).not.toContain("postal_code");
      return { status: 200, body: geocodeResponse("OK", [okResult]) };
    });

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(geocoder.geocodeAddress({ address: "Orchard Road" })).resolves.toEqual({
      latitude: 1.2956,
      longitude: 103.7764,
    });
  });

  it("accepts a RANGE_INTERPOLATED street-level placement", async () => {
    const baseUrl = await startFakeGeocoder(() => ({
      status: 200,
      body: geocodeResponse("OK", [
        {
          ...okResult,
          geometry: { location: { lat: 1.3, lng: 103.8 }, location_type: "RANGE_INTERPOLATED" },
        },
      ]),
    }));

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(geocoder.geocodeAddress({ address: "1 Orchard Road" })).resolves.toEqual({
      latitude: 1.3,
      longitude: 103.8,
    });
  });

  it("classifies ZERO_RESULTS as not_found", async () => {
    const baseUrl = await startFakeGeocoder(() => ({
      status: 200,
      body: geocodeResponse("ZERO_RESULTS", []),
    }));

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(geocoder.geocodeAddress({ address: "Not A Real Address" })).rejects.toMatchObject({
      kind: "not_found",
    });
  });

  it("classifies a partial match as ambiguous", async () => {
    const baseUrl = await startFakeGeocoder(() => ({
      status: 200,
      body: geocodeResponse("OK", [{ ...okResult, partial_match: true }]),
    }));

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(geocoder.geocodeAddress({ address: "1 Boon Lay" })).rejects.toMatchObject({
      kind: "ambiguous",
    });
  });

  it("classifies a centroid-level placement as ambiguous", async () => {
    const baseUrl = await startFakeGeocoder(() => ({
      status: 200,
      body: geocodeResponse("OK", [
        {
          ...okResult,
          geometry: {
            location: { lat: 1.3, lng: 103.8 },
            location_type: "GEOMETRIC_CENTER",
          },
        },
      ]),
    }));

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(geocoder.geocodeAddress({ address: "Singapore" })).rejects.toMatchObject({
      kind: "ambiguous",
    });
  });

  it("classifies a result outside Singapore as ambiguous", async () => {
    const baseUrl = await startFakeGeocoder(() => ({
      status: 200,
      body: geocodeResponse("OK", [
        {
          ...okResult,
          address_components: [{ short_name: "MY", types: ["country", "political"] }],
        },
      ]),
    }));

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(geocoder.geocodeAddress({ address: "Jalan Bukit Bintang" })).rejects.toMatchObject(
      { kind: "ambiguous" }
    );
  });

  it("classifies OVER_QUERY_LIMIT as quota exhaustion", async () => {
    const baseUrl = await startFakeGeocoder(() => ({
      status: 200,
      body: geocodeResponse("OVER_QUERY_LIMIT", []),
    }));

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(geocoder.geocodeAddress({ address: "1 Boon Lay Drive" })).rejects.toMatchObject({
      kind: "quota_exhausted",
    });
  });

  it("classifies REQUEST_DENIED as provider unavailability", async () => {
    const baseUrl = await startFakeGeocoder(() => ({
      status: 200,
      body: geocodeResponse("REQUEST_DENIED", []),
    }));

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(geocoder.geocodeAddress({ address: "1 Boon Lay Drive" })).rejects.toMatchObject({
      kind: "provider_unavailable",
    });
  });

  it("classifies INVALID_REQUEST as an invalid response", async () => {
    const baseUrl = await startFakeGeocoder(() => ({
      status: 200,
      body: geocodeResponse("INVALID_REQUEST", []),
    }));

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(geocoder.geocodeAddress({ address: "1 Boon Lay Drive" })).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });

  it("classifies an HTTP error status as provider unavailability", async () => {
    const baseUrl = await startFakeGeocoder(() => ({ status: 500, body: {} }));

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(geocoder.geocodeAddress({ address: "1 Boon Lay Drive" })).rejects.toMatchObject({
      kind: "provider_unavailable",
    });
  });

  it("classifies a network failure as provider unavailability", async () => {
    const geocoder = createGeocoder({
      apiKey: "test-key",
      baseUrl: "http://127.0.0.1:1/geocode", // nothing listens here
    });
    await expect(geocoder.geocodeAddress({ address: "1 Boon Lay Drive" })).rejects.toMatchObject({
      kind: "provider_unavailable",
    });
  });

  it("classifies a malformed body as an invalid response", async () => {
    const baseUrl = await startFakeGeocoder(() => ({ status: 200, body: { not: "geocode" } }));

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(geocoder.geocodeAddress({ address: "1 Boon Lay Drive" })).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });

  it("classifies a successful status with no results as an invalid response", async () => {
    const baseUrl = await startFakeGeocoder(() => ({
      status: 200,
      body: geocodeResponse("OK", []),
    }));

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(geocoder.geocodeAddress({ address: "1 Boon Lay Drive" })).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });

  it("classifies out-of-range coordinates as an invalid response", async () => {
    const baseUrl = await startFakeGeocoder(() => ({
      status: 200,
      body: geocodeResponse("OK", [
        { ...okResult, geometry: { location: { lat: 95, lng: 103.8 }, location_type: "ROOFTOP" } },
      ]),
    }));

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(geocoder.geocodeAddress({ address: "1 Boon Lay Drive" })).rejects.toMatchObject({
      kind: "invalid_response",
    });
  });
});

describe("geocoding provider - failure classification carries a message and cause", () => {
  it("throws GeocodeError instances with a readable message", async () => {
    const baseUrl = await startFakeGeocoder(() => ({
      status: 200,
      body: geocodeResponse("ZERO_RESULTS", []),
    }));

    const geocoder = createGeocoder({ apiKey: "test-key", baseUrl });
    await expect(geocoder.geocodeAddress({ address: "Nowhere" })).rejects.toMatchObject({
      name: "GeocodeError",
      message: "The address was not found",
    });
  });
});
