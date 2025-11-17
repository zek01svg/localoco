import auth from "../lib/auth";
import { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

const protectRoute = createMiddleware(async (c:Context, next:Next)=>{
    
    const session = await auth.api.getSession({ 
        headers: c.req.raw.headers 
    });

    if (!session) {
        throw new HTTPException(
            401, {
            message: "Unauthorized "
        })
    }

    await next()
})

export default protectRoute