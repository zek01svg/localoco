import type { Geocoder } from "./provider";
import type { Coordinates, GeocodeQuery } from "./types";

import { env } from "#server/env";

import { createGeocoder } from "./provider";
import { GeocodeError } from "./types";

export { createGeocoder } from "./provider";
export type { Geocoder, GeocoderDeps } from "./provider";
export { GeocodeError } from "./types";
export type { Coordinates, GeocodeFailureKind, GeocodeQuery } from "./types";

let geocoder: Geocoder | undefined;

/**
 * The app-wide geocoder. There is deliberately no fallback provider: a
 * missing key or an exhausted quota fails the write explicitly (503) instead
 * of silently skipping validation — provider trouble must never degrade
 * quietly into unvalidated addresses.
 */
export async function geocodeAddress(input: GeocodeQuery): Promise<Coordinates> {
  if (!env.GOOGLE_MAPS_API_KEY) {
    throw new GeocodeError(
      "provider_unavailable",
      "Address validation is not configured (GOOGLE_MAPS_API_KEY is missing)"
    );
  }
  geocoder ??= createGeocoder({ apiKey: env.GOOGLE_MAPS_API_KEY });
  return geocoder.geocodeAddress(input);
}
