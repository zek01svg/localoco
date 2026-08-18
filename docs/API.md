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

| Name     | Type     | Default | Description                                          |
| :------- | :------- | :------ | :--------------------------------------------------- |
| `limit`  | `int`    | `20`    | Page size, between 1 and 100                         |
| `cursor` | `string` | —       | Opaque `id` of the last listing on the previous page |

- **Response `200 OK`** — `application/json`:

  ```json
  {
    "items": [
      {
        "id": "1",
        "name": "Business 1",
        "category": "Food & Beverage",
        "address": "1 Example Street #01",
        "postalCode": "123456",
        "phone": "61234567",
        "email": "hello@example.com",
        "website": "https://example.com",
        "paymentOptions": ["PayNow", "Visa"],
        "priceRange": "$10-$30"
      }
    ],
    "nextCursor": "1"
  }
  ```

  The optional contact fields (`phone`, `email`, `website`, `paymentOptions`,
  `priceRange`) are `null` when the business never set them.

  `nextCursor` is `null` on the final page. The server fetches `limit + 1` rows to detect a following page, so no empty trailing page is ever returned.

- **Response `400`**: query parameters failed validation (`invalid_request`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).
- **Response `503`**: the data source failed or returned rows that violate the contract (`dependency_unavailable`). A dependency failure is never reported as a success or an empty collection.

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
      "priceRange": "$10-$30"
    }
  }
  ```

  Listing bounds: `name` 200 chars, `category` 100, `address` 500,
  `postalCode` 12, `phone` 32, `email` 254, `website` 500, `priceRange` 32,
  `paymentOptions` at most 8 options. The optional fields may be omitted (or
  sent as `null`, which is stored as SQL `NULL`).

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
      "priceRange": "$10-$30"
    }
  }
  ```

- **Response `401`**: no session (`unauthorized`).
- **Response `403`**: session present but email unverified (`forbidden`).
- **Response `400`**: body failed validation, including malformed UENs
  (`invalid_request`).
- **Response `409`**: a business with this UEN already exists (`conflict`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).
- **Response `503`**: the write failed for a non-conflict data source reason,
  and the failed write was rolled back — no partial business or listing is
  persisted (`dependency_unavailable`).

### View the owned listing (`GET /api/businesses/:id/listing`)

Returns the draft or published Listing of a business the session user owns
(or administers), including its `status`. Draft listings are only reachable
through this endpoint.

- **Response `200 OK`**:

  ```json
  {
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
    "priceRange": "$10-$30"
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

- **Request Body** (any subset):

  ```json
  { "priceRange": "$5-$15", "website": null }
  ```

- **Response `200 OK`** — the updated listing, shaped like
  `GET /api/businesses/:id/listing`.
- **Response `401`**: no session (`unauthorized`).
- **Response `403`**: session present but email unverified (`forbidden`).
- **Response `404`**: no such business, or the actor may not touch it
  (`not_found`).
- **Response `400`**: body failed validation (`invalid_request`).
- **Response `429`**: client exceeded rate limits (`rate_limited`).

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

| Surface              | Path Pattern    | Limit                       | Identification                          |
| :------------------- | :-------------- | :-------------------------- | :-------------------------------------- |
| Public API           | `/api/*`        | 100 requests per 60s window | `CF-Connecting-IP` or `X-Forwarded-For` |
| Auth Endpoints       | `/api/auth/*`   | 30 requests per 60s window  | `CF-Connecting-IP` or `X-Forwarded-For` |
| System Health/Probes | `/health`, etc. | Unlimited (Exempt)          | N/A                                     |

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

---

## 9. Public profiles

A User's public profile is the minimal identity a visitor can see: display
name and avatar, and nothing else. The public contract
(`shared/contracts/profiles.ts`) is a separate response shape from any private
profile — private account fields (email, verification state, timestamps) are
structurally absent from it, not conditionally stripped. The route mounts no
session middleware, so the response is byte-identical for anonymous visitors,
signed-in Users, and the profile's owner.

Public Review and Forum contribution streams are added to this endpoint by the
Reviews and Forum slices; until then the profile is identity-only.

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
