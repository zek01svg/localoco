import { checkUenAvailabilitySchema } from "@server/database/schema";
import { Hono } from "hono";
import { describeRoute, validator, resolver } from "hono-openapi";
import { z } from "zod/v4";

import { checkUenAvailability } from "./business.service";

export const verificationBusinessRouter = new Hono()
  /**
   * Checks if a UEN is already registered.
   */
  .get(
    "/check-uen",
    describeRoute({
      summary: "Check UEN availability",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(z.object({ uenAvailability: z.boolean() })),
            },
          },
        },
      },
    }),
    validator("query", checkUenAvailabilitySchema),
    async (c) => {
      const { uen } = c.req.valid("query");
      const exists = await checkUenAvailability(uen);
      return c.json({ uenAvailability: exists }, 200);
    }
  );
