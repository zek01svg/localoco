import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";

import { profileUserRouter } from "./profile.routes";
import { vouchersUserRouter } from "./vouchers.routes";

const userRouter = new Hono()
  .route("/", profileUserRouter)
  .route("/", vouchersUserRouter);

userRouter
  .get("/openapi", (c, next) =>
    openAPIRouteHandler(userRouter, {
      documentation: {
        info: {
          title: "User API",
          version: "1.0.0",
          description: "API for managing localoco user profiles and vouchers",
        },
      },
    })(c, next)
  )
  .get(
    "/scalar",
    Scalar({
      url: "/api/users/openapi",
      theme: "deepSpace",
    })
  );

export default userRouter;
