import type { AuthSession, AuthUser } from "#shared/contracts/auth";
import type { MiddlewareHandler } from "hono";

import { auth } from "#server/lib/auth";
import { HttpError } from "#server/lib/errors";

export type { AuthSession, AuthUser };

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser | undefined;
    session: AuthSession | undefined;
  }
}

/**
 * Middleware that requires a valid active session.
 * Derives user and session state directly from the database.
 * Sets `user` and `session` on the Hono context.
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const sessionData = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!sessionData) {
    throw new HttpError(401, "unauthorized", "Authentication required");
  }

  c.set("user", sessionData.user);
  c.set("session", sessionData.session);

  await next();
};

/**
 * Middleware that requires the authenticated user's email to be verified.
 * Derives verification status from the database, never from client claims.
 * Rejects unverified users with HTTP 403 Forbidden.
 */
export const requireVerified: MiddlewareHandler = async (c, next) => {
  const checkVerified = async () => {
    const user = c.get("user");
    if (!user?.emailVerified) {
      throw new HttpError(403, "forbidden", "Email verification required to perform this action");
    }
    await next();
  };

  if (c.get("user")) {
    await checkVerified();
    return;
  }

  await requireAuth(c, checkVerified);
};
