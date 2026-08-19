import type { SQL, SQLWrapper } from "drizzle-orm";

import { and, asc, eq, gt, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";

import { listing } from "#server/database/listing";
import { getOrSetCache } from "#server/lib/cache";
import { db } from "#server/lib/db";
import { HttpError, onValidationError } from "#server/lib/errors";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  listingSchema,
  listingsCategoriesResponseSchema,
  listingsQuerySchema,
  listingsResponseSchema,
} from "#shared/contracts/listings";

const dependencyMessage = "Listings are temporarily unavailable. Try again shortly.";

// Case- and whitespace-insensitive containment: both the query text and the
// stored column are folded and whitespace-collapsed before matching, so minor
// formatting differences never hide a Listing. Ordering stays deterministic
// (id ascending); search is a filter, never a ranking signal.
// ponytail: no trigram index or fuzzy ranking; add pg_trgm when the directory
// grows enough for a seq scan to matter or typo tolerance is requested.
function containsNormalized(column: SQLWrapper, q: string): SQL {
  const normalizedQ = q.toLowerCase().replaceAll(/\s+/g, " ");
  const pattern = `%${normalizedQ.replaceAll(/[\\%_]/g, match => `\\${match}`)}%`;
  // "\\s+" so the cooked template keeps a literal backslash in the SQL text;
  // PostgreSQL then parses '\s+' as the regexp whitespace class.
  return sql`lower(regexp_replace(${column}, '\\s+', ' ', 'g')) like ${pattern}`;
}

async function loadOrDependencyFailure<T>(load: () => PromiseLike<T>): Promise<T> {
  try {
    return await load();
  } catch (cause) {
    // A dependency failure is never a success or an empty collection.
    throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
      cause,
    });
  }
}

export const listingsRoutes = new Hono()
  .get(
    "/listings/categories",
    describeRoute({
      operationId: "listListingCategories",
      tags: ["listings"],
      summary: "List published listing categories",
      description:
        "The distinct categories of published Listings, ordered ascending. These are the intended values for the category filter; an unknown value simply matches nothing.",
      responses: {
        200: {
          description: "Distinct published categories",
          content: {
            "application/json": { schema: resolver(listingsCategoriesResponseSchema) },
          },
        },
        429: {
          description: "Too many requests",
          content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
        },
        503: {
          description: "The listing data source is temporarily unavailable",
          content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
        },
      },
    }),
    async c => {
      const data = await getOrSetCache("listings:categories", 60, async () => {
        const rows = await loadOrDependencyFailure(() =>
          db
            .selectDistinct({ category: listing.category })
            .from(listing)
            .where(eq(listing.status, "published"))
            .orderBy(asc(listing.category))
        );
        return { items: rows.map(row => row.category) };
      });

      return c.json(data);
    }
  )
  .get(
    "/listings",
    validator("query", listingsQuerySchema, onValidationError),
    describeRoute({
      operationId: "listListings",
      tags: ["listings"],
      summary: "List public business listings",
      description:
        "Cursor-paginated list of published business listings, ordered by stable id. Draft and moderated Listings are never returned here. `q` filters by normalized text search across name, category, and address; `category` narrows to an exact category.",
      responses: {
        200: {
          description: "A page of listings",
          content: { "application/json": { schema: resolver(listingsResponseSchema) } },
        },
        429: {
          description: "Too many requests",
          content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
        },
        503: {
          description: "The listing data source is temporarily unavailable",
          content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
        },
      },
    }),
    async c => {
      const { limit, cursor, q, category } = c.req.valid("query");
      // Only the unfiltered directory is cached: filtered pages are transient
      // (each keystroke or category change is a distinct query) and would
      // otherwise grow the cache unboundedly. The key carries no query text,
      // so no two filter combinations can ever collide on it.
      const cacheKey = `listings:${cursor ?? "first"}:${limit}`;

      const loadPage = async () => {
        const rows = await loadOrDependencyFailure(() =>
          db
            .select({
              id: listing.id,
              name: listing.name,
              category: listing.category,
              address: listing.address,
              postalCode: listing.postalCode,
              latitude: listing.latitude,
              longitude: listing.longitude,
              phone: listing.phone,
              email: listing.email,
              website: listing.website,
              paymentOptions: listing.paymentOptions,
              priceRange: listing.priceRange,
            })
            .from(listing)
            .where(
              and(
                eq(listing.status, "published"),
                cursor ? gt(listing.id, cursor) : undefined,
                category ? eq(listing.category, category) : undefined,
                q
                  ? or(
                      containsNormalized(listing.name, q),
                      containsNormalized(listing.category, q),
                      containsNormalized(listing.address, q)
                    )
                  : undefined
              )
            )
            .orderBy(asc(listing.id))
            .limit(limit + 1)
        );

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
        return { items: page, nextCursor };
      };

      const data = q || category ? await loadPage() : await getOrSetCache(cacheKey, 60, loadPage);

      return c.json(data);
    }
  );
