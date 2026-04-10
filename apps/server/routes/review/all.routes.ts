import {
  deleteReviewSchema,
  getBusinessReviewsSchema,
  newReviewSchema,
  updateReviewLikesSchema,
  updateReviewSchema,
} from "@server/database/schema";
import protectRoute from "@server/middleware/protect-route";
import { Hono } from "hono";
import { describeRoute, validator, resolver } from "hono-openapi";
import { z } from "zod/v4";

import { HydratedReviewSchema } from "../../validation-schemas/review";
import {
  deleteReview,
  getReviewsByUen,
  likeReview,
  submitReview,
  updateReview,
} from "./review.service";

export const allReviewRouter = new Hono()
  /**
   * this route fetches all the reviews for a business
   */
  .get(
    "/:uen/reviews",
    describeRoute({
      summary: "Get reviews by UEN",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(z.array(HydratedReviewSchema)),
            },
          },
        },
      },
    }),
    validator("param", getBusinessReviewsSchema),
    async (c) => {
      const { uen } = c.req.valid("param");
      const reviews = await getReviewsByUen(uen);
      return c.json(reviews, 200);
    }
  )

  /**
   * this route handles submissions for user reviews for businesses
   */
  .post(
    "/submit-review",
    describeRoute({
      summary: "Submit review",
      responses: {
        201: {
          description: "Created",
          content: {
            "application/json": {
              schema: resolver(
                z.object({ message: z.string(), pointsEarned: z.number() })
              ),
            },
          },
        },
      },
    }),
    validator("json", newReviewSchema),
    protectRoute,
    async (c) => {
      const review = c.req.valid("json");
      const email = c.get("session")?.user.email ?? "";
      await submitReview({ ...review, email });
      return c.json(
        {
          message: "Review added successfully",
          pointsEarned: 5,
        },
        201
      );
    }
  )

  /**
   * this route handles submissions for updated user reviews for businesses
   */
  .put(
    "/update-review",
    validator("json", updateReviewSchema),
    protectRoute,
    async (c) => {
      const payload = c.req.valid("json");
      await updateReview(payload);
      return c.json({ message: "Review updated successfully" }, 200);
    }
  )

  /**
   * this route handles deletion of user reviews
   */
  .delete(
    "/delete-review",
    describeRoute({
      summary: "Delete review",
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
    validator("json", deleteReviewSchema),
    protectRoute,
    async (c) => {
      const payload = c.req.valid("json");
      await deleteReview(payload);
      return c.json({ message: "Review deleted successfully" }, 200);
    }
  )

  /**
   * this route updates the likes for reviews
   */
  .put(
    "/like-review",
    describeRoute({
      summary: "Like review",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  updatedReview: HydratedReviewSchema,
                  message: z.string(),
                })
              ),
            },
          },
        },
      },
    }),
    validator("json", updateReviewLikesSchema),
    protectRoute,
    async (c) => {
      const payload = c.req.valid("json");
      const updatedReview = await likeReview(payload);
      return c.json(
        {
          updatedReview,
          message: "Review likes updated successfully",
        },
        200
      );
    }
  );
