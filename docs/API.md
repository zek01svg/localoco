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
- **Response `503`**: the data source failed or returned rows that violate the contract (`dependency_unavailable`). A dependency failure is never reported as a success or an empty collection.

---

## 4. Authentication Endpoints (`/api/auth/*`)

Authentication is powered by **Better Auth**. All authentication routes are mounted under `/api/auth/*`.

- **Interactive Auth Docs**: [http://localhost:4001/api/auth/docs](http://localhost:4001/api/auth/docs)

### Primary Auth Routes

| Endpoint                    | Method | Description                                   |
| :-------------------------- | :----- | :-------------------------------------------- |
| `/api/auth/sign-in/email`   | `POST` | Authenticate using email and password         |
| `/api/auth/sign-up/email`   | `POST` | Register new user with email and password     |
| `/api/auth/sign-out`        | `POST` | Invalidate current user session               |
| `/api/auth/get-session`     | `GET`  | Retrieve active session details               |
| `/api/auth/forget-password` | `POST` | Trigger password reset email via SMTP         |
| `/api/auth/reset-password`  | `POST` | Reset password using email verification token |

---

## 5. Standardized Error Response Format

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
