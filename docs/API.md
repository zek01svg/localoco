# API Reference & Documentation

This document describes the API architecture, route definitions, OpenAPI specification generation, authentication endpoints, and error handling conventions used in the **React + Hono Template**.

---

## 1. Interactive API Reference & OpenAPI

The backend features automated OpenAPI specification generation via `hono-openapi` and interactive documentation rendering via **Scalar**.

- **Scalar Interactive API UI**: Available at [http://localhost:4001/api/scalar](http://localhost:4001/api/scalar) (when running locally).
- **OpenAPI 3.0 JSON Spec**: Available at `GET http://localhost:4001/api/openapi`.

### Adding OpenAPI Annotations to Routes

To document new routes, wrap route definitions using `describeRoute`:

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

## 3. Authentication Endpoints (`/api/auth/*`)

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

## 4. Standardized Error Response Formats

All API endpoints return JSON error objects matching a consistent schema.

### Validation Error (`400 Bad Request`)

Returned when request parameters or payload fail schema validation:

```json
{
  "error": "Validation failed",
  "details": "Invalid email address format"
}
```

### Internal Server Error (`500 Internal Server Error`)

Returned when an unexpected backend exception occurs. Automatically logged and reported to Sentry if configured:

```json
{
  "error": "Internal Server Error",
  "message": "Database connection timeout"
}
```
