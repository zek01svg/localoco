# ADR-0006: Geocode at write time, persist coordinates

Status: Accepted

Date: 2026-08-18

## Context

Listings carry a free-text Singapore address and postal code, but no
location data. Product needs coordinates (map pins, proximity discovery),
and the address itself needs validation — typos and non-Singapore addresses
should be rejected at the point of entry, not discovered later. The chosen
provider is the Google Geocoding API, which bills per request and rate limits
at 3000 queries/minute with no default daily cap.

## Decision

1. **Geocode at write time only.** `POST /api/businesses` always resolves the
   listing address before inserting. `PATCH /api/businesses/:id/listing`
   re-geocodes only when `address` or `postalCode` is part of the update.
   Reads (`GET /api/listings`, owned-listing reads) never call the provider —
   they return stored coordinates.
2. **Coordinates live on the `listing` table** as nullable
   `latitude`/`longitude` (`double precision`). Rows written before this
   change render without a pin; the next edit that touches the address
   backfills them.
3. **Fail explicit, never fall back.** The write does not proceed without
   validated coordinates. Missing `GOOGLE_MAPS_API_KEY`, provider outage, or
   quota exhaustion → 503 `dependency_unavailable` (the request may be
   retried). Unresolvable or ambiguous address → 400 `invalid_request`. The
   user's address text is stored verbatim; Google's `formatted_address` is
   not persisted.
4. **Acceptance rule** (see `server/lib/geocoding/provider.ts`): the top
   candidate is accepted only when its `location_type` is ROOFTOP or
   RANGE_INTERPOLATED, its country component is SG, and `partial_match` is
   false. Anything else is classified `ambiguous`. The geocoder is
   constructed with `components=country:SG|postal_code:<postalCode>` so
   results are biased to Singapore from the start.
5. **The provider call happens before the database transaction**; address
   text and coordinates are written in the same INSERT/UPDATE, so a failed
   geocode never leaves a half-written listing.
6. **Keys are provisioned by Terraform** (`infra/maps.tf`): a server key
   restricted to the Geocoding API backend, injected directly into the Cloud
   Run environment, and a browser key restricted to the Maps JavaScript API
   and the `localoco.ciav.dev` referrer. The browser key stays dormant until
   a map UI exists. The daily cost cap is a Google Maps Platform console
   setting (Geocoding no longer exposes a Service Usage quota limit), with a
   Cloud Monitoring alert on geocoding request rate as the safety net.

## Consequences

- Listings written before this change have `null` Listing location and
  render without one until edited — accepted, since backfilling would require
  geocoding reads (forbidden).
- Address validation happens on the server, so the client can trust a 2xx
  means the address resolves to a street-level Singapore location.
- PATCH geocodes are extra paid requests; they are bounded because only
  address/postalCode edits trigger them.
- If the provider is down, listing writes fail loudly (503) instead of
  silently storing ungeocoded rows.
