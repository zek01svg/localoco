import {
  createPostSchema,
  createReplySchema,
  updatePostLikesSchema,
  updateReplyLikesSchema,
} from "@server/database/schema";
import protectRoute from "@server/middleware/protect-route";
import { Hono } from "hono";
import { describeRoute, validator, resolver } from "hono-openapi";
import { z } from "zod/v4";

import { HydratedForumPostSchema } from "../../validation-schemas/forum";
import {
  createForumPost,
  createForumReply,
  likeForumPost,
  likeForumReply,
} from "./forum.service";

export const managementForumRouter = new Hono()
  /**
   * this route creates a new forum post
   */
  .post(
    "/new-post",
    describeRoute({
      summary: "Create new forum post",
      responses: {
        201: {
          description: "Created",
          content: {
            "application/json": {
              schema: resolver(z.object({ message: z.string() })),
            },
          },
        },
      },
    }),
    validator("json", createPostSchema),
    protectRoute,
    async (c) => {
      const postData = c.req.valid("json");
      const session = c.get("session");
      const email = session?.user.email ?? "";
      await createForumPost({ ...postData, email });
      return c.json({ message: "Forum post created successfully" }, 201);
    }
  )

  /**
   * this route creates a new reply for a forum post
   */
  .post(
    "/new-reply",
    describeRoute({
      summary: "Create new forum reply",
      responses: {
        201: {
          description: "Created",
          content: {
            "application/json": {
              schema: resolver(z.object({ message: z.string() })),
            },
          },
        },
      },
    }),
    validator("json", createReplySchema),
    protectRoute,
    async (c) => {
      const replyData = c.req.valid("json");
      const session = c.get("session");
      const email = session?.user.email ?? "";
      await createForumReply({ ...replyData, email });
      return c.json(
        { message: "Reply to forum post created successfully" },
        201
      );
    }
  )

  /**
   * this route updates the likes for forum posts
   */
  .put(
    "/like-forum-post",
    describeRoute({
      summary: "Like forum post",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  updatedPost: HydratedForumPostSchema,
                  message: z.string(),
                })
              ),
            },
          },
        },
      },
    }),
    validator("json", updatePostLikesSchema),
    protectRoute,
    async (c) => {
      const payload = c.req.valid("json");
      const updatedPost = await likeForumPost({
        postId: payload.postId,
        clicked: payload.clicked,
      });
      return c.json(
        {
          updatedPost,
          message: "Post likes updated successfully",
        },
        200
      );
    }
  )

  /**
   * this route updates the likes for forum replies
   */
  .put(
    "/like-forum-reply",
    describeRoute({
      summary: "Like forum reply",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(
                z.object({ updatedPostReply: z.any(), message: z.string() })
              ),
            },
          },
        },
      },
    }),
    validator("json", updateReplyLikesSchema),
    protectRoute,
    async (c) => {
      const payload = c.req.valid("json");
      const updated = await likeForumReply({
        replyId: payload.replyId,
        clicked: payload.clicked,
      });
      return c.json(
        {
          updatedPostReply: updated,
          message: "Post reply likes updated successfully",
        },
        200
      );
    }
  );
