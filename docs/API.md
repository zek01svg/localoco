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

Returns a page of listings ordered by `id` ascending, using keyset pagination.

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
        "postalCode": "123456"
      }
    ],
    "nextCursor": "1"
  }
  ```

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

### Update a business (`PATCH /api/businesses/:id`)

Updates the `uen` of a business the session user owns (or administers).
Request bodies carrying an `ownerId` are ignored; the actor is never inferred
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
