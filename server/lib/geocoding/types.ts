/**
 * Typed outcomes of address validation, classified at the provider trust
 * boundary. Every failure the provider can produce is one of these kinds;
 * callers map them to HTTP responses without inspecting provider internals.
 */
export type GeocodeFailureKind =
  | "not_found"
  | "ambiguous"
  | "quota_exhausted"
  | "provider_unavailable"
  | "invalid_response";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** The free-text address and optional postal code that gets resolved. */
export interface GeocodeQuery {
  address: string;
  postalCode?: string;
}

export class GeocodeError extends Error {
  readonly kind: GeocodeFailureKind;

  constructor(kind: GeocodeFailureKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "GeocodeError";
    this.kind = kind;
  }
}
