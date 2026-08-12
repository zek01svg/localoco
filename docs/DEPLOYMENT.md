# Deployment & Production Guide

This guide covers building, containerizing, configuring, and deploying the **React + Hono Template** to production environments.

---

## 1. Production Architecture

In production, the application is packaged into a single containerized Bun process that handles both API routing and static asset delivery:

- **Backend Execution**: Bun executes the minified server entry point `dist/index.js` on port `4001`.
- **Static File Serving**: Hono serves compiled React SPA static assets (`dist/static/`) directly from memory and disk using Bun's native `serveStatic` middleware.
- **Client SPA Fallback**: Unmatched non-API requests fallback to `dist/static/index.html` to support client-side HTML5 routing.
- **Runtime Env Injection**: `/api/runtime.js` injects production server environment variables (`VITE_*`) into `window.__env` at startup.

---

## 2. Docker Container Deployment (Recommended)

The repository provides an optimized multi-stage `Dockerfile` based on `oven/bun:1-alpine`.

### Multi-Stage Build Breakdown

```
[Stage 1: base] ─────► oven/bun:1-alpine
                          │
[Stage 2: install] ───► Installs build tools (g++, python3, native libs)
                          ├──► Installs full node_modules (/temp/dev)
                          └──► Installs production node_modules (/temp/prod)
                          │
[Stage 3: build] ─────► Runs 'bun run build'
                          ├──► Bun builds dist/index.js
                          └──► Vite builds dist/static/
                          │
[Stage 4: release] ───► Copies /temp/prod/node_modules and dist/
                          └──► Executes 'bun dist/index.js' as non-root user 'bun'
```

### Build & Run Docker Image

```bash
# 1. Build production image
bun run build:docker

# Or build directly with docker CLI
docker build -t localoco:latest .

# 2. Run container
docker run -d \
  --name localoco \
  -p 4001:4001 \
  --env-file .env.production \
  localoco:latest
```

---

## 3. Environment Variable Matrix

The following environment variables control production application runtime:

### Server Environment Variables (Secrets & Backend Settings)

| Variable                | Type    | Required | Description                                     | Example                                    |
| :---------------------- | :------ | :------- | :---------------------------------------------- | :----------------------------------------- |
| `NODE_ENV`              | Enum    | Yes      | Environment mode (`production`, `development`)  | `production`                               |
| `DATABASE_URL`          | URL     | Yes      | PostgreSQL connection string                    | `postgres://user:pass@db:5432/app`         |
| `BETTER_AUTH_SECRET`    | String  | Yes      | Encryption secret for Better Auth (>= 32 chars) | `super-secret-production-key-32ch`         |
| `SMTP_HOST`             | String  | Yes      | Production SMTP host                            | `smtp.sendgrid.net`                        |
| `SMTP_PORT`             | Number  | Yes      | Production SMTP port                            | `587`                                      |
| `SMTP_SECURE`           | Boolean | Yes      | Enable SSL/TLS for SMTP                         | `true`                                     |
| `SMTP_USER`             | String  | Yes      | SMTP authentication username                    | `apikey`                                   |
| `SMTP_PASS`             | String  | Yes      | SMTP authentication password                    | `your-smtp-password`                       |
| `SMTP_FROM`             | String  | Yes      | Default sender email address                    | `noreply@yourdomain.com`                   |
| `AWS_ACCESS_KEY_ID`     | String  | Yes      | S3 / MinIO access key                           | `AKIAIOSFODNN7EXAMPLE`                     |
| `AWS_SECRET_ACCESS_KEY` | String  | Yes      | S3 / MinIO secret key                           | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION`            | String  | Yes      | AWS S3 region                                   | `us-east-1`                                |
| `AWS_S3_ENDPOINT`       | String  | Yes      | S3 API endpoint URL                             | `https://s3.amazonaws.com`                 |
| `AWS_S3_BUCKET`         | String  | Yes      | Storage bucket name                             | `my-production-bucket`                     |
| `FORCE_PATH_STYLE`      | Boolean | Yes      | Set true for MinIO, false for AWS S3            | `false`                                    |
| `SENTRY_DSN`            | URL     | No       | Server Sentry DSN for error tracing             | `https://key@sentry.io/123`                |

### Client Environment Variables (Injected via `/api/runtime.js`)

| Variable          | Type | Required | Description                                  | Example                      |
| :---------------- | :--- | :------- | :------------------------------------------- | :--------------------------- |
| `VITE_APP_URL`    | URL  | Yes      | Public application URL                       | `https://app.yourdomain.com` |
| `VITE_SENTRY_DSN` | URL  | No       | Client Sentry DSN for browser error tracking | `https://key@sentry.io/456`  |

---

## 4. Manual Standalone Deployment

If deploying directly to a Virtual Private Server (VPS) without Docker:

```bash
# 1. Install dependencies
bun install --frozen-lockfile

# 2. Build backend and frontend bundles
bun run build

# 3. Start production server
NODE_ENV=production bun dist/index.js
```

---

## 5. Reverse Proxy Setup (Nginx Example)

In production, place a reverse proxy (such as Nginx, Caddy, or Cloudflare) in front of the container to manage SSL/TLS termination and HTTP/2:

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. Health Checks & Monitoring

- **Health Endpoint**: `GET http://localhost:4001/health`
  - Response (`200 OK`): `{"status": "ok"}`
- **Docker Healthcheck Spec**:
  ```dockerfile
  HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4001/health || exit 1
  ```
