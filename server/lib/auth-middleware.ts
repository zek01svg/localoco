import type { Env, MiddlewareHandler } from "hono";

import { and, eq } from "drizzle-orm";

import { administrator, business, ownedBy } from "#server/database/business";
import { auth } from "#server/lib/auth";
import { db } from "#server/lib/db";
import { HttpError } from "#server/lib/errors";

// The narrow identity a handler may rely on. Everything else is the client's
// business, not the request's.
export interface AuthContext {
  userId: string;
  emailVerified: boolean;
  isAdmin: boolean;
}

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext | undefined;
    authResolved: boolean | undefined;
  }
}

/**
 * The single authorization boundary. Resolves the User once per request and
 * derives the administrator role from the database on every request. Exposes
 * only the identity a handler actually needs, never a client claim.
 */
export const resolveAuth: MiddlewareHandler = async (c, next) => {
  if (!c.get("authResolved")) {
    const sessionData = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (sessionData) {
      const [adminRow] = await db
        .select({ userId: administrator.userId })
        .from(administrator)
        .where(eq(administrator.userId, sessionData.user.id))
        .limit(1);

      c.set("auth", {
        userId: sessionData.user.id,
        emailVerified: sessionData.user.emailVerified,
        isAdmin: Boolean(adminRow),
      });
    }
    c.set("authResolved", true);
  }

  await next();
};

/**
 * Requires a valid active session. Authentication failure is 401 and reveals
 * nothing about the requested resource.
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  await resolveAuth(c, async () => {
    if (!c.get("auth")) {
      throw new HttpError(401, "unauthorized", "Authentication required");
    }
    await next();
  });
};

/**
 * Requires an authenticated user with a verified email. Unverified users can
 * sign in but cannot mutate protected content.
 */
export const requireVerified: MiddlewareHandler = async (c, next) => {
  await requireAuth(c, async () => {
    if (!c.get("auth")?.emailVerified) {
      throw new HttpError(403, "forbidden", "Email verification required to perform this action");
    }
    await next();
  });
};

/**
 * Requires a verified administrator. The role is derived from the database
 * on every request; it is never inferred from a client claim.
 */
export const requireAdmin: MiddlewareHandler = async (c, next) => {
  await requireVerified(c, async () => {
    if (!c.get("auth")?.isAdmin) {
      throw new HttpError(403, "forbidden", "Administrator role required");
    }
    await next();
  });
};

/**
 * Route policy for Business-scoped resources. Resolves the Business through
 * the ownership predicate and answers 404 for both a missing Business and one
 * the actor may not touch, so nothing about resource existence leaks.
 */
export const requireBusinessOwner: MiddlewareHandler<Env, "/:id"> = async (c, next) => {
  await requireVerified(c, async () => {
    const actor = c.get("auth");
    if (!actor) {
      throw new HttpError(401, "unauthorized", "Authentication required");
    }

    const { id } = c.req.param();
    const rows = await db
      .select({ id: business.id })
      .from(business)
      .where(and(eq(business.id, id), ownedBy(actor)))
      .limit(1);
    if (rows.length === 0) {
      throw new HttpError(404, "not_found", "Business not found");
    }
    await next();
  });
};
