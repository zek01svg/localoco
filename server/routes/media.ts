import type { AuthContext } from "#server/lib/auth-middleware";

import { and, asc, count, eq } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";

import { business, ownedBy } from "#server/database/business";
import { mediaObject } from "#server/database/media";
import { requireBusinessOwner, requireVerified } from "#server/lib/auth-middleware";
import { db } from "#server/lib/db";
import { HttpError, onValidationError } from "#server/lib/errors";
import {
  deleteObject,
  mediaStorageConfigured,
  presignDownloadUrl,
  presignUploadUrl,
  statObject,
} from "#server/lib/media-storage";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  MAX_PHOTOS_PER_BUSINESS,
  mediaListResponseSchema,
  mediaObjectSchema,
  photoPresignRequestSchema,
  photoPresignResponseSchema,
} from "#shared/contracts/media";

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
    description: "Email verification required",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  404: {
    description: "The resource does not exist or the actor may not touch it",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  422: {
    description: "The upload violates a business rule (count or content limits)",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  503: {
    description: "Object storage is unavailable",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
} as const;

const dependencyMessage = "Photo storage is temporarily unavailable. Try again shortly.";

// Presigned grants are short-lived by design: long enough to upload, short
// enough that an abandoned grant self-expires.
const PRESIGN_UPLOAD_TTL_SECONDS = 15 * 60;
const PRESIGN_DOWNLOAD_TTL_SECONDS = 5 * 60;

const mediaRowColumns = {
  id: mediaObject.id,
  businessId: mediaObject.businessId,
  contentType: mediaObject.contentType,
  size: mediaObject.size,
  status: mediaObject.status,
  createdAt: mediaObject.createdAt,
} as const;

// The read predicate for media-scoped endpoints: the actor must own or
// administer the Business the object belongs to. A missing or unauthorized
// object answers 404, revealing nothing about its existence. `key` stays on
// the server — it is never returned to clients.
const mediaRowForActor = async (id: string, actor: AuthContext) => {
  const rows = await db
    .select({ ...mediaRowColumns, key: mediaObject.key, purpose: mediaObject.purpose })
    .from(mediaObject)
    .innerJoin(business, eq(mediaObject.businessId, business.id))
    .where(and(eq(mediaObject.id, id), ownedBy(actor)))
    .limit(1);
  return rows.length === 0 ? null : rows[0];
};

const parseMediaRow = (row: unknown): ReturnType<typeof mediaObjectSchema.safeParse> => {
  const parsed = mediaObjectSchema.safeParse(row);
  if (!parsed.success) {
    throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
      cause: new Error("data seam returned a row that violates the media contract"),
    });
  }
  return parsed;
};

const requireStorage = (): void => {
  if (!mediaStorageConfigured()) {
    throw new HttpError(503, "dependency_unavailable", dependencyMessage);
  }
};

export const mediaRoutes = new Hono()
  .post(
    "/businesses/:id/photos",
    requireBusinessOwner,
    validator("json", photoPresignRequestSchema, onValidationError),
    describeRoute({
      operationId: "presignListingPhotoUpload",
      tags: ["businesses"],
      summary: "Issue a presigned upload grant for a Listing photo",
      description:
        "Authenticates the actor, confirms they own or administer the Business, validates the declared media type, byte size, and filename extension, then issues a short-lived presigned PUT URL. The object key is server-generated and opaque; the client never proposes a key and never holds storage credentials. The count limit is serialized by locking the Business row, so concurrent uploads cannot exceed it.",
      responses: {
        201: {
          description: "A presigned PUT grant for the photo",
          content: { "application/json": { schema: resolver(photoPresignResponseSchema) } },
        },
        ...privateErrorResponses,
      },
    }),
    async c => {
      const auth = c.get("auth");
      if (!auth) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }
      requireStorage();

      const { id } = c.req.param();
      const { contentType, size } = c.req.valid("json");

      // The write predicate runs at the mutation boundary, mirroring the
      // listing PATCH: the Business may have changed hands since the
      // authorization read, and locking the row serializes concurrent
      // presign requests so the photo-count limit cannot be raced past.
      const key = `listing-photos/${id}/${crypto.randomUUID()}`;
      const created = await db.transaction(async tx => {
        const locked = await tx
          .select({ id: business.id })
          .from(business)
          .where(and(eq(business.id, id), ownedBy(auth)))
          .for("update")
          .limit(1);
        if (locked.length === 0) {
          return null;
        }
        const [{ value: photoCount }] = await tx
          .select({ value: count() })
          .from(mediaObject)
          .where(eq(mediaObject.businessId, id));
        if (photoCount >= MAX_PHOTOS_PER_BUSINESS) {
          throw new HttpError(
            422,
            "validation_failed",
            `This listing already has the maximum of ${MAX_PHOTOS_PER_BUSINESS} photos. Delete one before adding another.`
          );
        }
        const [row] = await tx
          .insert(mediaObject)
          .values({
            key,
            ownerId: auth.userId,
            businessId: id,
            purpose: "listing_photo",
            contentType,
            size,
          })
          .returning({ id: mediaObject.id });
        return row;
      });

      if (!created) {
        throw new HttpError(404, "not_found", "Business not found");
      }

      const uploadUrl = presignUploadUrl(key, contentType, PRESIGN_UPLOAD_TTL_SECONDS);
      return c.json(
        {
          id: created.id,
          uploadUrl,
          expiresAt: new Date(Date.now() + PRESIGN_UPLOAD_TTL_SECONDS * 1000).toISOString(),
          headers: { "content-type": contentType },
        },
        201
      );
    }
  )
  .get(
    "/businesses/:id/photos",
    requireBusinessOwner,
    describeRoute({
      operationId: "listListingPhotos",
      tags: ["businesses"],
      summary: "List the photos of an owned Listing",
      description:
        "Returns every stored photo of a Business the actor owns or administers, oldest first, including pending uploads that have not been completed yet.",
      responses: {
        200: {
          description: "The Listing's photos",
          content: { "application/json": { schema: resolver(mediaListResponseSchema) } },
        },
        ...privateErrorResponses,
      },
    }),
    async c => {
      const { id } = c.req.param();
      const rows = await db
        .select(mediaRowColumns)
        .from(mediaObject)
        .where(eq(mediaObject.businessId, id))
        .orderBy(asc(mediaObject.createdAt));
      return c.json({ items: rows.map(row => parseMediaRow(row).data) });
    }
  )
  .post(
    "/media/:id/complete",
    requireVerified,
    describeRoute({
      operationId: "completeListingPhotoUpload",
      tags: ["businesses"],
      summary: "Verify a completed upload and activate the photo",
      description:
        "Confirms the uploaded object exists and that its actual size and content type match what was declared at presign time, then marks the photo active. A mismatch deletes the object and its row immediately, so a bad or abandoned upload is rejected rather than left orphaned. Completing an already-active photo is idempotent.",
      responses: {
        200: {
          description: "The verified photo",
          content: { "application/json": { schema: resolver(mediaObjectSchema) } },
        },
        ...privateErrorResponses,
      },
    }),
    async c => {
      const auth = c.get("auth");
      if (!auth) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }
      requireStorage();

      const { id } = c.req.param();
      const row = await mediaRowForActor(id, auth);
      if (!row) {
        throw new HttpError(404, "not_found", "Media object not found");
      }

      if (row.status === "active") {
        return c.json(parseMediaRow(row).data);
      }

      const stored = await statObject(row.key);
      if (!stored) {
        // The upload never happened; drop the pending grant so it is not
        // left to the sweep.
        await db.delete(mediaObject).where(eq(mediaObject.id, id));
        throw new HttpError(
          404,
          "not_found",
          "The uploaded object was not found. Start the upload again."
        );
      }
      if (stored.size !== row.size) {
        await deleteObject(row.key);
        await db.delete(mediaObject).where(eq(mediaObject.id, id));
        throw new HttpError(
          422,
          "validation_failed",
          "The uploaded object's size does not match the declared size. The upload was rejected."
        );
      }
      if (stored.type !== row.contentType) {
        await deleteObject(row.key);
        await db.delete(mediaObject).where(eq(mediaObject.id, id));
        throw new HttpError(
          422,
          "validation_failed",
          "The uploaded object's content type does not match the declared type. The upload was rejected."
        );
      }

      const rows = await db
        .update(mediaObject)
        .set({ status: "active", size: stored.size, updatedAt: new Date() })
        .where(eq(mediaObject.id, id))
        .returning(mediaRowColumns);
      if (rows.length === 0) {
        throw new HttpError(404, "not_found", "Media object not found");
      }
      return c.json(parseMediaRow(rows[0]).data);
    }
  )
  .get(
    "/media/:id",
    requireVerified,
    describeRoute({
      operationId: "readListingPhoto",
      tags: ["businesses"],
      summary: "Fetch a Listing photo as its owner",
      description:
        "Resolves the object through the ownership predicate and redirects to a short-lived presigned GET URL. The response is private and never cached. Pending uploads answer 404 because their object does not exist yet. Public reads of published Listing photos arrive with the publish flow.",
      responses: {
        302: {
          description: "Redirect to a short-lived presigned GET URL",
        },
        ...privateErrorResponses,
      },
    }),
    async c => {
      const auth = c.get("auth");
      if (!auth) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }
      requireStorage();

      const { id } = c.req.param();
      const row = await mediaRowForActor(id, auth);
      if (!row || row.status !== "active") {
        throw new HttpError(404, "not_found", "Media object not found");
      }

      c.header("Cache-Control", "private, no-store");
      return c.redirect(presignDownloadUrl(row.key, PRESIGN_DOWNLOAD_TTL_SECONDS), 302);
    }
  )
  .delete(
    "/media/:id",
    requireVerified,
    describeRoute({
      operationId: "deleteListingPhoto",
      tags: ["businesses"],
      summary: "Delete a Listing photo permanently",
      description:
        "Purges the object from storage and removes its row. Deletion is irreversible: the object is not backed up, versioned, or recoverable, and the UI must say so. Deleting a pending upload aborts it.",
      responses: {
        204: {
          description: "The photo was purged",
        },
        ...privateErrorResponses,
      },
    }),
    async c => {
      const auth = c.get("auth");
      if (!auth) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }
      requireStorage();

      const { id } = c.req.param();
      const row = await mediaRowForActor(id, auth);
      if (!row) {
        throw new HttpError(404, "not_found", "Media object not found");
      }

      // The object is purged first: if storage fails, the row survives and
      // the photo is still listed rather than silently orphaned.
      try {
        await deleteObject(row.key);
      } catch (cause) {
        throw new HttpError(503, "dependency_unavailable", dependencyMessage, undefined, {
          cause,
        });
      }
      await db.delete(mediaObject).where(eq(mediaObject.id, id));
      return c.body(null, 204);
    }
  );
