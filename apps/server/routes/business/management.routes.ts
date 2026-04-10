import {
  deleteBusinessSchema,
  getOwnedBusinessesSchema,
  registerBusinessSchema,
  updateBusinessSchema,
} from "@server/database/schema";
import protectRoute from "@server/middleware/protect-route";
import verifyOwnership from "@server/utils/verify-ownership";
import { Hono } from "hono";
import { describeRoute, validator, resolver } from "hono-openapi";
import { z } from "zod/v4";

import { HydratedBusinessSchema } from "../../validation-schemas/business";
import {
  deleteBusinessByUen,
  getOwnedBusinesses,
  registerBusiness,
  requireBusinessByUen,
  updateBusiness,
} from "./business.service";

export const managementBusinessRouter = new Hono()
  /**
   * Retrieves owned businesses by owner ID.
   */
  .get(
    "/:ownerId/owned",
    describeRoute({
      summary: "Owned businesses",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(z.array(HydratedBusinessSchema)),
            },
          },
        },
      },
    }),
    protectRoute,
    async (c) => {
      const ownerId = c.req.param("ownerId");
      // Standard schema checks
      const validationResult = getOwnedBusinessesSchema.safeParse({ ownerId });
      if (!validationResult.success) throw validationResult.error;
      await verifyOwnership(c, validationResult.data.ownerId);
      const ownedBusinesses = await getOwnedBusinesses(
        validationResult.data.ownerId
      );
      return c.json(ownedBusinesses, 200);
    }
  )

  /**
   * Registers a business and sends a confirmation email.
   */
  .post(
    "/register-business",
    describeRoute({
      summary: "Register business",
      responses: {
        201: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(z.object({ message: z.string() })),
            },
          },
        },
      },
    }),
    validator("json", registerBusinessSchema),
    protectRoute,
    async (c) => {
      const business = c.req.valid("json");
      const session = c.get("session");
      const ownerId = session?.user.id ?? "";
      await registerBusiness({ ...business, ownerId });
      return c.json({ message: "Business has been registered" }, 201);
    }
  )

  /**
   * Updates an existing business's details.
   */
  .put(
    "/update-business",
    describeRoute({
      summary: "Update business",
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
    validator("json", updateBusinessSchema),
    protectRoute,
    async (c) => {
      const business = c.req.valid("json");
      await verifyOwnership(c, business.ownerId);
      await updateBusiness(business);
      return c.json({ message: "Business has been updated successfully" }, 200);
    }
  )

  /**
   * Deletes a business by its UEN.
   */
  .delete(
    "/delete-business",
    describeRoute({
      summary: "Delete business",
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
    validator("json", deleteBusinessSchema),
    protectRoute,
    async (c) => {
      const { uen } = c.req.valid("json");
      const business = await requireBusinessByUen(uen);
      await verifyOwnership(c, business.ownerId);
      await deleteBusinessByUen(uen, business.ownerId);
      return c.json({ message: "Business has been deleted successfully" }, 200);
    }
  );
