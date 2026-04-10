import { Scalar } from "@scalar/hono-api-reference";
import { env } from "@server/env";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";

import { managementAnnouncementRouter } from "./management.routes";
import { publicAnnouncementRouter } from "./public.routes";

const announcementRouter = new Hono()
  .route("/", publicAnnouncementRouter)
  .route("/", managementAnnouncementRouter);

announcementRouter
  .get(
    "/openapi",
    openAPIRouteHandler(announcementRouter, {
      documentation: {
        info: {
          title: "Announcement API",
          version: "1.0.0",
          description: "Localoco announcement APIs",
        },
        servers: [
          { url: `http://localhost:${env.PORT}`, description: "Local Server" },
        ],
      },
    })
  )
  .get(
    "/scalar",
    Scalar({
      url: "/api/announcements/openapi",
      theme: "deepSpace",
    })
  );

export default announcementRouter;
