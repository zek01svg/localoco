import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";

import { allReviewRouter } from "./all.routes";

const reviewRouter = new Hono().route("/", allReviewRouter);

reviewRouter
  .get("/openapi", (c, next) =>
    openAPIRouteHandler(reviewRouter as any, {
      documentation: {
        info: {
          title: "Review API",
          version: "1.0.0",
          description: "API for managing localoco business reviews",
        },
      },
    })(c, next)
  )
  .get(
    "/scalar",
    Scalar({
      url: "/api/reviews/openapi",
      theme: "deepSpace",
    })
  );

export default reviewRouter;
