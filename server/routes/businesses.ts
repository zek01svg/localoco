import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";

import { business, ownedBy } from "#server/database/business";
import { requireBusinessOwner, requireVerified } from "#server/lib/auth-middleware";
import { db } from "#server/lib/db";
import { HttpError, onValidationError } from "#server/lib/errors";
import {
  businessSchema,
  businessesQuerySchema,
  businessesResponseSchema,
  businessUpdateSchema,
} from "#shared/contracts/business";
import { errorEnvelopeSchema } from "#shared/contracts/error";

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
  429: {
    description: "Too many requests",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
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
      const updated = await db
        .update(business)
        .set({ uen, updatedAt: new Date() })
        .where(and(eq(business.id, id), ownedBy(auth)))
        .returning({ id: business.id, uen: business.uen });

      if (updated.length === 0) {
        throw new HttpError(404, "not_found", "Business not found");
      }
      return c.json(updated[0]);
    }
  );
