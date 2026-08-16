import type { Server } from "node:http";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod/v4";

import { classifyEmailError } from "#server/lib/email/classifier";

import { createServer } from "node:http";

async function startFakeEmailServer(
  onRequest: (entry: { method: string; body: unknown }) => void,
  getResponse: () => { status: number; body: Record<string, unknown> }
): Promise<{ server: Server; port: number }> {
  const fakeServer = createServer((req, res) => {
    let body = "";
    req.on("data", chunk => {
      body += typeof chunk === "string" ? chunk : String(chunk);
    });
    req.on("end", () => {
      let parsedBody: unknown = null;
      try {
        parsedBody = body ? JSON.parse(body) : null;
      } catch {
        parsedBody = body;
      }

      onRequest({
        method: req.method ?? "GET",
        body: parsedBody,
      });

      const { status, body: respBody } = getResponse();
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(respBody));
    });
  });

  const port = await new Promise<number>(resolve => {
    fakeServer.listen(0, "127.0.0.1", () => {
      const addr = fakeServer.address();
      resolve(typeof addr === "object" && addr ? addr.port : 0);
    });
  });

  return { server: fakeServer, port };
}

describe("Local HTTP Fake Contract Tests", () => {
  let fakeServer: Server;
  let serverPort = 0;
  let fakeStatus = 200;
  let fakeResponse: Record<string, unknown> = { id: "resend_http_fake_123" };
  const receivedRequests: Array<{ method: string; body: unknown }> = [];

  beforeAll(async () => {
    const started = await startFakeEmailServer(
      req => {
        receivedRequests.push(req);
      },
      () => ({ status: fakeStatus, body: fakeResponse })
    );
    fakeServer = started.server;
    serverPort = started.port;
  });

  afterAll(async () => {
    await new Promise<void>(resolve => {
      fakeServer.close(() => {
        resolve();
      });
    });
  });

  beforeEach(() => {
    fakeStatus = 200;
    fakeResponse = { id: "resend_http_fake_123" };
    receivedRequests.length = 0;
  });

  it("handles successful delivery against local HTTP fake provider", async () => {
    const res = await fetch(`http://127.0.0.1:${serverPort}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "test@example.com",
        subject: "Test via HTTP fake",
        html: "<p>Hello</p>",
      }),
    });
    const parsed = z.object({ id: z.string() }).parse(await res.json());

    expect(parsed.id).toBe("resend_http_fake_123");
    expect(receivedRequests).toHaveLength(1);
    expect(receivedRequests[0]?.body).toHaveProperty("to", "test@example.com");
  });

  it("classifies 429 rate limit from local HTTP fake as retryable", async () => {
    fakeStatus = 429;
    fakeResponse = { message: "Too many requests", name: "rate_limit_exceeded" };

    const res = await fetch(`http://127.0.0.1:${serverPort}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "test@example.com" }),
    });
    const data: unknown = await res.json();
    const classified = classifyEmailError(res.status, data);

    expect(classified.isRetryable).toBe(true);
    expect(classified.classification).toBe("retryable");
  });

  it("classifies 422 unprocessable entity from local HTTP fake as terminal", async () => {
    fakeStatus = 422;
    fakeResponse = { message: "Invalid email syntax", name: "validation_error" };

    const res = await fetch(`http://127.0.0.1:${serverPort}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "invalid" }),
    });
    const data: unknown = await res.json();
    const classified = classifyEmailError(res.status, data);

    expect(classified.isRetryable).toBe(false);
    expect(classified.classification).toBe("terminal");
  });
});
