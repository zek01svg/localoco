import type { Context, Next } from "hono";
import auth from "@server/lib/auth";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

/**
 * This middleware checks the session for a valid user, and is mounted onto protected routes.
 * 
 */
const protectRoute = createMiddleware(async (c: Context, next: Next) => {
    const session = await auth.api.getSession({
        headers: c.req.raw.headers,
    });

    if (!session) {
        throw new HTTPException(401, {
            message: "Unauthorized ",
        });
    }

    await next();
});

export default protectRoute;
