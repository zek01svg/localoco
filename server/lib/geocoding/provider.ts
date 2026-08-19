import type { Coordinates, GeocodeQuery } from "./types";

import { z } from "zod/v4";

import { GeocodeError } from "./types";

const GEOCODING_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

// The Geocoding API response, validated at the trust boundary: only the
// fields consumed downstream are accepted, and anything unexpected is a
// classified invalid_response rather than a guess.
const geocodeResponseSchema = z.object({
  status: z.enum([
    "OK",
    "ZERO_RESULTS",
    "OVER_QUERY_LIMIT",
    "REQUEST_DENIED",
    "INVALID_REQUEST",
    "UNKNOWN_ERROR",
  ]),
  error_message: z.string().optional(),
  results: z
    .array(
      z.object({
        geometry: z.object({
          location: z.object({
            lat: z.number().refine(value => Number.isFinite(value) && Math.abs(value) <= 90, {
              message: "latitude out of range",
            }),
            lng: z.number().refine(value => Number.isFinite(value) && Math.abs(value) <= 180, {
              message: "longitude out of range",
            }),
          }),
          location_type: z.string().min(1),
        }),
        partial_match: z.boolean().optional().default(false),
        address_components: z
          .array(
            z.object({
              short_name: z.string().min(1),
              types: z.array(z.string().min(1)),
            })
          )
          .optional()
          .default([]),
      })
    )
    .max(5),
});

export interface GeocoderDeps {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface Geocoder {
  geocodeAddress(input: GeocodeQuery): Promise<Coordinates>;
}

// A pin is only precise enough to render if the provider placed it on the
// building itself (ROOFTOP) or interpolated it along the street
// (RANGE_INTERPOLATED). Centroid-level placements (GEOMETRIC_CENTER,
// APPROXIMATE) are classified ambiguous — the address could not be matched
// precisely.
const streetLevelLocationTypes = new Set(["ROOFTOP", "RANGE_INTERPOLATED"]);

export function createGeocoder(deps: GeocoderDeps): Geocoder {
  const baseUrl = deps.baseUrl ?? GEOCODING_ENDPOINT;
  const doFetch = deps.fetchImpl ?? fetch;

  return {
    async geocodeAddress({ address, postalCode }): Promise<Coordinates> {
      const params = new URLSearchParams({ address, key: deps.apiKey, language: "en" });
      // The postal code and country constraint keep results inside Singapore;
      // without it a partial address can resolve anywhere on the planet.
      params.set("components", postalCode ? `country:SG|postal_code:${postalCode}` : "country:SG");

      let response: Response;
      try {
        response = await doFetch(`${baseUrl}?${params.toString()}`, {
          headers: { accept: "application/json" },
        });
      } catch (cause) {
        throw new GeocodeError(
          "provider_unavailable",
          "The address validation provider is unreachable",
          { cause }
        );
      }

      if (!response.ok) {
        throw new GeocodeError(
          "provider_unavailable",
          `The address validation provider answered with HTTP ${response.status}`
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch (cause) {
        throw new GeocodeError(
          "invalid_response",
          "The address validation provider returned unparseable data",
          { cause }
        );
      }

      const parsed = geocodeResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new GeocodeError(
          "invalid_response",
          "The address validation provider returned an unexpected shape"
        );
      }

      switch (parsed.data.status) {
        case "OK":
          break;
        case "ZERO_RESULTS":
          throw new GeocodeError("not_found", "The address was not found");
        case "OVER_QUERY_LIMIT":
          throw new GeocodeError("quota_exhausted", "The address validation quota is exhausted");
        case "REQUEST_DENIED":
          throw new GeocodeError(
            "provider_unavailable",
            `The address validation provider denied the request${
              parsed.data.error_message ? `: ${parsed.data.error_message}` : ""
            }`
          );
        case "INVALID_REQUEST":
          throw new GeocodeError("invalid_response", "The address validation request was invalid");
        case "UNKNOWN_ERROR":
          throw new GeocodeError(
            "provider_unavailable",
            "The address validation provider reported an unknown error"
          );
      }

      if (parsed.data.results.length === 0) {
        throw new GeocodeError(
          "invalid_response",
          "The address validation provider returned no results for a successful status"
        );
      }
      const [candidate] = parsed.data.results;

      if (candidate.partial_match) {
        throw new GeocodeError("ambiguous", "The address matched only partially");
      }
      if (!streetLevelLocationTypes.has(candidate.geometry.location_type)) {
        throw new GeocodeError(
          "ambiguous",
          "The address could not be matched to a precise location"
        );
      }
      const country = candidate.address_components.find(component =>
        component.types.includes("country")
      );
      if (!country || country.short_name !== "SG") {
        throw new GeocodeError("ambiguous", "The address is not in Singapore");
      }

      return {
        latitude: candidate.geometry.location.lat,
        longitude: candidate.geometry.location.lng,
      };
    },
  };
}
