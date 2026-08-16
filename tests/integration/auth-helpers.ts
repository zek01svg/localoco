import type { AppType } from "#server/index";
import type { AuthSession, AuthUser } from "#server/lib/auth-middleware";
import type { Hono, MiddlewareHandler } from "hono";

import { PostgreSqlContainer } from "@testcontainers/postgresql";

import { spawnSync } from "node:child_process";

export type TestAppEnv = {
  Variables: {
    requestId: string;
    user: AuthUser | undefined;
    session: AuthSession | undefined;
  };
};

export const runMigrate = (url: string) => {
  const result = spawnSync("bun x drizzle-kit migrate", {
    shell: true,
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: "test", DATABASE_URL: url },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Migration failed: ${result.stdout} ${result.stderr}`);
  }
};

export async function startPostgresContainer() {
  const container = await new PostgreSqlContainer("postgres:17-alpine").start();
  const databaseUrl = container.getConnectionUri();
  runMigrate(databaseUrl);
  return { container, databaseUrl };
}

export function extractSessionCookie(res: Response): string {
  const cookie = res.headers.get("set-cookie") ?? "";
  const match = cookie.match(/localoco\.session_token=([^;]+)/u);
  if (!match) {
    throw new Error("Missing session cookie in response");
  }
  return `localoco.session_token=${match[1]}`;
}

export function registerUser(
  testAppInstance: Hono<TestAppEnv>,
  payload: { name: string; email: string; password: string }
) {
  return testAppInstance.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:4000",
    },
    body: JSON.stringify(payload),
  });
}

export async function createTestHonoApp(
  baseApp: AppType,
  requireAuthMw: MiddlewareHandler,
  requireVerifiedMw: MiddlewareHandler,
  logger: {
    warning: (_msg: string, _props: Record<string, unknown>) => void;
    error: (_err: Error, _props: Record<string, unknown>) => void;
  }
): Promise<Hono<TestAppEnv>> {
  const { Hono: HonoConstructor } = await import("hono");
  const { createErrorHandler } = await import("#server/lib/errors");

  const appInstance = new HonoConstructor<TestAppEnv>()
    .use(async (c, next) => {
      const requestId = crypto.randomUUID();
      c.set("requestId", requestId);
      c.header("X-Request-Id", requestId);
      await next();
    })
    .get("/api/test-protected", requireAuthMw, c => {
      const u = c.get("user");
      return c.json({ ok: true, userId: u?.id });
    })
    .post("/api/test-verified-mutation", requireAuthMw, requireVerifiedMw, c => {
      const u = c.get("user");
      return c.json({ ok: true, mutatedBy: u?.id });
    })
    .route("/", baseApp);

  appInstance.onError(createErrorHandler({ logger }));
  return appInstance;
}
