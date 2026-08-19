# API Reference & Documentation

This document describes the API architecture, route definitions, OpenAPI specification generation, authentication endpoints, and error handling conventions used in the **React + Hono Template**.

---

## 1. Interactive API Reference & OpenAPI

The backend features automated OpenAPI specification generation via `hono-openapi` and interactive documentation rendering via **Scalar**.

- **Scalar Interactive API UI**: Available at [http://localhost:4001/api/scalar](http://localhost:4001/api/scalar).
- **OpenAPI 3.1 JSON Spec**: Available at `GET http://localhost:4001/api/openapi`.

Both endpoints are mounted **only outside production** (`NODE_ENV !== "production"`); in production they answer the standard `not_found` envelope.

### Adding OpenAPI Annotations to Routes

Document new routes with `describeRoute` (hono-openapi). Every operation on the versioned surface (`/api/*`) must be documented.

```typescript
import { describeRoute } from "hono-openapi";

app.get(
  "/api/example",
  describeRoute({
    description: "Get example resource",
    responses: {
      200: {
        description: "Returns example payload",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string", example: "Hello World" },
              },
            },
          },
        },
      },
    },
  }),
  c => c.json({ message: "Hello World" })
);
```

---

## 2. Core System Endpoints

### Health Check (`GET /health`)

Verifies server liveness and container health status.

- **URL**: `/health`
- **Method**: `GET`
- **Response `200 OK`**:
  ```json
  {
    "status": "ok"
  }
  ```

### Runtime Environment Injector (`GET /api/runtime.js`)

Serves dynamic JavaScript containing server-filtered `VITE_` environment variables to the browser client.

- **URL**: `/api/runtime.js`
- **Method**: `GET`
- **Content-Type**: `application/javascript`
- **Response `200 OK`**:
  ```javascript
  window.__env = {
    VITE_APP_URL: "http://localhost:4000",
  };
  ```

---

## 3. Listings

### List listings (`GET /api/listings`)

Returns a page of **published** listings ordered by `id` ascending, using
keyset pagination. Draft and moderated listings are never returned here; they
are only visible to their owner (see `GET /api/businesses/:id/listing`).

Query parameters:

| Name       | Type     | Default | Description                                                                                                                                |
| :--------- | :------- | :------ | :----------------------------------------------------------------------------------------------------------------------------------------- |
| `limit`    | `int`    | `20`    | Page size, between 1 and 100                                                                                                               |
| `cursor`   | `string` | —       | Opaque `id` of the last listing on the previous page                                                                                       |
| `q`        | `string` | —       | Text search matched against name, category, and address (see below)                                                                        |
| `category` | `string` | —       | Exact match on the listing's category; `GET /api/listings/categories` lists the values that exist (any other value simply matches nothing) |
| `openNow`  | `bool`   | —       | When `"true"`, filters to Businesses whose opening hours cover the current instant in Singapore time (UTC+8)                               |
| `north`    | `float`  | —       | Maximum latitude bound (-90 to 90); required when filtering by viewport                                                                    |
| `south`    | `float`  | —       | Minimum latitude bound (-90 to 90); required when filtering by viewport                                                                    |
| `east`     | `float`  | —       | Maximum longitude bound (-180 to 180); required when filtering by viewport                                                                 |
| `west`     | `float`  | —       | Minimum longitude bound (-180 to 180); required when filtering by viewport                                                                 |

When filtering by map viewport, `north`, `south`, `east`, and `west` must all
four be supplied together and satisfy `south <= north`. Viewport filtering is
applied server-side against stored coordinates (`latitude`, `longitude`)
before cursor pagination and composes directly with `q`, `category`, and `openNow` filters.
Rows with `null` coordinates are excluded from bounded queries.

Search and open-now are filters, never ranking signals: `q` is trimmed, case-folded, and
whitespace-collapsed, and the same normalization is applied to the stored
name, category, address, and description before a substring match, so minor case or
formatting differences never hide a Listing. LIKE wildcards in `q` are
treated as literals. `openNow` is evaluated server-side against stored
`business_hours` in Singapore wall-clock time before pagination, correctly
handling 24-hour schedules, daytime intervals, and overnight windows across
midnight. Businesses with no recorded hours evaluate to closed. Ordering stays
`id` ascending regardless of filters, so pages remain deterministic.

- **Response `200 OK`** — `application/json`:

  ```json
  {
    "items": [
      {
        "id": "1",
        "name": "Business 1",
        "category": "Food & Beverage",
        "description": "Artisanal sourdough bakery.",
        "address": "1 Example Street #01",
        "postalCode": "123456",
        "phone": "61234567",
        "email": "hello@example.com",
        "website": "https://example.com",
        "paymentOptions": ["PayNow", "Visa"],
        "priceRange": "$10-$30",
        "latitude": 1.29027,
        "longitude": 103.851959
      }
    ],
    "nextCursor": "1"
  }
  ```

  The optional contact fields (`description`, `phone`, `email`, `website`, `paymentOptions`,
  `priceRange`) are `null` when the business never set them. `latitude` and
  `longitude` are the street-level coordinates resolved at listing write time
  (see ADR-0006) and are `null` for listings written before that change —
  reads never trigger geocoding.

  `nextCursor` is `null` on the final page. The server fetches `limit + 1` rows to detect a following page, so no empty trailing page is ever returned. A search that matches nothing is an honest `200` with an empty `items` array — never an error.

- **Response `400`**: query parameters failed validation (`invalid_request`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).
- **Response `503`**: the data source failed or returned rows that violate the contract (`dependency_unavailable`). A dependency failure is never reported as a success or an empty collection.

### Get listing detail (`GET /api/listings/:id`)

Returns the complete public details of a single **published** listing, including
business identification (`id`, `businessId`, `uen`), address, contact options,
opening hours schedule, and active listing photos. Draft, pending review, rejected,
and suspended listings return `404 not_found`.

- **Response `200 OK`** — `application/json`:

  ```json
  {
    "id": "lst_1",
    "businessId": "biz_1",
    "uen": "202400123A",
    "name": "Corner Kopitiam",
    "category": "Food & Beverage",
    "description": "Artisanal coffee and local breakfast favorites.",
    "address": "1 Boon Lay Drive",
    "postalCode": "649902",
    "latitude": 1.29027,
    "longitude": 103.851959,
    "phone": "+65 6123 4567",
    "email": "hello@cornerkopitiam.sg",
    "website": "https://cornerkopitiam.sg",
    "paymentOptions": ["Cash", "PayNow", "NETS"],
    "priceRange": "$$ ($10–$30)",
    "hours": [
      { "day": 0, "is24h": false, "openTime": "07:00", "closeTime": "19:00" },
      { "day": 1, "is24h": true }
    ],
    "photos": [
      {
        "id": "med_1",
        "contentType": "image/jpeg",
        "size": 123456,
        "url": "/api/media/med_1"
      }
    ]
  }
  ```

- **Response `400`**: invalid listing ID (`invalid_request`).
- **Response `404`**: listing not found or not published (`not_found`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).
- **Response `503`**: the data source failed (`dependency_unavailable`).

### List listing categories (`GET /api/listings/categories`)

Returns the distinct categories of **published** listings, ordered ascending.
These are the intended values for the `category` filter; an unknown value
simply matches nothing. Categories that only exist on unpublished listings
never appear here.

- **Response `200 OK`** — `application/json`:

  ```json
  {
    "items": ["Bakery", "Cafe", "Food & Beverage"]
  }
  ```

- **Response `429`**: client exceeded rate limits (`rate_limited`).
- **Response `503`**: the data source failed (`dependency_unavailable`).

---

## 4. Businesses

Business routes are the proving surface for the authorization policy matrix
(see `server/lib/auth-middleware.ts`). The actor's identity comes from the
session cookie; ownership and the administrator role are derived from the
database on every request. A missing resource and one the actor may not touch
answer identically with `404 not_found`, so nothing about resource existence
leaks.

### List businesses (`GET /api/businesses`)

Returns the businesses the session user owns, plus the
requested selection when the user owns it. Requires a verified session.

Query parameters:

| Name       | Type     | Default | Description                                                      |
| :--------- | :------- | :------ | :--------------------------------------------------------------- |
| `selected` | `string` | —       | Business `id` to echo back as `selectedId` when the user owns it |

- **Response `200 OK`** — `application/json`, `Cache-Control: private, no-store`:

  ```json
  {
    "items": [{ "id": "biz_1", "uen": "202400123A" }],
    "selectedId": "biz_1"
  }
  ```

  `selectedId` is `null` when no owned business was selected.

- **Response `401`**: no session (`unauthorized`).
- **Response `403`**: session present but email unverified (`forbidden`).
- **Response `400`**: query parameters failed validation (`invalid_request`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).

### Create a business (`POST /api/businesses`)

Creates a Business and its draft Listing in one atomic write. Requires a
verified session. The actor is never a client claim: `ownerId` is derived from
the session, and submitted `ownerId`/`businessId` values are stripped by
validation. A Business with the same UEN cannot be created twice; the
uniqueness check is the database constraint, so two concurrent creations of
the same UEN resolve to exactly one success and one `409`.

The UEN is normalized (trimmed and uppercased) at the boundary and validated
against the Singapore UEN formats: `nnnnnnnnX`, `nnnnnnnnnX`, or `TyyXXnnnnX`.

The listing address is resolved to coordinates before the write (ADR-0006):
the server geocodes `address` + `postalCode` via the Google Geocoding API and
stores `latitude`/`longitude` with the listing. The submitted address text is
stored verbatim. An address that does not resolve to a street-level
Singapore location, or resolves ambiguously, fails the whole creation with
`400`.

- **Request Body**:

  ```json
  {
    "uen": "202400123a",
    "listing": {
      "name": "Corner Kopitiam",
      "category": "Food & Beverage",
      "address": "1 Boon Lay Drive",
      "postalCode": "649902",
      "phone": "61234567",
      "email": "hello@cornerkopitiam.sg",
      "website": "https://cornerkopitiam.sg",
      "paymentOptions": ["Cash", "PayNow"],
      "priceRange": "$10-$30",
      "hours": []
    }
  }
  ```

  Listing bounds: `name` 200 chars, `category` 100, `address` 500,
  `postalCode` 12, `phone` 32, `email` 254, `website` 500, `priceRange` 32,
  `paymentOptions` at most 8 options. The optional fields may be omitted (or
  sent as `null`, which is stored as SQL `NULL`). `hours` is the per-day
  opening schedule (see `GET /api/businesses/:id/listing`); a new Business
  starts with `[]` and its owner adds hours afterwards.

- **Response `201 Created`** — the new business plus its owner-scoped draft
  listing:

  ```json
  {
    "id": "biz_1",
    "uen": "202400123A",
    "listing": {
      "id": "lst_1",
      "status": "draft",
      "name": "Corner Kopitiam",
      "category": "Food & Beverage",
      "address": "1 Boon Lay Drive",
      "postalCode": "649902",
      "phone": "61234567",
      "email": "hello@cornerkopitiam.sg",
      "website": "https://cornerkopitiam.sg",
      "paymentOptions": ["Cash", "PayNow"],
      "priceRange": "$10-$30",
      "hours": []
    }
  }
  ```

- **Response `401`**: no session (`unauthorized`).
- **Response `403`**: session present but email unverified (`forbidden`).
- **Response `400`**: body failed validation, including malformed UENs
  (`invalid_request`), or the address could not be geocoded — `details.reason`
  is `not_found` (address resolves to nothing) or `ambiguous` (no
  street-level Singapore match).
- **Response `409`**: a business with this UEN already exists (`conflict`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).
- **Response `503`**: the write failed for a non-conflict data source reason,
  the geocoding provider was unreachable or quota-exhausted (`details.reason`
  is `provider_unavailable` or `quota_exhausted`), or `GOOGLE_MAPS_API_KEY`
  is not configured — the failed write was rolled back; no partial business
  or listing is persisted (`dependency_unavailable`).

### View the owned listing (`GET /api/businesses/:id/listing`)

Returns the Listing of a business the session user owns (or administers),
including its full lifecycle `status` (`draft`, `pending_review`, `published`,
`rejected`, `suspended`) and any `rejectionReason` (when rejected). Non-published
listings are only reachable through this endpoint.

`hours` is the opening schedule: a list of per-day entries, at most one per
day. Days are `0` (Monday) through `6` (Sunday). A timed day carries
`is24h: false` with `openTime`/`closeTime` as `"HH:MM"` strings in Singapore
time; `closeTime` before `openTime` means the interval crosses midnight into
the next day. A 24-hour day is `{ "day": 1, "is24h": true }` with no times.
A day with no entry (and an empty list overall) means closed.

- **Response `200 OK`**:

  ```json
  {
    "id": "lst_1",
    "status": "draft",
    "rejectionReason": null,
    "name": "Corner Kopitiam",
    "category": "Food & Beverage",
    "address": "1 Boon Lay Drive",
    "postalCode": "649902",
    "phone": "61234567",
    "email": "hello@cornerkopitiam.sg",
    "website": "https://cornerkopitiam.sg",
    "paymentOptions": ["Cash", "PayNow"],
    "priceRange": "$10-$30",
    "hours": [
      { "day": 0, "is24h": false, "openTime": "07:00", "closeTime": "19:00" },
      { "day": 1, "is24h": true },
      { "day": 2, "is24h": false, "openTime": "18:00", "closeTime": "02:00" }
    ]
  }
  ```

  Optional fields are `null` when never set, so the owner UI can clear them.

- **Response `401`**: no session (`unauthorized`).
- **Response `403`**: session present but email unverified (`forbidden`).
- **Response `404`**: no such business, or the actor may not touch it
  (`not_found`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).
- **Response `503`**: the data source failed or returned rows that violate
  the contract (`dependency_unavailable`).

### Update the owned listing (`PATCH /api/businesses/:id/listing`)

Updates any subset of the Listing fields. A field sent as `null` is cleared
to SQL `NULL`; the bounds from `POST /api/businesses` apply per field.

Editing a `published` Listing immediately demotes it to `pending_review`,
removing it from public discovery until approved again.

Sending `hours` replaces the whole opening schedule; omitting it leaves the
schedule untouched. The same per-day rules as `GET` apply, and adjacent days
must not overlap (an overnight interval must not reach into the next day's
coverage). Duplicate days, equal open/close times, malformed times, and
adjacent-day overlaps are rejected with `400`; database-level conflicts
(unique day or overlap trigger) map to `409`.

When `address` or `postalCode` is part of the update, the new address is
geocoded before the write and the stored coordinates are refreshed together
with the text; other edits never call the geocoding provider and leave the
stored coordinates untouched.

- **Request Body** (any subset):

  ```json
  { "priceRange": "$5-$15", "website": null }
  ```

  ```json
  {
    "hours": [
      { "day": 0, "is24h": false, "openTime": "09:00", "closeTime": "18:00" },
      { "day": 6, "is24h": false, "openTime": "10:00", "closeTime": "22:00" }
    ]
  }
  ```

- **Response `200 OK`** — the updated listing, shaped like
  `GET /api/businesses/:id/listing`.
- **Response `401`**: no session (`unauthorized`).
- **Response `403`**: session present but email unverified (`forbidden`).
- **Response `404`**: no such business, or the actor may not touch it
  (`not_found`).
- **Response `400`**: body failed validation (`invalid_request`), or the new
  address could not be geocoded — `details.reason` is `not_found` or
  `ambiguous`; the update is not applied.
- **Response `409`**: the schedule conflicts with stored data — duplicate
  day or adjacent-day overlap (`conflict`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).
- **Response `503`**: the geocoding provider was unreachable or
  quota-exhausted (`details.reason` is `provider_unavailable` or
  `quota_exhausted`), or `GOOGLE_MAPS_API_KEY` is not configured — the update
  is not applied (`dependency_unavailable`).

### Submit a listing for review (`POST /api/businesses/:id/listing/submit`)

Transitions an owned `draft` or `rejected` Listing to `pending_review`.
Clears any existing `rejectionReason`.

- **Response `200 OK`** — the updated listing with `status: "pending_review"`.
- **Response `401`**: no session (`unauthorized`).
- **Response `403`**: session present but email unverified (`forbidden`).
- **Response `404`**: no such business, or the actor may not touch it (`not_found`).
- **Response `409`**: listing is already pending review, published, or suspended (`conflict`).

### Moderate a listing (`POST /api/businesses/:id/listing/moderate`)

Administrative operation to `publish`, `reject`, or `suspend` a Listing.
Requires an Administrator session. Every action requires a non-empty `reason`
and writes an immutable audit record to `listing_moderation_audit`.

- `publish`: transitions `pending_review` or `suspended` to `published`.
- `reject`: transitions `pending_review` to `rejected`, setting `rejectionReason`.
- `suspend`: transitions `published` to `suspended`, setting `rejectionReason`.

- **Request Body**:

  ```json
  {
    "action": "publish",
    "reason": "Business registration and location verified."
  }
  ```

- **Response `200 OK`** — the moderated listing.
- **Response `400`**: missing or invalid action/reason (`invalid_request`).
- **Response `401`**: no session (`unauthorized`).
- **Response `403`**: actor is not an administrator (`forbidden`).
- **Response `404`**: business does not exist (`not_found`).
- **Response `409`**: illegal transition from current status (`conflict`).

### View moderation audit history (`GET /api/businesses/:id/listing/audit`)

Returns the chronological audit trail of all administrative moderation actions
performed on this Listing. Requires an Administrator session.

- **Response `200 OK`**:

  ```json
  {
    "items": [
      {
        "id": "aud_1",
        "listingId": "lst_1",
        "actorId": "usr_admin",
        "previousStatus": "pending_review",
        "nextStatus": "published",
        "reason": "Business registration verified.",
        "createdAt": "2026-08-19T00:00:00.000Z"
      }
    ]
  }
  ```

- **Response `401`**: no session (`unauthorized`).
- **Response `403`**: actor is not an administrator (`forbidden`).
- **Response `404`**: business not found (`not_found`).

### Update a business (`PATCH /api/businesses/:id`)

Updates the `uen` of a business the session user owns (or administers).
The submitted UEN is normalized and format-validated exactly as on creation,
and the same uniqueness constraint applies. Request bodies carrying an
`ownerId` are ignored; the actor is never inferred
from a client claim. The ownership predicate is re-evaluated by the database
at the mutation boundary, so a business that changes hands between the
authorization read and the write is not updated.

- **Request Body**:

  ```json
  { "uen": "202400123A" }
  ```

- **Response `200 OK`**:

  ```json
  { "id": "biz_1", "uen": "202400123A" }
  ```

- **Response `401`**: no session (`unauthorized`).
- **Response `403`**: session present but email unverified (`forbidden`).
- **Response `404`**: no such business, or the actor may not touch it
  (`not_found`).
- **Response `400`**: body failed validation (`invalid_request`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).

### Transfer ownership (`POST /api/businesses/:id/transfer-ownership`)

Administrative operation that moves a Business to another owner. Requires an
Administrator session. Ownership is deliberately not an updatable field on any
Business or Listing edit path — it can only change through this operation,
which is transactional and writes an immutable audit record to
`business_ownership_audit` with the actor, previous owner, next owner, and
reason.

The target `ownerId` must name an existing User with a verified email that can
actually sign in; synthetic non-login Users and absent targets are rejected.

- **Request Body**:

  ```json
  {
    "ownerId": "usr_2",
    "reason": "Business changed hands; owner requested the transfer."
  }
  ```

- **Response `200 OK`**:

  ```json
  { "id": "biz_1", "uen": "202400123A" }
  ```

- **Response `400`**: the target is absent, unverified, or synthetic
  (`invalid_request`).
- **Response `401`**: no session (`unauthorized`).
- **Response `403`**: actor is not an administrator (`forbidden`).
- **Response `404`**: business does not exist (`not_found`).
- **Response `409`**: the target already owns the Business (`conflict`).

---

## 5. Authentication Endpoints (`/api/auth/*`)

Authentication is powered by **Better Auth**. All authentication routes are mounted under `/api/auth/*`.

- **Interactive Auth Docs**: [http://localhost:4001/api/auth/docs](http://localhost:4001/api/auth/docs)

### Primary Auth Routes

| Endpoint                    | Method | Description                                   |
| :-------------------------- | :----- | :-------------------------------------------- |
| `/api/auth/sign-in/email`   | `POST` | Authenticate using email and password         |
| `/api/auth/sign-up/email`   | `POST` | Register new user with email and password     |
| `/api/auth/sign-out`        | `POST` | Invalidate current user session               |
| `/api/auth/get-session`     | `GET`  | Retrieve active session details               |
| `/api/auth/forget-password` | `POST` | Trigger password reset email (asynchronous)   |
| `/api/auth/reset-password`  | `POST` | Reset password using email verification token |

---

## 6. Webhooks & Asynchronous Processing

### QStash Email Delivery Consumer (`POST /api/webhooks/qstash/email-delivery`)

Processes queued transactional email delivery jobs dispatched by Upstash QStash.

- **URL**: `/api/webhooks/qstash/email-delivery`
- **Method**: `POST`
- **Headers**:
  - `upstash-signature`: Cryptographic HMAC token generated by QStash for message verification.
  - `Content-Type`: `application/json`
- **Request Body**:
  ```json
  {
    "jobId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
  }
  ```
- **Responses**:
  - **`200 OK`**: Job completed successfully or encountered a terminal error (stops QStash retry loop).
    ```json
    {
      "success": true,
      "outcome": "delivered"
    }
    ```
  - **`400 Bad Request`**: Missing or malformed payload (`invalid_request`).
  - **`401 Unauthorized`**: Missing or invalid QStash signature (`unauthorized`).
  - **`503 Service Unavailable`**: Transient provider or network error encountered; signals QStash to retry according to its backoff schedule.
    ```json
    {
      "success": false,
      "outcome": "retryable",
      "error": "Rate limit exceeded"
    }
    ```

---

## 7. Distributed Rate Limiting & Caching

Rate limiting and caching are backed by **Upstash Redis** (connectionless REST HTTPS) and shared across all Cloud Run instances.

### Rate Limit Tiers

| Surface              | Path Pattern    | Limit                            | Identification                          |
| :------------------- | :-------------- | :------------------------------- | :-------------------------------------- |
| Public API           | `/api/*`        | 100 requests per 60s window      | `CF-Connecting-IP` or `X-Forwarded-For` |
| Auth Endpoints       | `/api/auth/*`   | 10 requests per 10-minute window | `CF-Connecting-IP` or `X-Forwarded-For` |
| System Health/Probes | `/health`, etc. | Unlimited (Exempt)               | N/A                                     |

### Rate Limit Headers

Every rate-limited API response includes standard rate-limiting headers:

| Header                  | Description                                                  |
| :---------------------- | :----------------------------------------------------------- |
| `X-RateLimit-Limit`     | Maximum number of allowed requests in the current window     |
| `X-RateLimit-Remaining` | Number of remaining requests allowed in the current window   |
| `X-RateLimit-Reset`     | Unix timestamp in milliseconds when the limit window resets  |
| `Retry-After`           | Seconds until retry is allowed (included on `429` responses) |

When the limit is exceeded, the server returns `429 Too Many Requests` with the standard error envelope (`code: "rate_limited"`).

---

## 8. Standardized Error Response Format

Every error response carries the same envelope, defined once in `shared/contracts/error.ts`:

```json
{
  "error": {
    "code": "not_found",
    "message": "The requested API route does not exist.",
    "details": {},
    "requestId": "6f1d2b3e-..."
  }
}
```

| Field       | Type      | Description                                                                    |
| :---------- | :-------- | :----------------------------------------------------------------------------- |
| `code`      | `string`  | Stable machine-readable error code (see table below)                           |
| `message`   | `string`  | Human-readable summary safe to show end users                                  |
| `details`   | `object?` | Extra context, e.g. validation issues; only when present                       |
| `requestId` | `string`  | Server-owned correlation id, also echoed on the `X-Request-Id` response header |

### Error Codes

| Code                     | HTTP Status | Meaning                                             |
| :----------------------- | :---------- | :-------------------------------------------------- |
| `invalid_request`        | `400`       | Malformed request (query, headers, or body)         |
| `unauthorized`           | `401`       | Missing or invalid credentials                      |
| `forbidden`              | `403`       | Authenticated but not permitted                     |
| `not_found`              | `404`       | The requested resource or route does not exist      |
| `conflict`               | `409`       | Request conflicts with the current state            |
| `validation_failed`      | `422`       | Semantically invalid payload against current state  |
| `rate_limited`           | `429`       | Too many requests                                   |
| `dependency_unavailable` | `503`       | An upstream dependency failed (e.g. the database)   |
| `internal_error`         | `500`       | Unexpected server failure; details are never leaked |

Validation failures carry flattened issues under `details.issues`:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Request parameters failed validation",
    "details": {
      "issues": {
        "formErrors": [],
        "fieldErrors": {
          "limit": ["limit must be an integer between 1 and 100"]
        }
      }
    },
    "requestId": "6f1d2b3e-..."
  }
}
```

Unexpected errors are logged server-side (root cause, including `requestId`) and reported to Sentry when configured; the response body never contains the underlying error message, connection strings, or credentials. Unknown `/api/*` paths answer `404 not_found` instead of falling through to the SPA.

External-provider failures (see ADR-0005) carry a stable machine-readable
reason under `details.reason` equal to the classified failure kind:
`not_found`, `ambiguous`, `quota_exhausted`, `provider_unavailable`, or
`invalid_response`. `quota_exhausted` and `provider_unavailable` map to
`503 dependency_unavailable`; `not_found` and `ambiguous` map to
`400 invalid_request`.

---

## 9. Public profiles

A User's public profile is the minimal identity a visitor can see: display
name and avatar, and nothing else. The public contract
(`shared/contracts/profiles.ts`) is a separate response shape from any private
profile — private account fields (email, verification state, timestamps) are
structurally absent from it, not conditionally stripped. The route mounts no
session middleware, so the response is byte-identical for anonymous visitors,
signed-in Users, and the profile's owner.

Public Review and Forum contribution streams are exposed as separate
user-scoped endpoints rather than embedded in this one: `GET
/api/users/:id/reviews` (see §13). Forum posts are not yet surfaced on the
profile.

### Get a public profile (`GET /api/users/:id`)

- **Response `200 OK`** — `application/json`:

  ```json
  {
    "id": "usr_123",
    "displayName": "Alice Tan",
    "avatarUrl": "https://cdn.example.com/alice.png"
  }
  ```

  `avatarUrl` is `null` when the User has not set an avatar.

- **Response `404`**: no such user (`not_found`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).
- **Response `503`**: the data source failed or returned a row that violates
  the contract (`dependency_unavailable`).

---

## 10. Personal profile

The signed-in User's own profile (`shared/contracts/profiles.ts`:
`privateProfileSchema`). The response carries the private account fields the
public contract structurally lacks: `email`, `emailVerified`, and `createdAt`
(an ISO-8601 string on the wire, coerced to a `Date` by the client contract).

Every route mounts the session middleware, so requests without a valid session
cookie are rejected with `401` (`unauthorized`). Responses are personalized
(`Cache-Control: private, no-store`) and never shared.

### Get the signed-in User's profile (`GET /api/profile`)

- **Response `200 OK`** — `application/json`:

  ```json
  {
    "id": "usr_123",
    "displayName": "Alice Tan",
    "avatarUrl": "https://cdn.example.com/alice.png",
    "email": "alice@example.com",
    "emailVerified": true,
    "createdAt": "2026-08-01T00:00:00.000Z"
  }
  ```

  `avatarUrl` is `null` when the User has not set an avatar. `createdAt` is
  the account's registration timestamp.

- **Response `401`**: no session (`unauthorized`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).
- **Response `503`**: the data source failed or returned a row that violates
  the contract (`dependency_unavailable`).

### Update the signed-in User's profile (`PATCH /api/profile`)

The body accepts `displayName` and `avatarUrl` (either, or both). An empty
`avatarUrl` clears the avatar (`null`); it is not sent to the client. An empty
body is rejected.

- **Request** — `application/json`:

  ```json
  {
    "displayName": "Alice Tan",
    "avatarUrl": "https://cdn.example.com/alice.png"
  }
  ```

- **Response `200 OK`** — the updated private profile (same shape as `GET
/api/profile`).
- **Response `400`**: validation failure — `displayName` must be 1–64
  characters, `avatarUrl` must be a valid URL or empty, and at least one
  field must be present (`invalid_request`).
- **Response `401`**: no session (`unauthorized`).
- **Response `403`**: the signed-in User's email is not verified
  (`forbidden`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).
- **Response `503`**: the data source failed or returned a row that violates
  the contract (`dependency_unavailable`).

### Request an email change (`POST /api/profile/email-change`)

Begins a verified email-address change. Requires a verified email — an
unverified User receives `403` (`forbidden`) with `reason: "email_not_verified"`.
If the address is available, a confirmation email with a single-use link is
enqueued; the response is `{ "status": "confirmation_sent" }` regardless, so a
taken address cannot be enumerated.

- **Request** — `application/json`:

  ```json
  {
    "email": "new-address@example.com"
  }
  ```

- **Response `200 OK`** — `application/json`:
  `{ "status": "confirmation_sent" }`
- **Response `400`**: validation failure — `email` must be a valid email
  address (`invalid_request`).
- **Response `401`**: no session (`unauthorized`).
- **Response `403`**: the signed-in User's email is not verified
  (`forbidden`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).

---

## 11. Listing photos

Listing photos are private objects in R2. The client never holds storage
credentials and never proposes an object key: the server generates an opaque
key (`listing-photos/{businessId}/{uuid}`) and issues a short-lived presigned
URL for every read and write. Objects are only reachable through these grants;
there is no public URL for any object. Bounds: at most 10 photos per Business
(pending and active combined), at most 8 MB per photo, JPEG/PNG/WebP only, and
the filename extension must match the declared media type. Deletion is
permanent — objects are not versioned or backed up.

Every route requires a verified session and answers `404 not_found` for both a
missing object and one the actor may not touch, so nothing about existence
leaks. All require storage credentials to be configured; otherwise they answer
`503 dependency_unavailable`.

### Presign a photo upload (`POST /api/businesses/:id/photos`)

Validates the declared media type, byte size, and filename extension, then
issues a presigned PUT grant. The per-Business count limit is serialized by
locking the Business row, so concurrent uploads cannot exceed it.

- **Request Body**:

  ```json
  { "contentType": "image/jpeg", "size": 123456, "filename": "front.jpg" }
  ```

- **Response `201 Created`**:

  ```json
  {
    "id": "med_1",
    "uploadUrl": "https://<bucket>.<account>.r2.cloudflarestorage.com/listing-photos/biz_1/<uuid>?...",
    "expiresAt": "2026-08-18T00:15:00.000Z",
    "headers": { "content-type": "image/jpeg" }
  }
  ```

  The client PUTs the file to `uploadUrl` with exactly the returned
  `content-type` header (it is part of the signature), then completes the
  upload. The grant expires after 15 minutes. The object key is never returned
  as a field.

- **Response `400`**: body failed validation, including unsupported types,
  oversized or empty files, and extension/type mismatches (`invalid_request`).
- **Response `401`** / **`403`** / **`404`**: see the section intro.
- **Response `422`**: the Business already has 10 photos
  (`validation_failed`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).

### List a Business's photos (`GET /api/businesses/:id/photos`)

Returns every stored photo of a Business the actor owns or administers, oldest
first, including pending uploads. The response carries metadata only (id,
business, content type, verified size, status, creation time) — never keys.

- **Response `200 OK`**:

  ```json
  {
    "items": [
      {
        "id": "med_1",
        "businessId": "biz_1",
        "contentType": "image/jpeg",
        "size": 123456,
        "status": "active",
        "createdAt": "2026-08-18T00:00:00.000Z"
      }
    ]
  }
  ```

### Complete a photo upload (`POST /api/media/:id/complete`)

Verifies the uploaded object exists and that its actual size and content type
match the declaration made at presign time, then marks the photo active. A
mismatched object is deleted (object and row) immediately, so a bad upload is
rejected rather than left for the sweep. Completing an already-active photo
answers `200` idempotently; completing a never-uploaded grant drops the row and
answers `404`.

- **Response `200 OK`**: the verified photo (same shape as a list item).
- **Response `404`**: object missing or never uploaded, or the actor may not
  touch it (`not_found`).
- **Response `422`**: size or content-type mismatch — upload rejected and
  purged (`validation_failed`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).

### Fetch a photo (`GET /api/media/:id`)

Resolves the object through the ownership predicate and answers
`302 Found` redirecting to a short-lived (5-minute) presigned GET URL.
`Cache-Control: private, no-store`. Pending uploads answer `404`, as do
non-owned or missing objects. Public reads of published Listing photos arrive
with the publish flow.

### Delete a photo (`DELETE /api/media/:id`)

Purges the object from storage first, then removes its row — if the storage
delete fails, the row survives and the endpoint answers `503`, so a photo is
never silently orphaned. Deletion is irreversible. Deleting a pending upload
aborts it.

- **Response `204 No Content`**: the photo was purged.
- **Response `401`** / **`403`** / **`404`**: see the section intro.
- **Response `503`**: storage delete failed; retry (`dependency_unavailable`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).

### Media sweep webhook (`POST /api/webhooks/qstash/media-sweep`)

QStash-signed scheduled webhook that purges abandoned pending uploads: rows
still `pending` 24 hours after creation (their grants long expired) and their
storage objects. Batch size 500 per invocation; partial storage failures
answer `503` so QStash retries.

- **Request Body**: `{ "job": "media-sweep" }`
- **Headers**: `upstash-signature` (QStash HMAC; verified with the same
  mechanism as the email-delivery webhook).
- **Response `200 OK`**: `{ "deleted": 3 }`
- **Response `400`**: malformed or wrong payload (`invalid_request`).
- **Response `401`**: missing or invalid signature (`unauthorized`).
- **Response `503`**: a storage delete failed; retry (`dependency_unavailable`).

---

## 12. Bookmarks

Bookmarks allow an authenticated User to save Businesses to return to later.
Bookmarks are strictly private: they are structurally absent from public
profiles (`GET /api/users/:id`), public listing discovery (`GET /api/listings`),
and cannot be inferred from any public response.

Correctness properties are enforced at the database level:

- One bookmark per User and Business is enforced via a PostgreSQL unique
  constraint (`bookmark_user_business_unique`), preventing duplicate rows under
  concurrent creation.
- Adding an existing bookmark is idempotent rather than an error.
- Removing a bookmark is idempotent (repeated deletions answer `200` rather than erroring).
- Reading bookmarks requires an active session; mutating bookmarks requires a verified email.
- All bookmark responses carry `Cache-Control: private, no-store`.

### List bookmarks (`GET /api/bookmarks`)

Cursor-paginated list of the session user's bookmarked Businesses and their
published Listings (ordered ascending by stable bookmark ID).

- **Query Parameters**:
  - `limit` (optional): integer between 1 and 100 (default: `20`).
  - `cursor` (optional): bookmark ID to paginate after.

- **Response `200 OK`** — `application/json`:

  ```json
  {
    "items": [
      {
        "id": "bmk_1",
        "businessId": "biz_1",
        "createdAt": "2026-08-19T00:00:00.000Z",
        "business": {
          "id": "biz_1",
          "uen": "199012345A"
        },
        "listing": {
          "id": "lst_1",
          "name": "Maxwell Chicken Rice",
          "category": "Food & Beverage",
          "address": "123 Maxwell Road",
          "postalCode": "069111",
          "latitude": 1.2956,
          "longitude": 103.7764,
          "phone": "+6561234567",
          "email": "contact@example.com",
          "website": "https://example.com",
          "paymentOptions": ["PayNow"],
          "priceRange": "$$"
        }
      }
    ],
    "nextCursor": "bmk_1"
  }
  ```

  `listing` is `null` when the Business has no published Listing.

- **Response `400`**: query parameters failed validation (`invalid_request`).
- **Response `401`**: no active session (`unauthorized`).
- **Response `503`**: database unavailable (`dependency_unavailable`).

### Add a bookmark (`POST /api/bookmarks`)

Saves a reference to a Business for the session user. Idempotent: repeated taps
return the bookmark without error.

- **Request Body** — `application/json`:

  ```json
  {
    "businessId": "biz_1"
  }
  ```

- **Response `200 OK`** — `application/json`:

  ```json
  {
    "status": "bookmarked",
    "bookmark": {
      "id": "bmk_1",
      "businessId": "biz_1",
      "createdAt": "2026-08-19T00:00:00.000Z"
    }
  }
  ```

- **Response `400`**: body failed validation (`invalid_request`).
- **Response `401`**: no active session (`unauthorized`).
- **Response `403`**: unverified email (`forbidden`).
- **Response `404`**: Business does not exist (`not_found`).
- **Response `503`**: database unavailable (`dependency_unavailable`).

### Remove a bookmark (`DELETE /api/bookmarks/:businessId`)

Removes a bookmark for the session user. Idempotent: removing a bookmark that was
already removed or never existed succeeds with `200`.

- **Response `200 OK`** — `application/json`:

  ```json
  {
    "status": "removed"
  }
  ```

- **Response `401`**: no active session (`unauthorized`).
- **Response `403`**: unverified email (`forbidden`).
- **Response `503`**: database unavailable (`dependency_unavailable`).

### Get bookmark status (`GET /api/bookmarks/:businessId`)

Checks whether the session user has bookmarked the specified Business.

- **Response `200 OK`** — `application/json`:

  ```json
  {
    "bookmarked": true,
    "bookmark": {
      "id": "bmk_1",
      "businessId": "biz_1",
      "createdAt": "2026-08-19T00:00:00.000Z"
    }
  }
  ```

- **Response `401`**: no active session (`unauthorized`).
- **Response `503`**: database unavailable (`dependency_unavailable`).

---

## 13. Reviews & Derived Ratings Endpoints

Reviews allow verified Users to write one review with an integer Rating (1–5) and feedback for a Business. Aggregate ratings and review counts are derived in SQL from persisted reviews.

### Create a Review (`POST /api/businesses/:id/reviews`)

Publishes a Review for a Business. Requires an authenticated session with a verified email (`requireVerified`). Business owners cannot review their own business. Enforces one review per user and business via a database uniqueness constraint.

- **Request Body**:
  ```json
  {
    "rating": 5,
    "content": "Outstanding food and great atmosphere!"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": "rev_123",
    "businessId": "biz_456",
    "userId": "usr_789",
    "rating": 5,
    "content": "Outstanding food and great atmosphere!",
    "author": {
      "id": "usr_789",
      "displayName": "Alice Tan",
      "avatarUrl": "https://cdn.example.com/avatar.png"
    },
    "createdAt": "2026-08-19T04:00:00.000Z",
    "updatedAt": "2026-08-19T04:00:00.000Z"
  }
  ```
- **Response `400`**: validation error (rating not integer 1–5 or empty/overlength content) (`invalid_request`).
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: email unverified or business owner reviewing own business (`forbidden`).
- **Response `404`**: business not found (`not_found`).
- **Response `409`**: user already reviewed this business (`conflict`).

### List Reviews for a Business (`GET /api/businesses/:id/reviews`)

Public endpoint returning cursor-paginated reviews for a Business along with derived aggregate Rating and total count.

- **Query Parameters**:
  - `limit` (optional): number of reviews per page (1–100, default `20`).
  - `cursor` (optional): base64-encoded pagination cursor.
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": "rev_123",
        "businessId": "biz_456",
        "userId": "usr_789",
        "rating": 5,
        "content": "Outstanding food and great atmosphere!",
        "author": {
          "id": "usr_789",
          "displayName": "Alice Tan",
          "avatarUrl": null
        },
        "createdAt": "2026-08-19T04:00:00.000Z",
        "updatedAt": "2026-08-19T04:00:00.000Z"
      }
    ],
    "nextCursor": "MjAyNi0wOC0xOVQwNDowMDowMC4wMDBaX3Jldl8xMjM",
    "aggregate": {
      "averageRating": 4.5,
      "totalCount": 12
    }
  }
  ```
- **Response `404`**: business not found (`not_found`).

### Edit a Review (`PATCH /api/reviews/:id`)

Updates a review's rating or content. Requires a verified session and only the review's author can edit it.

- **Request Body**:
  ```json
  {
    "rating": 4,
    "content": "Updated review feedback."
  }
  ```
- **Response `200 OK`**: the updated review payload.
- **Response `400`**: validation error (`invalid_request`).
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: actor is not the author of this review (`forbidden`).
- **Response `404`**: review not found (`not_found`).

### Delete a Review (`DELETE /api/reviews/:id`)

Deletes a review. Requires a verified session and can only be performed by the review's author or a platform administrator.

- **Response `204 No Content`**: review deleted.
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: actor is neither the author nor an administrator (`forbidden`).
- **Response `404`**: review not found (`not_found`).

### Like a Review (`POST /api/reviews/:id/like`)

Idempotently endorses a review. Requires an authenticated session with a verified email (`requireVerified`).

- **Response `200 OK`**:
  ```json
  {
    "status": "liked",
    "liked": true,
    "likeCount": 5
  }
  ```
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: email unverified (`forbidden`).
- **Response `404`**: review not found (`not_found`).

### Unlike a Review (`DELETE /api/reviews/:id/like`)

Idempotently removes an endorsement for a review. Requires an authenticated session with a verified email (`requireVerified`).

- **Response `200 OK`**:
  ```json
  {
    "status": "unliked",
    "liked": false,
    "likeCount": 4
  }
  ```
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: email unverified (`forbidden`).
- **Response `404`**: review not found (`not_found`).

### List Reviews by User (`GET /api/users/:id/reviews`)

Public endpoint returning cursor-paginated reviews written by a user for public profile contribution feeds.

- **Query Parameters**:
  - `limit` (optional): number of reviews per page (1–100, default `20`).
  - `cursor` (optional): base64-encoded pagination cursor.
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": "rev_123",
        "businessId": "biz_456",
        "userId": "usr_789",
        "rating": 5,
        "content": "Crispy prata!",
        "author": {
          "id": "usr_789",
          "displayName": "Alice Tan",
          "avatarUrl": null
        },
        "business": {
          "id": "biz_456",
          "name": "Prata Palace",
          "category": "Food & Beverage"
        },
        "createdAt": "2026-08-19T04:00:00.000Z",
        "updatedAt": "2026-08-19T04:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
  ```
- **Response `404`**: user not found (`not_found`).

## 14. Forum posts and Replies Endpoints

Forum posts are the parent discussions in the community forum, each required to reference a Business (the association is never nullable). Replies are responses to a Forum post. Public reads are cursor-paginated, replies render oldest-first, and author deletion is soft deletion: content stops being public while the row remains for administrators (`?includeDeleted=true`).

### Get the Forum feed (`GET /api/forum/posts`)

Public endpoint returning cursor-paginated Forum posts newest-first with batched reply counts. Soft-deleted posts are excluded.

- **Query Parameters**:
  - `limit` (optional): number of posts per page (1–100, default `20`).
  - `cursor` (optional): base64-encoded pagination cursor.
  - `includeDeleted` (optional): `true` includes soft-deleted posts; requires the administrator role, otherwise `403`.
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": "post_123",
        "businessId": "biz_456",
        "userId": "usr_789",
        "title": "Weekend crowd?",
        "body": "How busy is it on Saturdays?",
        "author": {
          "id": "usr_789",
          "displayName": "Alice Tan",
          "avatarUrl": null
        },
        "business": {
          "id": "biz_456",
          "name": "Kaya Toast Central",
          "category": "Food & Beverage"
        },
        "replyCount": 3,
        "deletedAt": null,
        "createdAt": "2026-08-19T04:00:00.000Z",
        "updatedAt": "2026-08-19T04:00:00.000Z"
      }
    ],
    "nextCursor": "MjAyNi0wOC0xOVQwNDowMDowMC4wMDBaX3Bvc3RfMTIz"
  }
  ```
- **Response `403`**: `includeDeleted` requested without the administrator role (`forbidden`).

### Create a Forum post (`POST /api/forum/posts`)

Publishes a Forum post referencing an existing Business. Requires an authenticated session with a verified email (`requireVerified`).

- **Request Body**:
  ```json
  {
    "businessId": "biz_456",
    "title": "Weekend crowd?",
    "body": "How busy is it on Saturdays?"
  }
  ```
- **Response `201 Created`**: the created Forum post payload.
- **Response `400`**: validation error (missing businessId, empty or overlength title/body) (`invalid_request`).
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: email unverified (`forbidden`).
- **Response `404`**: business not found (`not_found`).

### Get a Forum post (`GET /api/forum/posts/:id`)

Public endpoint returning a single Forum post with its Business reference and batched reply count. Soft-deleted posts answer 404 unless an administrator passes `includeDeleted=true`.

- **Query Parameters**: `includeDeleted` (optional, administrator-only) as above.
- **Response `200 OK`**: the Forum post payload.
- **Response `403`**: `includeDeleted` requested without the administrator role (`forbidden`).
- **Response `404`**: post not found or soft-deleted (`not_found`).

### Edit a Forum post (`PATCH /api/forum/posts/:id`)

Updates a post's title and/or body. Requires a verified session and only the post's author can edit it.

- **Request Body**:
  ```json
  {
    "title": "Edited title",
    "body": "Edited body."
  }
  ```
- **Response `200 OK`**: the updated Forum post payload.
- **Response `400`**: validation error (`invalid_request`).
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: actor is not the author (`forbidden`).
- **Response `404`**: post not found or soft-deleted (`not_found`).

### Soft-delete a Forum post (`DELETE /api/forum/posts/:id`)

Marks a post as soft-deleted (`deleted_at`). Requires a verified session and only the post's author can delete it. The post stops appearing in public reads while the row remains available to administrators.

- **Response `204 No Content`**: post soft-deleted.
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: actor is not the author (`forbidden`).
- **Response `404`**: post not found or already soft-deleted (`not_found`).

### Like a Forum post (`POST /api/forum/posts/:id/like`)

Idempotently endorses a Forum post. Requires an authenticated session with a verified email (`requireVerified`). Non-administrators liking a soft-deleted post receive 404.

- **Response `200 OK`**:
  ```json
  {
    "status": "liked",
    "liked": true,
    "likeCount": 1
  }
  ```
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: email unverified (`forbidden`).
- **Response `404`**: post not found or soft-deleted (`not_found`).

### Unlike a Forum post (`DELETE /api/forum/posts/:id/like`)

Idempotently removes an endorsement for a Forum post. Requires an authenticated session with a verified email (`requireVerified`). Non-administrators unliking a soft-deleted post receive 404.

- **Response `200 OK`**:
  ```json
  {
    "status": "unliked",
    "liked": false,
    "likeCount": 0
  }
  ```
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: email unverified (`forbidden`).
- **Response `404`**: post not found or soft-deleted (`not_found`).

### Get Replies to a Forum post (`GET /api/forum/posts/:id/replies`)

Public endpoint returning cursor-paginated Replies to a post in chronological (oldest-first) order. Soft-deleted replies are excluded. Soft-deleted posts answer 404 unless an administrator passes `includeDeleted=true`.

- **Query Parameters**: `limit`, `cursor`, and `includeDeleted` (optional, administrator-only) as above.
- **Response `200 OK`**:
  ```json
  {
    "items": [
      {
        "id": "reply_123",
        "postId": "post_456",
        "userId": "usr_789",
        "body": "Usually packed after 11am.",
        "author": {
          "id": "usr_789",
          "displayName": "Ben Lim",
          "avatarUrl": null
        },
        "deletedAt": null,
        "createdAt": "2026-08-19T05:00:00.000Z",
        "updatedAt": "2026-08-19T05:00:00.000Z"
      }
    ],
    "nextCursor": null
  }
  ```
- **Response `403`**: `includeDeleted` requested without the administrator role (`forbidden`).
- **Response `404`**: post not found or soft-deleted (`not_found`).

### Reply to a Forum post (`POST /api/forum/posts/:id/replies`)

Publishes a Reply to a post. Requires an authenticated session with a verified email. Soft-deleted posts answer 404.

- **Request Body**:
  ```json
  {
    "body": "Usually packed after 11am."
  }
  ```
- **Response `201 Created`**: the created Reply payload.
- **Response `400`**: validation error (empty or overlength body) (`invalid_request`).
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: email unverified (`forbidden`).
- **Response `404`**: post not found or soft-deleted (`not_found`).

### Edit a Reply (`PATCH /api/forum/replies/:id`)

Updates a reply's body. Requires a verified session and only the reply's author can edit it.

- **Request Body**:
  ```json
  {
    "body": "Updated reply."
  }
  ```
- **Response `200 OK`**: the updated Reply payload.
- **Response `400`**: validation error (`invalid_request`).
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: actor is not the author (`forbidden`).
- **Response `404`**: reply not found or soft-deleted (`not_found`).

### Soft-delete a Reply (`DELETE /api/forum/replies/:id`)

Marks a reply as soft-deleted. Requires a verified session and only the reply's author can delete it. The reply stops appearing in public reads while the row remains available to administrators.

- **Response `204 No Content`**: reply soft-deleted.
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: actor is not the author (`forbidden`).
- **Response `404`**: reply not found or already soft-deleted (`not_found`).

### Like a Forum reply (`POST /api/forum/replies/:id/like`)

Idempotently endorses a Forum reply. Requires an authenticated session with a verified email (`requireVerified`). Non-administrators liking a soft-deleted reply receive 404.

- **Response `200 OK`**:
  ```json
  {
    "status": "liked",
    "liked": true,
    "likeCount": 1
  }
  ```
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: email unverified (`forbidden`).
- **Response `404`**: reply not found or soft-deleted (`not_found`).

### Unlike a Forum reply (`DELETE /api/forum/replies/:id/like`)

Idempotently removes an endorsement for a Forum reply. Requires an authenticated session with a verified email (`requireVerified`). Non-administrators unliking a soft-deleted reply receive 404.

- **Response `200 OK`**:
  ```json
  {
    "status": "unliked",
    "liked": false,
    "likeCount": 0
  }
  ```
- **Response `401`**: authentication required (`unauthorized`).
- **Response `403`**: email unverified (`forbidden`).
- **Response `404`**: reply not found or soft-deleted (`not_found`).
