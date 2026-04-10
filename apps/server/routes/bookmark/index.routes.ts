import { Scalar } from "@scalar/hono-api-reference";
import {
  getUserBookmarksSchema,
  updateBookmarksSchema,
} from "@server/database/schema";
import { env } from "@server/env";
import protectRoute from "@server/middleware/protect-route";
import { Hono } from "hono";
import {
  describeRoute,
  openAPIRouteHandler,
  validator,
  resolver,
} from "hono-openapi";
import { z } from "zod/v4";

import { getUserBookmarks, updateBookmark } from "./bookmark.service";

export const bookmarkRouter = new Hono()
  /**
   * this route gets all the bookmarked businesses of a user
   */
  .get(
    "/:userId/bookmarks",
    describeRoute({
      summary: "Get all bookmarks for a user",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(
                z.array(
                  z.object({
                    id: z.string(),
                    uen: z.string(),
                    userId: z.string(),
                    createdAt: z.string().or(z.date()).nullable(),
                  })
                )
              ),
            },
          },
        },
      },
    }),
    protectRoute,
    validator("param", getUserBookmarksSchema),
    async (c) => {
      const { userId } = c.req.valid("param");
      const bookmarks = await getUserBookmarks(userId);
      return c.json(bookmarks, 200);
    }
  )

  /**
   * this route handles a bookmark button click
   */
  .put(
    "/update-bookmark",
    describeRoute({
      summary: "Add or remove an item from bookmarks",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(z.object({ message: z.string() })),
            },
          },
        },
      },
    }),
    protectRoute,
    validator("json", updateBookmarksSchema),
    async (c) => {
      const { clicked, uen } = c.req.valid("json");
      const userId = c.get("session")?.user.id ?? "";
      await updateBookmark({ clicked, userId, uen });
      return c.json({ message: "User bookmarks updated successfully" }, 200);
    }
  );

bookmarkRouter
  .get(
    "/openapi",
    openAPIRouteHandler(bookmarkRouter, {
      documentation: {
        info: {
          title: "Bookmark API",
          version: "1.0.0",
          description: "Localoco bookmark APIs",
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
      url: "/api/bookmarks/openapi",
      theme: "deepSpace",
    })
  );

export default bookmarkRouter;
