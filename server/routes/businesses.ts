import type { Coordinates, GeocodeFailureKind } from "#server/lib/geocoding";
import type { ListingStatus } from "#shared/contracts/listings";

import { and, asc, eq, exists } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import postgres from "postgres";

import { account, user } from "#server/database/auth";
import { business, businessOwnershipAudit, ownedBy } from "#server/database/business";
import { businessHours } from "#server/database/business-hours";
import { listing, listingModerationAudit } from "#server/database/listing";
import { requireAdmin, requireBusinessOwner, requireVerified } from "#server/lib/auth-middleware";
import { db } from "#server/lib/db";
import { HttpError, onValidationError } from "#server/lib/errors";
import { geocodeAddress, GeocodeError } from "#server/lib/geocoding";
import { entryToHoursRow, hoursRowToEntry } from "#server/lib/opening-hours";
import {
  businessCreationResponseSchema,
  businessCreateSchema,
  businessSchema,
  businessesQuerySchema,
  businessesResponseSchema,
  businessUpdateSchema,
  ownershipTransferSchema,
} from "#shared/contracts/business";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  listingAuditsResponseSchema,
  listingModerationActionSchema,
  ownerListingSchema,
  ownerListingUpdateSchema,
} from "#shared/contracts/listings";

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
    description: "Conflict with current resource state or unique constraint",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  429: {
    description: "Too many requests",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  503: {
    description: "A dependency (data source or address validation) is temporarily unavailable",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
} as const;

const dependencyMessage = "Businesses and listings are temporarily unavailable. Try again shortly.";

// Classified geocoding failures map to explicit HTTP responses: a 503 for
// provider trouble (quota, outage, misconfiguration — retry later), a 400 for
// addresses the provider could not validate precisely. There is no fallback:
// an address that cannot be validated never reaches the database.
const geocodeErrorResponses: Record<
  GeocodeFailureKind,
  { status: 400 | 503; code: "invalid_request" | "dependency_unavailable"; message: string }
> = {
  not_found: {
    status: 400,
    code: "invalid_request",
    message: "We could not find that address. Check the address and postal code.",
  },
  ambiguous: {
    status: 400,
    code: "invalid_request",
    message:
      "The address could not be matched precisely enough. Add a unit number, street name, or postal code.",
  },
  quota_exhausted: {
    status: 503,
    code: "dependency_unavailable",
    message:
      "Address validation is temporarily unavailable because its provider limit was reached. Try again later.",
  },
  provider_unavailable: {
    status: 503,
    code: "dependency_unavailable",
    message: "Address validation is temporarily unavailable. Try again shortly.",
  },
  invalid_response: {
    status: 503,
    code: "dependency_unavailable",
    message: "Address validation is temporarily unavailable. Try again shortly.",
  },
};

const toGeocodingHttpError = (cause: unknown): HttpError => {
  if (cause instanceof GeocodeError) {
    const { status, code, message } = geocodeErrorResponses[cause.kind];
    return new HttpError(status, code, message, { reason: cause.kind }, { cause });
  }
  throw cause;
};

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

// The schedule's database-level guards: the unique (business, day) index and
// the overlap trigger. Both are backstops — the schedule schema rejects the
// same inputs at the boundary — so a hit here answers 409 conflict, exactly
// like a concurrent duplicate UEN.
const isHoursConflict = (cause: unknown): boolean => {
  const driverError = cause instanceof Error ? cause.cause : undefined;
  if (!(driverError instanceof postgres.PostgresError)) {
    return false;
  }
  if (
    driverError.code === "23505" &&
    driverError.constraint_name === "business_hours_business_day_unique"
  ) {
    return true;
  }
  return (
    driverError.code === "P0001" && driverError.message.includes("business_hours_overlap_check")
  );
};

// The hours rows of a Business as the owner contract expects them, sorted by
// day. Empty when the Business has recorded no hours.
const hoursFor = async (query: Pick<typeof db, "select">, businessId: string) => {
  const rows = await query
    .select({
      day: businessHours.day,
      is24h: businessHours.is24h,
      openMinute: businessHours.openMinute,
      closeMinute: businessHours.closeMinute,
    })
    .from(businessHours)
    .where(eq(businessHours.businessId, businessId))
    .orderBy(asc(businessHours.day));
  return rows.map(hoursRowToEntry);
};

const ownerListingColumns = {
  id: listing.id,
  status: listing.status,
  rejectionReason: listing.rejectionReason,
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

      // A duplicate UEN fails the whole request before any paid provider call;
      // the unique constraint remains the arbiter for the concurrent case.
      const existing = await db
        .select({ id: business.id })
        .from(business)
        .where(eq(business.uen, uen))
        .limit(1);
      if (existing.length > 0) {
        throw new HttpError(409, "conflict", "A Business with this UEN already exists");
      }

      // Address validation runs before the write: the geocoder is a network
      // call, so it must not hold the transaction open. The validated
      // coordinates are then stored in the same write as the address.
      let coordinates: Coordinates;
      try {
        coordinates = await geocodeAddress({
          address: listingInput.address,
          postalCode: listingInput.postalCode,
        });
      } catch (cause) {
        throw toGeocodingHttpError(cause);
      }

      try {
        const created = await db.transaction(async tx => {
          const [biz] = await tx
            .insert(business)
            .values({ ownerId: auth.userId, uen })
            .returning({ id: business.id, uen: business.uen });

          const [draft] = await tx
            .insert(listing)
            .values({
              businessId: biz.id,
              status: "draft",
              ...listingInput,
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
            })
            .returning(ownerListingColumns);

          // A new Business has no recorded hours by definition.
          return { id: biz.id, uen: biz.uen, listing: { ...draft, hours: [] } };
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
        "Returns the Listing of a Business the actor owns or administers, including its draft/published state and its opening-hours schedule. A missing or unauthorized Business answers 404, revealing nothing about its existence.",
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

      const parsed = ownerListingSchema.safeParse({
        ...rows[0],
        hours: await hoursFor(db, id),
      });
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
        "Updates the fields of a Listing the actor owns or administers. Editing a published Listing returns it to pending_review and removes it from public discovery until approved again. Only provided fields change. When the `hours` field is present it replaces the whole opening-hours schedule.",
      responses: {
        200: {
          description: "The updated Listing",
          content: { "application/json": { schema: resolver(ownerListingSchema) } },
        },
        ...privateErrorResponses,
        409: {
          description: "The submitted opening hours conflict with the stored schedule",
          content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
        },
      },
    }),
    async c => {
      const auth = c.get("auth");
      if (!auth) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }

      const { id } = c.req.param();
      const update = c.req.valid("json");
      const { hours, ...listingUpdate } = update;

      // The write predicate runs at the mutation boundary, mirroring
      // PATCH /businesses/:id: the Business may have changed hands since the
      // authorization read in requireBusinessOwner. The current address is
      // read under a FOR UPDATE lock on the Listing row inside the same
      // transaction: a concurrent address edit parks here until it commits,
      // then the geocode below runs against the latest committed address, so
      // the stored coordinates can never drift from the stored address.
      try {
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

          const current = await tx
            .select({
              status: listing.status,
              address: listing.address,
              postalCode: listing.postalCode,
            })
            .from(listing)
            .where(eq(listing.businessId, id))
            .for("update")
            .limit(1);
          if (current.length === 0) {
            return [];
          }

          // Geocoding happens only when the address or postal code changes — a
          // phone-only edit never costs a provider call. When only one of the
          // two fields changes, the current value of the other (read above,
          // under the lock) is used for the query.
          let coordinates: Coordinates | undefined;
          if (listingUpdate.address !== undefined || listingUpdate.postalCode !== undefined) {
            try {
              coordinates = await geocodeAddress({
                address: listingUpdate.address ?? current[0].address,
                postalCode: listingUpdate.postalCode ?? current[0].postalCode,
              });
            } catch (cause) {
              throw toGeocodingHttpError(cause);
            }
          }

          const isPublished = current[0].status === "published";
          const hasChanges =
            Object.keys(listingUpdate).length > 0 ||
            coordinates !== undefined ||
            hours !== undefined;

          if (Object.keys(listingUpdate).length > 0 || coordinates || (isPublished && hasChanges)) {
            await tx
              .update(listing)
              .set({
                ...listingUpdate,
                ...(coordinates
                  ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
                  : {}),
                ...(isPublished && hasChanges ? { status: "pending_review" } : {}),
                updatedAt: new Date(),
              })
              .where(eq(listing.businessId, id));
          }
          if (hours !== undefined) {
            await tx.delete(businessHours).where(eq(businessHours.businessId, id));
            if (hours.length > 0) {
              await tx
                .insert(businessHours)
                .values(hours.map(entry => ({ businessId: id, ...entryToHoursRow(entry) })));
            }
          }

          const [updated] = await tx
            .select(ownerListingColumns)
            .from(listing)
            .where(eq(listing.businessId, id))
            .limit(1);
          return [{ ...updated, hours: await hoursFor(tx, id) }];
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
      } catch (cause) {
        if (isHoursConflict(cause)) {
          throw new HttpError(
            409,
            "conflict",
            "The submitted opening hours conflict with the stored schedule",
            undefined,
            { cause }
          );
        }
        throw cause;
      }
    }
  )
  .post(
    "/businesses/:id/listing/submit",
    requireBusinessOwner,
    describeRoute({
      operationId: "submitListingForReview",
      tags: ["businesses", "listings"],
      summary: "Submit a draft or rejected Listing for review",
      description:
        "Transitions an owned draft or rejected Listing to pending_review. An already pending, published, or suspended Listing cannot be submitted.",
      responses: {
        200: {
          description: "The submitted Listing",
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

        const current = await tx
          .select({ status: listing.status })
          .from(listing)
          .where(eq(listing.businessId, id))
          .for("update")
          .limit(1);

        if (current.length === 0) {
          return [];
        }

        const currentStatus = current[0].status;
        if (currentStatus !== "draft" && currentStatus !== "rejected") {
          throw new HttpError(
            409,
            "conflict",
            `Cannot submit listing in '${currentStatus}' state for review`
          );
        }

        await tx
          .update(listing)
          .set({
            status: "pending_review",
            rejectionReason: null,
            updatedAt: new Date(),
          })
          .where(eq(listing.businessId, id));

        const [updated] = await tx
          .select(ownerListingColumns)
          .from(listing)
          .where(eq(listing.businessId, id))
          .limit(1);

        return [{ ...updated, hours: await hoursFor(tx, id) }];
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
  .post(
    "/businesses/:id/listing/moderate",
    requireAdmin,
    validator("json", listingModerationActionSchema, onValidationError),
    describeRoute({
      operationId: "moderateListing",
      tags: ["businesses", "listings", "admin"],
      summary: "Moderate a business Listing",
      description:
        "Administrative endpoint to publish, reject, or suspend a Listing with an immutable reason and audit record.",
      responses: {
        200: {
          description: "The moderated Listing",
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
      const { action, reason } = c.req.valid("json");

      const rows = await db.transaction(async tx => {
        const current = await tx
          .select({ id: listing.id, status: listing.status })
          .from(listing)
          .where(eq(listing.businessId, id))
          .for("update")
          .limit(1);

        if (current.length === 0) {
          return [];
        }

        const previousStatus = current[0].status;
        let nextStatus: ListingStatus;
        let nextRejectionReason: string | null = null;

        switch (action) {
          case "publish":
            if (previousStatus !== "pending_review" && previousStatus !== "suspended") {
              throw new HttpError(
                409,
                "conflict",
                `Cannot publish listing in '${previousStatus}' state`
              );
            }
            nextStatus = "published";
            nextRejectionReason = null;
            break;

          case "reject":
            if (previousStatus !== "pending_review") {
              throw new HttpError(
                409,
                "conflict",
                `Cannot reject listing in '${previousStatus}' state`
              );
            }
            nextStatus = "rejected";
            nextRejectionReason = reason;
            break;

          case "suspend":
            if (previousStatus !== "published") {
              throw new HttpError(
                409,
                "conflict",
                `Cannot suspend listing in '${previousStatus}' state`
              );
            }
            nextStatus = "suspended";
            nextRejectionReason = reason;
            break;
        }

        // Insert immutable audit record
        await tx.insert(listingModerationAudit).values({
          listingId: current[0].id,
          actorId: auth.userId,
          previousStatus,
          nextStatus,
          reason,
        });

        // Update listing status and rejection reason
        await tx
          .update(listing)
          .set({
            status: nextStatus,
            rejectionReason: nextRejectionReason,
            updatedAt: new Date(),
          })
          .where(eq(listing.businessId, id));

        const updatedRows = await tx
          .select(ownerListingColumns)
          .from(listing)
          .where(eq(listing.businessId, id))
          .limit(1);

        return [{ ...updatedRows[0], hours: await hoursFor(tx, id) }];
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
  .get(
    "/businesses/:id/listing/audit",
    requireAdmin,
    describeRoute({
      operationId: "getListingAuditHistory",
      tags: ["businesses", "listings", "admin"],
      summary: "Get listing moderation audit history",
      description:
        "Chronological audit trail of all administrative moderation actions performed on this Listing.",
      responses: {
        200: {
          description: "Listing audit history",
          content: { "application/json": { schema: resolver(listingAuditsResponseSchema) } },
        },
        ...privateErrorResponses,
      },
    }),
    async c => {
      const { id } = c.req.param();
      const listingRows = await db
        .select({ id: listing.id })
        .from(listing)
        .where(eq(listing.businessId, id))
        .limit(1);
      if (listingRows.length === 0) {
        throw new HttpError(404, "not_found", "Business not found");
      }

      const auditRows = await db
        .select({
          id: listingModerationAudit.id,
          listingId: listingModerationAudit.listingId,
          actorId: listingModerationAudit.actorId,
          previousStatus: listingModerationAudit.previousStatus,
          nextStatus: listingModerationAudit.nextStatus,
          reason: listingModerationAudit.reason,
          createdAt: listingModerationAudit.createdAt,
        })
        .from(listingModerationAudit)
        .where(eq(listingModerationAudit.listingId, listingRows[0].id))
        .orderBy(asc(listingModerationAudit.createdAt));

      const parsed = listingAuditsResponseSchema.safeParse({ items: auditRows });
      if (!parsed.success) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause: new Error("data seam returned an audit row that violates the contract"),
        });
      }
      return c.json(parsed.data);
    }
  )
  .post(
    "/businesses/:id/transfer-ownership",
    requireAdmin,
    validator("json", ownershipTransferSchema, onValidationError),
    describeRoute({
      operationId: "transferBusinessOwnership",
      tags: ["businesses", "admin"],
      summary: "Transfer a Business to another owner",
      description:
        "Administrative operation that moves a Business to another verified login User. Ownership is not an updatable field on any Business or Listing edit path: it can only change through this audited operation, which records the actor, previous owner, next owner, and reason.",
      responses: {
        200: {
          description: "The transferred Business",
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
      const { ownerId, reason } = c.req.valid("json");

      const rows = await db.transaction(async tx => {
        // The Business row is locked for the whole transfer: concurrent
        // ownership changes or edits serialize on it.
        const locked = await tx
          .select({ id: business.id, uen: business.uen, ownerId: business.ownerId })
          .from(business)
          .where(eq(business.id, id))
          .for("update")
          .limit(1);
        if (locked.length === 0) {
          return [];
        }

        const current = locked[0];
        if (current.ownerId === ownerId) {
          throw new HttpError(409, "conflict", "Business is already owned by that User");
        }

        // The target must be a real login User with a verified email. A user
        // row without any account (synthetic, cannot sign in) or without
        // verification is not a valid owner, and an absent id matches nothing.
        const target = await tx
          .select({ id: user.id })
          .from(user)
          .where(
            and(
              eq(user.id, ownerId),
              eq(user.emailVerified, true),
              exists(
                tx
                  .select({ userId: account.userId })
                  .from(account)
                  .where(eq(account.userId, user.id))
              )
            )
          )
          .limit(1);
        if (target.length === 0) {
          throw new HttpError(
            400,
            "invalid_request",
            "The target owner must be an existing verified User"
          );
        }

        await tx
          .update(business)
          .set({ ownerId, updatedAt: new Date() })
          .where(eq(business.id, id));

        await tx.insert(businessOwnershipAudit).values({
          businessId: id,
          actorId: auth.userId,
          previousOwnerId: current.ownerId,
          nextOwnerId: ownerId,
          reason,
        });

        return [{ id: current.id, uen: current.uen }];
      });

      if (rows.length === 0) {
        throw new HttpError(404, "not_found", "Business not found");
      }

      const parsed = businessSchema.safeParse(rows[0]);
      if (!parsed.success) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause: new Error("data seam returned a row that violates the business contract"),
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
