import auth from "@server/lib/auth";
import type { AppVariables } from "@server/lib/types";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

/**
 * This middleware checks the session for a valid user, and is mounted onto protected routes.
 * It stores the session in the context for downstream handlers to consume without re-fetching.
 */
const protectRoute = createMiddleware<{ Variables: AppVariables }>(
  async (c, next) => {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      throw new HTTPException(401, {
        message: "Unauthorized",
      });
    }

    c.set("session", session);
    await next();
  }
);

export default protectRoute;
