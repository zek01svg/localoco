import { asc, gt } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";

import { listing } from "#server/database/listing";
import { db } from "#server/lib/db";
import { HttpError, onValidationError } from "#server/lib/errors";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  listingSchema,
  listingsQuerySchema,
  listingsResponseSchema,
} from "#shared/contracts/listings";

const dependencyMessage = "Listings are temporarily unavailable. Try again shortly.";

export const listingsRoutes = new Hono().get(
  "/listings",
  validator("query", listingsQuerySchema, onValidationError),
  describeRoute({
    operationId: "listListings",
    tags: ["listings"],
    summary: "List public business listings",
    description:
      "Cursor-paginated list of publicly visible business listings, ordered by stable id.",
    responses: {
      200: {
        description: "A page of listings",
        content: { "application/json": { schema: resolver(listingsResponseSchema) } },
      },
      503: {
        description: "The listing data source is temporarily unavailable",
        content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
      },
    },
  }),
  async c => {
    const { limit, cursor } = c.req.valid("query");

    let rows;
    try {
      rows = await db
        .select({
          id: listing.id,
          name: listing.name,
          category: listing.category,
          address: listing.address,
          postalCode: listing.postalCode,
        })
        .from(listing)
        .where(cursor ? gt(listing.id, cursor) : undefined)
        .orderBy(asc(listing.id))
        .limit(limit + 1);
    } catch (cause) {
      // A dependency failure is never a success or an empty collection.
      throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
        cause,
      });
    }

    const items = [];
    for (const row of rows) {
      const parsed = listingSchema.safeParse(row);
      if (!parsed.success) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause: new Error("data seam returned a row that violates the listing contract"),
        });
      }
      items.push(parsed.data);
    }

    const page = items.slice(0, limit);
    const nextCursor = items.length > limit ? (page.at(-1)?.id ?? null) : null;
    return c.json({ items: page, nextCursor });
  }
);
