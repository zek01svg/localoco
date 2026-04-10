import {
  deleteProfileSchema,
  updateProfileSchema,
  checkEmailAvailabilitySchema,
} from "@server/database/schema";
import protectRoute from "@server/middleware/protect-route";
import verifyOwnership from "@server/utils/verify-ownership";
import { Hono } from "hono";
import { describeRoute, validator, resolver } from "hono-openapi";
import { z } from "zod/v4";

import {
  checkEmailAvailability,
  deleteUserProfile,
  getAuthProvider,
  getUserProfile,
  updateUserProfile,
} from "./user.service";

export const profileUserRouter = new Hono()
  /**
   * get user profile by ID
   */
  .get(
    "/profile/:userId",
    describeRoute({
      summary: "Get user profile by ID",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  profile: z.any(),
                  points: z.number(),
                  reviews: z.array(z.any()),
                  vouchers: z.array(z.any()),
                  successfulReferrals: z.number(),
                })
              ),
            },
          },
        },
      },
    }),
    validator("param", z.object({ userId: z.string() })),
    protectRoute,
    async (c) => {
      const { userId } = c.req.valid("param");
      const userData = await getUserProfile(userId);
      return c.json(userData, 200);
    }
  )

  /**
   * get user's auth provider (Google, email/password, etc.)
   */
  .get(
    "/get-auth-provider/:userId",
    describeRoute({
      summary: "Get user auth provider",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(z.string()),
            },
          },
        },
      },
    }),
    validator("param", z.object({ userId: z.string() })),
    protectRoute,
    async (c) => {
      const { userId } = c.req.valid("param");
      const provider = await getAuthProvider(userId);
      return c.json(provider, 200);
    }
  )

  /**
   * update user profile
   */
  .put(
    "/update-profile",
    describeRoute({
      summary: "Update user profile",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(
                z.object({ updatedUser: z.any(), message: z.string() })
              ),
            },
          },
        },
      },
    }),
    validator("json", updateProfileSchema),
    protectRoute,
    async (c) => {
      const updateProfileData = c.req.valid("json");
      await verifyOwnership(c, updateProfileData.id);
      const updatedUser = await updateUserProfile(updateProfileData);
      return c.json(
        {
          updatedUser,
          message: "User profile updated successfully",
        },
        200
      );
    }
  )

  /**
   * delete user
   */
  .delete(
    "/delete-profile",
    describeRoute({
      summary: "Delete user profile",
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
    validator("json", deleteProfileSchema),
    protectRoute,
    async (c) => {
      const payload = c.req.valid("json");
      await verifyOwnership(c, payload.id);
      await deleteUserProfile(payload.id);
      return c.json({ message: "Profile deleted successfully" }, 200);
    }
  )

  /**
   * Check email uniqueness
   */
  .get(
    "/check-email",
    describeRoute({
      summary: "Check email availability",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(z.object({ available: z.boolean() })),
            },
          },
        },
      },
    }),
    validator("query", checkEmailAvailabilitySchema),
    async (c) => {
      const { email } = c.req.valid("query");
      const available = await checkEmailAvailability(email);
      return c.json({ available }, 200);
    }
  );
