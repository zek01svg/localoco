import {
  getBusinessByUenSchema,
  getFilteredBusinessesSchema,
  searchBusinessByNameSchema,
} from "@server/database/schema";
import type { FilterOptions } from "@shared/types/business.types";
import { Hono } from "hono";
import { describeRoute, validator, resolver } from "hono-openapi";
import { z } from "zod/v4";

import { HydratedBusinessSchema } from "../../validation-schemas/business";
import {
  getAllBusinesses,
  getFilteredBusinesses,
  getBusinessByUen,
  searchBusinessesByName,
} from "./business.service";

export const publicBusinessRouter = new Hono()
  /**
   * Retrieves all businesses.
   */
  .get(
    "/",
    describeRoute({
      summary: "Get all businesses",
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
    async (c) => {
      const businesses = await getAllBusinesses();
      return c.json(businesses, 200);
    }
  )

  /**
   * Retrieves businesses based on applied filters.
   */
  .post(
    "/filter",
    describeRoute({
      summary: "Filter",
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
    validator("json", getFilteredBusinessesSchema),
    async (c) => {
      const filters = c.req.valid("json") as any as FilterOptions;
      const filteredBusinesses = await getFilteredBusinesses(filters);
      return c.json(filteredBusinesses, 200);
    }
  )

  /**
   * Searches for businesses by name.
   */
  .get(
    "/search",
    describeRoute({
      summary: "Search",
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
    validator("query", searchBusinessByNameSchema),
    async (c) => {
      const { name } = c.req.valid("query");
      const results = await searchBusinessesByName(name);
      return c.json(results, 200);
    }
  )

  /**
   * Retrieves a single business by its UEN.
   */
  .get(
    "/:uen",
    describeRoute({
      summary: "Get business by UEN",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(HydratedBusinessSchema),
            },
          },
        },
      },
    }),
    validator("param", getBusinessByUenSchema),
    async (c) => {
      const { uen } = c.req.valid("param");
      const business = await getBusinessByUen(uen);
      return c.json(business, 200);
    }
  );
