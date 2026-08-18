import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import postgres from "postgres";

import { business, ownedBy } from "#server/database/business";
import { listing } from "#server/database/listing";
import { requireBusinessOwner, requireVerified } from "#server/lib/auth-middleware";
import { db } from "#server/lib/db";
import { HttpError, onValidationError } from "#server/lib/errors";
import {
  businessCreationResponseSchema,
  businessCreateSchema,
  businessSchema,
  businessesQuerySchema,
  businessesResponseSchema,
  businessUpdateSchema,
} from "#shared/contracts/business";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import { ownerListingSchema, ownerListingUpdateSchema } from "#shared/contracts/listings";

const privateErrorResponses = {
  400: {
    description: "Request parameters failed validation",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  401: {
    description: "Authentication required",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  403: {
    description: "Email verification or role required",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  404: {
    description: "The Business does not exist or the actor may not touch it",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  409: {
    description: "A Business with this UEN already exists",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  429: {
    description: "Too many requests",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
} as const;

const dependencyMessage = "Businesses and listings are temporarily unavailable. Try again shortly.";

// Drizzle wraps driver errors in DrizzleQueryError; the PostgreSQL error
// (with its SQLSTATE code) is its cause. This unwraps one level and checks
// the violating constraint, so only a duplicate UEN answers 409 — a 23505
// raised by some other constraint is not misreported as a UEN conflict.
const isUniqueViolation = (cause: unknown): boolean => {
  const driverError = cause instanceof Error ? cause.cause : undefined;
  return (
    driverError instanceof postgres.PostgresError &&
    driverError.code === "23505" &&
    driverError.constraint_name === "business_uen_unique"
  );
};

const ownerListingColumns = {
  id: listing.id,
  status: listing.status,
  name: listing.name,
  category: listing.category,
  address: listing.address,
  postalCode: listing.postalCode,
  phone: listing.phone,
  email: listing.email,
  website: listing.website,
  paymentOptions: listing.paymentOptions,
  priceRange: listing.priceRange,
} as const;

export const businessesRoutes = new Hono()
  .get(
    "/businesses",
    requireVerified,
    validator("query", businessesQuerySchema, onValidationError),
    describeRoute({
      operationId: "listOwnedBusinesses",
      tags: ["businesses"],
      summary: "List the session user's businesses",
      description:
        "Private list of the Businesses owned by the authenticated user. The optional selected query parameter is a UI convenience the client uses to say which owned Business it is viewing; it is never an authorization input.",
      responses: {
        200: {
          description: "The user's businesses",
          content: { "application/json": { schema: resolver(businessesResponseSchema) } },
        },
        ...privateErrorResponses,
      },
    }),
    async c => {
      const auth = c.get("auth");
      if (!auth) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }

      const { selected } = c.req.valid("query");
      const rows = await db
        .select({ id: business.id, uen: business.uen })
        .from(business)
        .where(eq(business.ownerId, auth.userId))
        .orderBy(asc(business.createdAt));

      // Personalized response: never enters a shared cache.
      c.header("Cache-Control", "private, no-store");
      return c.json({
        items: rows,
        selectedId: selected && rows.some(row => row.id === selected) ? selected : null,
      });
    }
  )
  .post(
    "/businesses",
    requireVerified,
    validator("json", businessCreateSchema, onValidationError),
    describeRoute({
      operationId: "createBusinessWithDraftListing",
      tags: ["businesses"],
      summary: "Create a Business and its draft Listing",
      description:
        "Atomically creates a Business and its one-to-one draft Listing in a single transaction. The owner is derived from the session; any submitted owner identifier is stripped by validation. UEN uniqueness is enforced by the database constraint, so two concurrent requests for the same UEN resolve to exactly one success.",
      responses: {
        201: {
          description: "The created Business and its draft Listing",
          content: {
            "application/json": { schema: resolver(businessCreationResponseSchema) },
          },
        },
        ...privateErrorResponses,
      },
    }),
    async c => {
      const auth = c.get("auth");
      if (!auth) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }

      const { uen, listing: listingInput } = c.req.valid("json");

      try {
        const created = await db.transaction(async tx => {
          const [biz] = await tx
            .insert(business)
            .values({ ownerId: auth.userId, uen })
            .returning({ id: business.id, uen: business.uen });

          const [draft] = await tx
            .insert(listing)
            .values({ businessId: biz.id, status: "draft", ...listingInput })
            .returning(ownerListingColumns);

          return { id: biz.id, uen: biz.uen, listing: draft };
        });

        return c.json(created, 201);
      } catch (cause) {
        // The unique constraint on the normalized UEN is the arbiter: a
        // concurrent request that passed a prior read is rejected here.
        if (isUniqueViolation(cause)) {
          throw new HttpError(
            409,
            "conflict",
            "A Business with this UEN already exists",
            undefined,
            {
              cause,
            }
          );
        }
        throw cause;
      }
    }
  )
  .get(
    "/businesses/:id/listing",
    requireBusinessOwner,
    describeRoute({
      operationId: "getOwnedListing",
      tags: ["businesses"],
      summary: "View an owned Listing",
      description:
        "Returns the Listing of a Business the actor owns or administers, including its draft/published state. A missing or unauthorized Business answers 404, revealing nothing about its existence.",
      responses: {
        200: {
          description: "The owned Listing",
          content: { "application/json": { schema: resolver(ownerListingSchema) } },
        },
        ...privateErrorResponses,
      },
    }),
    async c => {
      const { id } = c.req.param();
      const rows = await db
        .select(ownerListingColumns)
        .from(listing)
        .where(eq(listing.businessId, id))
        .limit(1);

      if (rows.length === 0) {
        throw new HttpError(404, "not_found", "Business not found");
      }

      const parsed = ownerListingSchema.safeParse(rows[0]);
      if (!parsed.success) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause: new Error("data seam returned a row that violates the listing contract"),
        });
      }
      return c.json(parsed.data);
    }
  )
  .patch(
    "/businesses/:id/listing",
    requireBusinessOwner,
    validator("json", ownerListingUpdateSchema, onValidationError),
    describeRoute({
      operationId: "updateOwnedListing",
      tags: ["businesses"],
      summary: "Update an owned Listing",
      description:
        "Updates the fields of a Listing the actor owns or administers. The target Business is resolved through the ownership predicate; a submitted owner identifier is stripped by validation. Only provided fields change.",
      responses: {
        200: {
          description: "The updated Listing",
          content: { "application/json": { schema: resolver(ownerListingSchema) } },
        },
        ...privateErrorResponses,
      },
    }),
    async c => {
      const auth = c.get("auth");
      if (!auth) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }

      const { id } = c.req.param();
      const update = c.req.valid("json");

      // The write predicate runs at the mutation boundary, mirroring
      // PATCH /businesses/:id: the Business may have changed hands since the
      // authorization read in requireBusinessOwner. Locking the Business row
      // first means a concurrent ownership change parks this transaction until
      // it commits, and the predicate is then re-evaluated against the latest
      // state.
      const rows = await db.transaction(async tx => {
        const locked = await tx
          .select({ id: business.id })
          .from(business)
          .where(and(eq(business.id, id), ownedBy(auth)))
          .for("update")
          .limit(1);
        if (locked.length === 0) {
          return [];
        }
        return tx
          .update(listing)
          .set({ ...update, updatedAt: new Date() })
          .where(eq(listing.businessId, id))
          .returning(ownerListingColumns);
      });

      if (rows.length === 0) {
        throw new HttpError(404, "not_found", "Business not found");
      }

      const parsed = ownerListingSchema.safeParse(rows[0]);
      if (!parsed.success) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause: new Error("data seam returned a row that violates the listing contract"),
        });
      }
      return c.json(parsed.data);
    }
  )
  .patch(
    "/businesses/:id",
    requireBusinessOwner,
    validator("json", businessUpdateSchema, onValidationError),
    describeRoute({
      operationId: "updateBusiness",
      tags: ["businesses"],
      summary: "Update an owned Business",
      description:
        "Updates a Business the actor owns or administers. Ownership and role are enforced in the database write predicate inside the transaction, not only by an earlier read.",
      responses: {
        200: {
          description: "The updated Business",
          content: { "application/json": { schema: resolver(businessSchema) } },
        },
        ...privateErrorResponses,
      },
    }),
    async c => {
      const auth = c.get("auth");
      if (!auth) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }

      const { id } = c.req.param();
      const { uen } = c.req.valid("json");

      // The write predicate runs at the mutation boundary: the row may have
      // changed hands since the authorization read in requireBusinessOwner,
      // and the predicate is re-evaluated by the database against the latest
      // state.
      try {
        const updated = await db
          .update(business)
          .set({ uen, updatedAt: new Date() })
          .where(and(eq(business.id, id), ownedBy(auth)))
          .returning({ id: business.id, uen: business.uen });

        if (updated.length === 0) {
          throw new HttpError(404, "not_found", "Business not found");
        }
        return c.json(updated[0]);
      } catch (cause) {
        if (isUniqueViolation(cause)) {
          throw new HttpError(
            409,
            "conflict",
            "A Business with this UEN already exists",
            undefined,
            {
              cause,
            }
          );
        }
        throw cause;
      }
    }
  );
