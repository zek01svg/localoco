import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";

import { managementForumRouter } from "./management.routes";
import { publicForumRouter } from "./public.routes";

const forumRouter = new Hono()
  .route("/", publicForumRouter)
  .route("/", managementForumRouter);

forumRouter
  .get("/openapi", (c, next) =>
    openAPIRouteHandler(forumRouter as any, {
      documentation: {
        info: {
          title: "Forum API",
          version: "1.0.0",
          description: "API for managing localoco forum posts",
        },
      },
    })(c, next)
  )
  .get(
    "/scalar",
    Scalar({
      url: "/api/forum/openapi",
      theme: "deepSpace",
    })
  );

export default forumRouter;
