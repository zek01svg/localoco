import type { SQL, SQLWrapper } from "drizzle-orm";

import { and, asc, eq, gt, gte, lte, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";

import { business } from "#server/database/business";
import { businessHours } from "#server/database/business-hours";
import { listing } from "#server/database/listing";
import { mediaObject } from "#server/database/media";
import { getOrSetCache } from "#server/lib/cache";
import { db } from "#server/lib/db";
import { HttpError, onValidationError } from "#server/lib/errors";
import { hoursRowToEntry, isOpenNowCondition } from "#server/lib/opening-hours";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  listingSchema,
  listingsCategoriesResponseSchema,
  listingsQuerySchema,
  listingsResponseSchema,
  publicListingDetailSchema,
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
        "Cursor-paginated list of published business listings, ordered by stable id. Draft and moderated Listings are never returned here. `q` filters by normalized text search across name, category, and address; `category` narrows to an exact category; `openNow` filters to businesses open right now in Singapore time; `north`, `south`, `east`, `west` filter by map viewport bounding box coordinates.",
      responses: {
        200: {
          description: "A page of listings",
          content: { "application/json": { schema: resolver(listingsResponseSchema) } },
        },
        400: {
          description: "Request parameters failed validation",
          content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
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
      const { limit, cursor, q, category, openNow, north, south, east, west } =
        c.req.valid("query");
      // Only the unfiltered directory is cached: filtered pages are transient
      // (each keystroke, category change, or map pan is a distinct query) and
      // would otherwise grow the cache unboundedly. The key carries no query text,
      // so no two filter combinations can ever collide on it.
      const cacheKey = `listings:${cursor ?? "first"}:${limit}`;

      const hasBounds =
        north !== undefined && south !== undefined && east !== undefined && west !== undefined;
      const boundsCondition = hasBounds
        ? and(
            sql`${listing.latitude} is not null`,
            sql`${listing.longitude} is not null`,
            gte(listing.latitude, south),
            lte(listing.latitude, north),
            west <= east
              ? and(gte(listing.longitude, west), lte(listing.longitude, east))
              : or(gte(listing.longitude, west), lte(listing.longitude, east))
          )
        : undefined;

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
              description: listing.description,
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
                openNow ? isOpenNowCondition() : undefined,
                q
                  ? or(
                      containsNormalized(listing.name, q),
                      containsNormalized(listing.category, q),
                      containsNormalized(listing.address, q),
                      sql`${listing.description} is not null and ${containsNormalized(listing.description, q)}`
                    )
                  : undefined,
                boundsCondition
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

      const hasFilters = Boolean(q) || Boolean(category) || Boolean(openNow) || hasBounds;
      const data = hasFilters ? await loadPage() : await getOrSetCache(cacheKey, 60, loadPage);

      return c.json(data);
    }
  )
  .get(
    "/listings/:id",
    describeRoute({
      operationId: "getListingDetail",
      tags: ["listings"],
      summary: "Get a published business listing by ID",
      description:
        "Returns the canonical details of a single published Listing by its ID, including UEN, address, contact options, opening hours, and active photos. Draft, rejected, or suspended Listings return 404.",
      responses: {
        200: {
          description: "The public listing detail",
          content: { "application/json": { schema: resolver(publicListingDetailSchema) } },
        },
        400: {
          description: "Invalid listing ID format",
          content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
        },
        404: {
          description: "The listing does not exist or is not published",
          content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
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
      const { id } = c.req.param();
      if (!id || id.trim().length === 0) {
        throw new HttpError(400, "invalid_request", "Listing ID is required");
      }

      const listingRows = await loadOrDependencyFailure(() =>
        db
          .select({
            id: listing.id,
            businessId: listing.businessId,
            uen: business.uen,
            name: listing.name,
            category: listing.category,
            description: listing.description,
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
          .innerJoin(business, eq(listing.businessId, business.id))
          .where(and(eq(listing.id, id), eq(listing.status, "published")))
          .limit(1)
      );

      if (listingRows.length === 0) {
        throw new HttpError(404, "not_found", "Listing not found");
      }

      const listingRow = listingRows[0];

      // Batched parallel queries for hours and active photos with no fan-out
      const [hoursRows, photoRows] = await loadOrDependencyFailure(() =>
        Promise.all([
          db
            .select({
              day: businessHours.day,
              is24h: businessHours.is24h,
              openMinute: businessHours.openMinute,
              closeMinute: businessHours.closeMinute,
            })
            .from(businessHours)
            .where(eq(businessHours.businessId, listingRow.businessId))
            .orderBy(asc(businessHours.day)),
          db
            .select({
              id: mediaObject.id,
              contentType: mediaObject.contentType,
              size: mediaObject.size,
            })
            .from(mediaObject)
            .where(
              and(
                eq(mediaObject.businessId, listingRow.businessId),
                eq(mediaObject.status, "active"),
                eq(mediaObject.purpose, "listing_photo")
              )
            )
            .orderBy(asc(mediaObject.createdAt)),
        ])
      );

      const hours = hoursRows.map(hoursRowToEntry);
      const photos = photoRows.map(p => ({
        id: p.id,
        contentType: p.contentType,
        size: p.size,
        url: `/api/media/${p.id}`,
      }));

      const parsed = publicListingDetailSchema.safeParse({
        ...listingRow,
        hours,
        photos,
      });

      if (!parsed.success) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause: new Error("data seam returned a row that violates the listing detail contract"),
        });
      }

      return c.json(parsed.data);
    }
  );
