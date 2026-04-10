import { Scalar } from "@scalar/hono-api-reference";
import protectRoute from "@server/middleware/protect-route";
import { Hono } from "hono";
import { describeRoute, openAPIRouteHandler, resolver } from "hono-openapi";
import { z } from "zod/v4";

import { uploadFile } from "./file.service";

const fileRouter = new Hono()
  /**
   * Handles simple multipart file uploads
   */
  .post(
    "/upload",
    describeRoute({
      summary: "Upload file",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  url: z.string(),
                  path: z.string(),
                  bucket: z.string(),
                })
              ),
            },
          },
        },
      },
    }),
    protectRoute,
    async (c) => {
      try {
        const body = await c.req.parseBody();
        const file = body.file instanceof File ? body.file : null;
        const bucket = typeof body.bucket === "string" ? body.bucket : "";
        const outcome = await uploadFile(bucket, file);
        if (!outcome.ok) {
          return c.json({ error: outcome.error }, 500);
        }

        return c.json(outcome.data);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: message }, 500);
      }
    }
  );

fileRouter
  .get("/openapi", (c, next) =>
    openAPIRouteHandler(fileRouter, {
      documentation: {
        info: {
          title: "File API",
          version: "1.0.0",
          description: "API for uploading localoco media assets",
        },
      },
    })(c, next)
  )
  .get(
    "/scalar",
    Scalar({
      url: "/api/files/openapi",
      theme: "deepSpace",
    })
  );

export default fileRouter;
