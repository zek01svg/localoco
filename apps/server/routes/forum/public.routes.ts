import { getPostsByUenSchema } from "@server/database/schema";
import { Hono } from "hono";
import { describeRoute, validator, resolver } from "hono-openapi";
import { z } from "zod/v4";

import { HydratedForumPostSchema } from "../../validation-schemas/forum";
import { getForumPosts, getForumPostsByUen } from "./forum.service";

export const publicForumRouter = new Hono()
  /**
   * this route fetches all forum posts
   */
  .get(
    "/",
    describeRoute({
      summary: "Get all forum posts",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(z.array(HydratedForumPostSchema)),
            },
          },
        },
      },
    }),
    async (c) => {
      const posts = await getForumPosts();
      return c.json(posts, 200);
    }
  )

  /**
   * this route fetches all forum posts tagged to a business
   */
  .get(
    "/:uen",
    describeRoute({
      summary: "Get forum posts by business UEN",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(z.array(HydratedForumPostSchema)),
            },
          },
        },
      },
    }),
    validator("param", getPostsByUenSchema),
    async (c) => {
      const { uen } = c.req.valid("param");
      const posts = await getForumPostsByUen(uen);
      return c.json(posts, 200);
    }
  );
