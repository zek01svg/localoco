import { and, asc, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";

import { bookmark } from "#server/database/bookmark";
import { business } from "#server/database/business";
import { listing } from "#server/database/listing";
import { requireAuth, requireVerified } from "#server/lib/auth-middleware";
import { db } from "#server/lib/db";
import { HttpError, onValidationError } from "#server/lib/errors";
import {
  bookmarkActionResponseSchema,
  bookmarkCreateSchema,
  bookmarkItemSchema,
  bookmarksQuerySchema,
  bookmarksResponseSchema,
  bookmarkSchema,
  bookmarkStatusResponseSchema,
} from "#shared/contracts/bookmarks";
import { errorEnvelopeSchema } from "#shared/contracts/error";

const dependencyMessage = "Bookmarks are temporarily unavailable. Try again shortly.";

const authErrorResponses = {
  401: {
    description: "Authentication required",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
} as const;

const mutationErrorResponses = {
  400: {
    description: "Request parameters failed validation",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  401: {
    description: "Authentication required",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  403: {
    description: "Email verification required to bookmark businesses",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  404: {
    description: "The Business does not exist",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  503: {
    description: "The bookmark data source is temporarily unavailable",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
} as const;

export const bookmarksRoutes = new Hono()
  .get(
    "/bookmarks",
    requireAuth,
    validator("query", bookmarksQuerySchema, onValidationError),
    describeRoute({
      operationId: "listBookmarks",
      tags: ["bookmarks"],
      summary: "List the session user's bookmarks",
      description:
        "Cursor-paginated list of the authenticated User's bookmarked Businesses and published Listings. Only the owning User can see their bookmarks. The response is private and never cached publicly.",
      responses: {
        200: {
          description: "A page of bookmarked businesses",
          content: { "application/json": { schema: resolver(bookmarksResponseSchema) } },
        },
        400: {
          description: "Query parameters failed validation",
          content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
        },
        ...authErrorResponses,
        503: {
          description: "The bookmark data source is temporarily unavailable",
          content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
        },
      },
    }),
    async c => {
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }

      const { limit, cursor } = c.req.valid("query");

      let rows;
      try {
        rows = await db
          .select({
            bookmarkId: bookmark.id,
            businessId: bookmark.businessId,
            createdAt: bookmark.createdAt,
            businessUen: business.uen,
            listingId: listing.id,
            listingName: listing.name,
            listingCategory: listing.category,
            listingAddress: listing.address,
            listingPostalCode: listing.postalCode,
            listingLatitude: listing.latitude,
            listingLongitude: listing.longitude,
            listingPhone: listing.phone,
            listingEmail: listing.email,
            listingWebsite: listing.website,
            listingPaymentOptions: listing.paymentOptions,
            listingPriceRange: listing.priceRange,
          })
          .from(bookmark)
          .innerJoin(business, eq(bookmark.businessId, business.id))
          .leftJoin(
            listing,
            and(eq(listing.businessId, business.id), eq(listing.status, "published"))
          )
          .where(
            and(eq(bookmark.userId, actor.userId), cursor ? gt(bookmark.id, cursor) : undefined)
          )
          .orderBy(asc(bookmark.id))
          .limit(limit + 1);
      } catch (cause) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, { cause });
      }

      const items = [];
      for (const row of rows) {
        const item = {
          id: row.bookmarkId,
          businessId: row.businessId,
          createdAt: row.createdAt,
          business: {
            id: row.businessId,
            uen: row.businessUen,
          },
          listing: row.listingId
            ? {
                id: row.listingId,
                name: row.listingName,
                category: row.listingCategory,
                address: row.listingAddress,
                postalCode: row.listingPostalCode,
                latitude: row.listingLatitude,
                longitude: row.listingLongitude,
                phone: row.listingPhone,
                email: row.listingEmail,
                website: row.listingWebsite,
                paymentOptions: row.listingPaymentOptions,
                priceRange: row.listingPriceRange,
              }
            : null,
        };

        const parsed = bookmarkItemSchema.safeParse(item);
        if (!parsed.success) {
          throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
            cause: new Error("data seam returned a row that violates the bookmark item contract"),
          });
        }
        items.push(parsed.data);
      }

      const page = items.slice(0, limit);
      const nextCursor = items.length > limit ? (page.at(-1)?.id ?? null) : null;

      c.header("Cache-Control", "private, no-store");
      return c.json({ items: page, nextCursor });
    }
  )
  .post(
    "/bookmarks",
    requireVerified,
    validator("json", bookmarkCreateSchema, onValidationError),
    describeRoute({
      operationId: "addBookmark",
      tags: ["bookmarks"],
      summary: "Bookmark a Business for the session user",
      description:
        "Saves a reference to a Business for later access. Idempotent: repeated taps return the bookmark without error. Enforced by a unique constraint on (user_id, business_id).",
      responses: {
        200: {
          description: "The business was bookmarked",
          content: { "application/json": { schema: resolver(bookmarkActionResponseSchema) } },
        },
        ...mutationErrorResponses,
      },
    }),
    async c => {
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }

      const { businessId } = c.req.valid("json");

      let bizRows;
      try {
        bizRows = await db
          .select({ id: business.id })
          .from(business)
          .where(eq(business.id, businessId))
          .limit(1);
      } catch (cause) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, { cause });
      }

      if (bizRows.length === 0) {
        throw new HttpError(404, "not_found", "Business not found");
      }

      let bookmarkRow;
      try {
        const inserted = await db
          .insert(bookmark)
          .values({
            userId: actor.userId,
            businessId,
          })
          .onConflictDoNothing()
          .returning({
            id: bookmark.id,
            businessId: bookmark.businessId,
            createdAt: bookmark.createdAt,
          });

        if (inserted.length > 0) {
          bookmarkRow = inserted[0];
        } else {
          const existing = await db
            .select({
              id: bookmark.id,
              businessId: bookmark.businessId,
              createdAt: bookmark.createdAt,
            })
            .from(bookmark)
            .where(and(eq(bookmark.userId, actor.userId), eq(bookmark.businessId, businessId)))
            .limit(1);

          if (existing.length === 0) {
            throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
              cause: new Error("failed to insert or load bookmark row"),
            });
          }
          bookmarkRow = existing[0];
        }
      } catch (cause) {
        if (cause instanceof HttpError) {
          throw cause;
        }
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, { cause });
      }

      const parsed = bookmarkSchema.safeParse(bookmarkRow);
      if (!parsed.success) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause: new Error("data seam returned a row that violates the bookmark contract"),
        });
      }

      c.header("Cache-Control", "private, no-store");
      return c.json({
        status: "bookmarked",
        bookmark: parsed.data,
      });
    }
  )
  .delete(
    "/bookmarks/:businessId",
    requireVerified,
    describeRoute({
      operationId: "removeBookmark",
      tags: ["bookmarks"],
      summary: "Remove a Business bookmark for the session user",
      description:
        "Removes a saved bookmark. Idempotent: removing a bookmark that was already removed or does not exist succeeds without error.",
      responses: {
        200: {
          description: "The bookmark was removed",
          content: { "application/json": { schema: resolver(bookmarkActionResponseSchema) } },
        },
        ...mutationErrorResponses,
      },
    }),
    async c => {
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }

      const { businessId } = c.req.param();

      try {
        await db
          .delete(bookmark)
          .where(and(eq(bookmark.userId, actor.userId), eq(bookmark.businessId, businessId)));
      } catch (cause) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, { cause });
      }

      c.header("Cache-Control", "private, no-store");
      return c.json({ status: "removed" });
    }
  )
  .get(
    "/bookmarks/:businessId",
    requireAuth,
    describeRoute({
      operationId: "getBookmarkStatus",
      tags: ["bookmarks"],
      summary: "Check if a Business is bookmarked by the session user",
      description: "Returns whether the authenticated User has bookmarked the specified Business.",
      responses: {
        200: {
          description: "The bookmark status",
          content: { "application/json": { schema: resolver(bookmarkStatusResponseSchema) } },
        },
        ...authErrorResponses,
        503: {
          description: "The bookmark data source is temporarily unavailable",
          content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
        },
      },
    }),
    async c => {
      const actor = c.get("auth");
      if (!actor) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }

      const { businessId } = c.req.param();

      let rows;
      try {
        rows = await db
          .select({
            id: bookmark.id,
            businessId: bookmark.businessId,
            createdAt: bookmark.createdAt,
          })
          .from(bookmark)
          .where(and(eq(bookmark.userId, actor.userId), eq(bookmark.businessId, businessId)))
          .limit(1);
      } catch (cause) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, { cause });
      }

      c.header("Cache-Control", "private, no-store");
      if (rows.length === 0) {
        return c.json({ bookmarked: false, bookmark: null });
      }

      const parsed = bookmarkSchema.safeParse(rows[0]);
      if (!parsed.success) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause: new Error("data seam returned a row that violates the bookmark contract"),
        });
      }

      return c.json({ bookmarked: true, bookmark: parsed.data });
    }
  );
