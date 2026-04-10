import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";

import { managementBusinessRouter } from "./management.routes";
import { publicBusinessRouter } from "./public.routes";
import { verificationBusinessRouter } from "./verification.routes";

const businessRouter = new Hono()
  .route("/", verificationBusinessRouter)
  .route("/", managementBusinessRouter)
  .route("/", publicBusinessRouter);

businessRouter
  .get("/openapi", (c, next) =>
    openAPIRouteHandler(businessRouter, {
      documentation: {
        info: {
          title: "Business API",
          version: "1.0.0",
          description: "API for managing localoco businesses",
        },
      },
    })(c, next)
  )
  .get(
    "/scalar",
    Scalar({
      url: "/api/businesses/openapi",
      theme: "deepSpace",
    })
  );

export default businessRouter;
