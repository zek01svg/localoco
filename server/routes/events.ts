import type { EventItem } from "#shared/contracts/events";

import { and, desc, eq, lt, or } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";

import {
  business,
  event,
  eventModerationAudit,
  listing,
  ownedBy,
  publiclyVisibleEvent,
  user,
} from "#server/database";
import {
  db,
  HttpError,
  onValidationError,
  requireAdmin,
  requireBusinessOwner,
  resolveAuth,
} from "#server/lib";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  createEventSchema,
  eventAuditsResponseSchema,
  eventItemSchema,
  eventModerationActionSchema,
  eventsQuerySchema,
  eventsResponseSchema,
  updateEventSchema,
} from "#shared/contracts/events";

const publicErrorResponses = {
  400: {
    description: "Request parameters failed validation",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  404: {
    description: "Resource not found",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  429: {
    description: "Too many requests",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  503: {
    description: "Database is temporarily unavailable",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
};

const authenticatedErrorResponses = {
  ...publicErrorResponses,
  401: {
    description: "Authentication required",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  403: {
    description: "Action forbidden (e.g. unverified user or administrator role required)",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
  409: {
    description: "Conflict (e.g. listing is not published)",
    content: { "application/json": { schema: resolver(errorEnvelopeSchema) } },
  },
};

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}_${id}`).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const str = Buffer.from(cursor, "base64url").toString("utf8");
    const idx = str.indexOf("_");
    if (idx === -1) throw new Error("Malformed cursor");
    const iso = str.slice(0, idx);
    const id = str.slice(idx + 1);
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()) || !id) throw new Error("Malformed cursor");
    return { createdAt: date, id };
  } catch {
    throw new HttpError(400, "invalid_request", "Invalid pagination cursor");
  }
}

function eventCursorCondition(decoded: { createdAt: Date; id: string }) {
  return or(
    lt(event.createdAt, decoded.createdAt),
    and(eq(event.createdAt, decoded.createdAt), lt(event.id, decoded.id))
  );
}

function buildEventRowSelect() {
  return {
    id: event.id,
    businessId: event.businessId,
    userId: event.userId,
    title: event.title,
    description: event.description,
    imageUrl: event.imageUrl,
    linkUrl: event.linkUrl,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    status: event.status,
    moderationReason: event.moderationReason,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    authorId: user.id,
    authorDisplayName: user.name,
    authorAvatarUrl: user.image,
    businessName: listing.name,
    businessCategory: listing.category,
    businessUen: business.uen,
    businessOwnerId: business.ownerId,
    listingStatus: listing.status,
  };
}

interface SelectedEventRow {
  id: string;
  businessId: string;
  userId: string;
  title: string;
  description: string;
  imageUrl: string | null;
  linkUrl: string | null;
  startsAt: Date;
  endsAt: Date;
  status: "active" | "moderated";
  moderationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  authorId: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  businessName: string | null;
  businessCategory: string | null;
  businessUen: string | null;
  businessOwnerId: string | null;
  listingStatus: string | null;
}

function formatEventItem(row: SelectedEventRow): EventItem {
  return eventItemSchema.parse({
    id: row.id,
    businessId: row.businessId,
    userId: row.userId,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl,
    linkUrl: row.linkUrl,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    moderationReason: row.moderationReason,
    canonicalUrl: `/events/${row.id}`,
    author: row.authorId
      ? {
          id: row.authorId,
          displayName: row.authorDisplayName ?? "User",
          avatarUrl: row.authorAvatarUrl,
        }
      : undefined,
    business: row.businessName
      ? {
          id: row.businessId,
          name: row.businessName,
          category: row.businessCategory ?? undefined,
          uen: row.businessUen ?? undefined,
        }
      : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export const eventsRoutes = new Hono()
  .get(
    "/events",
    validator("query", eventsQuerySchema, onValidationError),
    describeRoute({
      operationId: "listPublicEvents",
      tags: ["events"],
      summary: "List active public events",
      description:
        "Cursor-paginated list of active events from published listings, newest first. Expired events or those from non-published listings are excluded automatically.",
      responses: {
        200: {
          description: "A page of events",
          content: { "application/json": { schema: resolver(eventsResponseSchema) } },
        },
        ...publicErrorResponses,
      },
    }),
    async c => {
      const { limit, cursor } = c.req.valid("query");
      const decodedCursor = cursor ? decodeCursor(cursor) : undefined;
      const now = new Date();

      const conditions = [eq(listing.status, "published"), publiclyVisibleEvent(now)];

      if (decodedCursor) {
        const cursorCond = eventCursorCondition(decodedCursor);
        if (cursorCond) conditions.push(cursorCond);
      }

      const rows = (await db
        .select(buildEventRowSelect())
        .from(event)
        .innerJoin(business, eq(event.businessId, business.id))
        .innerJoin(listing, eq(event.businessId, listing.businessId))
        .leftJoin(user, eq(event.userId, user.id))
        .where(and(...conditions))
        .orderBy(desc(event.createdAt), desc(event.id))
        .limit(limit + 1)) as SelectedEventRow[];

      const hasNextPage = rows.length > limit;
      const items = hasNextPage ? rows.slice(0, limit) : rows;
      const lastItem = items.length > 0 ? items.at(-1) : undefined;
      const nextCursor =
        hasNextPage && lastItem !== undefined
          ? encodeCursor(lastItem.createdAt, lastItem.id)
          : null;

      return c.json({
        items: items.map(row => formatEventItem(row)),
        nextCursor,
      });
    }
  )
  .get(
    "/events/:id",
    resolveAuth,
    describeRoute({
      operationId: "getEventDetail",
      tags: ["events"],
      summary: "Get event detail by id",
      description:
        "Returns event details with canonical URL and metadata. Public viewers can only see active events on published listings; business owners and administrators can see any state.",
      responses: {
        200: {
          description: "Event detail",
          content: { "application/json": { schema: resolver(eventItemSchema) } },
        },
        ...publicErrorResponses,
      },
    }),
    async c => {
      const { id } = c.req.param();
      const auth = c.get("auth");

      const rows = (await db
        .select(buildEventRowSelect())
        .from(event)
        .innerJoin(business, eq(event.businessId, business.id))
        .innerJoin(listing, eq(event.businessId, listing.businessId))
        .leftJoin(user, eq(event.userId, user.id))
        .where(eq(event.id, id))
        .limit(1)) as SelectedEventRow[];

      if (rows.length === 0) {
        throw new HttpError(404, "not_found", "Event not found");
      }

      const row = rows[0];
      const isOwnerOrAdmin =
        auth && (auth.isAdmin || auth.userId === row.userId || auth.userId === row.businessOwnerId);

      if (!isOwnerOrAdmin) {
        const now = new Date();
        const isPublished = row.listingStatus === "published";
        const isActive = row.status === "active";
        const isNotExpired = row.endsAt >= now;

        if (!isPublished || !isActive || !isNotExpired) {
          throw new HttpError(404, "not_found", "Event not found");
        }
      }

      return c.json(formatEventItem(row));
    }
  )
  .post(
    "/businesses/:id/events",
    requireBusinessOwner,
    validator("json", createEventSchema, onValidationError),
    describeRoute({
      operationId: "createBusinessEvent",
      tags: ["businesses", "events"],
      summary: "Create an event for an owned published business",
      description:
        "Allows the owner of an actively published Business to create an event. If the listing is in draft, pending review, rejected, or suspended state, returns 409 Conflict. Creates zero email deliveries.",
      responses: {
        201: {
          description: "Event created",
          content: { "application/json": { schema: resolver(eventItemSchema) } },
        },
        ...authenticatedErrorResponses,
      },
    }),
    async c => {
      const auth = c.get("auth");
      if (!auth) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }

      const { id: businessId } = c.req.param();
      const body = c.req.valid("json");

      // Verify business listing is published
      const listingRows = await db
        .select({ status: listing.status })
        .from(listing)
        .where(eq(listing.businessId, businessId))
        .limit(1);

      if (listingRows.length === 0 || listingRows[0]?.status !== "published") {
        throw new HttpError(409, "conflict", "Events can only be created for published listings");
      }

      const insertedRows = await db
        .insert(event)
        .values({
          businessId,
          userId: auth.userId,
          title: body.title,
          description: body.description,
          imageUrl: body.imageUrl ?? null,
          linkUrl: body.linkUrl ?? null,
          startsAt: body.startsAt,
          endsAt: body.endsAt,
          status: "active",
        })
        .returning({ id: event.id });

      if (insertedRows.length === 0) {
        throw new HttpError(503, "dependency_unavailable", "Failed to insert event");
      }
      const inserted = insertedRows[0];

      const rows = (await db
        .select(buildEventRowSelect())
        .from(event)
        .innerJoin(business, eq(event.businessId, business.id))
        .innerJoin(listing, eq(event.businessId, listing.businessId))
        .leftJoin(user, eq(event.userId, user.id))
        .where(eq(event.id, inserted.id))
        .limit(1)) as SelectedEventRow[];

      return c.json(formatEventItem(rows[0]), 201);
    }
  )
  .get(
    "/businesses/:id/events",
    resolveAuth,
    validator("query", eventsQuerySchema, onValidationError),
    describeRoute({
      operationId: "listBusinessEvents",
      tags: ["businesses", "events"],
      summary: "List events for a business",
      description:
        "Returns events for a business. For the business owner and administrators, all events (active, expired, moderated) are returned. For public visitors, only active and non-expired events on published listings are returned.",
      responses: {
        200: {
          description: "List of events for business",
          content: { "application/json": { schema: resolver(eventsResponseSchema) } },
        },
        ...publicErrorResponses,
      },
    }),
    async c => {
      const { id: businessId } = c.req.param();
      const auth = c.get("auth");
      const { limit, cursor } = c.req.valid("query");
      const decodedCursor = cursor ? decodeCursor(cursor) : undefined;
      const now = new Date();

      // Check if actor is owner or admin
      let isOwnerOrAdmin = false;
      if (auth) {
        if (auth.isAdmin) {
          isOwnerOrAdmin = true;
        } else {
          const ownerRows = await db
            .select({ id: business.id })
            .from(business)
            .where(and(eq(business.id, businessId), ownedBy(auth)))
            .limit(1);
          isOwnerOrAdmin = ownerRows.length > 0;
        }
      }

      const conditions = [eq(event.businessId, businessId)];

      if (!isOwnerOrAdmin) {
        conditions.push(eq(listing.status, "published"), publiclyVisibleEvent(now));
      }

      if (decodedCursor) {
        const cursorCond = eventCursorCondition(decodedCursor);
        if (cursorCond) conditions.push(cursorCond);
      }

      const rows = (await db
        .select(buildEventRowSelect())
        .from(event)
        .innerJoin(business, eq(event.businessId, business.id))
        .innerJoin(listing, eq(event.businessId, listing.businessId))
        .leftJoin(user, eq(event.userId, user.id))
        .where(and(...conditions))
        .orderBy(desc(event.createdAt), desc(event.id))
        .limit(limit + 1)) as SelectedEventRow[];

      const hasNextPage = rows.length > limit;
      const items = hasNextPage ? rows.slice(0, limit) : rows;
      const lastItem = items.length > 0 ? items.at(-1) : undefined;
      const nextCursor =
        hasNextPage && lastItem !== undefined
          ? encodeCursor(lastItem.createdAt, lastItem.id)
          : null;

      return c.json({
        items: items.map(row => formatEventItem(row)),
        nextCursor,
      });
    }
  )
  .patch(
    "/businesses/:id/events/:eventId",
    requireBusinessOwner,
    validator("json", updateEventSchema, onValidationError),
    describeRoute({
      operationId: "updateBusinessEvent",
      tags: ["businesses", "events"],
      summary: "Update an owned business event",
      description: "Allows the business owner to update event fields.",
      responses: {
        200: {
          description: "Event updated",
          content: { "application/json": { schema: resolver(eventItemSchema) } },
        },
        ...authenticatedErrorResponses,
      },
    }),
    async c => {
      const { id: businessId, eventId } = c.req.param();
      const body = c.req.valid("json");

      const existingRows = await db
        .select({ id: event.id, startsAt: event.startsAt, endsAt: event.endsAt })
        .from(event)
        .where(and(eq(event.id, eventId), eq(event.businessId, businessId)))
        .limit(1);

      if (existingRows.length === 0) {
        throw new HttpError(404, "not_found", "Event not found");
      }

      const existing = existingRows[0];
      const newStartsAt = body.startsAt ?? existing.startsAt;
      const newEndsAt = body.endsAt ?? existing.endsAt;

      if (newEndsAt < newStartsAt) {
        throw new HttpError(400, "invalid_request", "End date must not precede start date");
      }

      const updateData: Partial<typeof event.$inferInsert> = {
        ...body,
        updatedAt: new Date(),
      };

      await db.update(event).set(updateData).where(eq(event.id, eventId));

      const rows = (await db
        .select(buildEventRowSelect())
        .from(event)
        .innerJoin(business, eq(event.businessId, business.id))
        .innerJoin(listing, eq(event.businessId, listing.businessId))
        .leftJoin(user, eq(event.userId, user.id))
        .where(eq(event.id, eventId))
        .limit(1)) as SelectedEventRow[];

      return c.json(formatEventItem(rows[0]));
    }
  )
  .delete(
    "/businesses/:id/events/:eventId",
    requireBusinessOwner,
    describeRoute({
      operationId: "deleteBusinessEvent",
      tags: ["businesses", "events"],
      summary: "Delete an owned business event",
      description: "Permanently deletes an event owned by the business.",
      responses: {
        204: {
          description: "Event deleted",
        },
        ...authenticatedErrorResponses,
      },
    }),
    async c => {
      const { id: businessId, eventId } = c.req.param();

      const existingRows = await db
        .select({ id: event.id })
        .from(event)
        .where(and(eq(event.id, eventId), eq(event.businessId, businessId)))
        .limit(1);

      if (existingRows.length === 0) {
        throw new HttpError(404, "not_found", "Event not found");
      }

      await db.delete(event).where(eq(event.id, eventId));
      return c.body(null, 204);
    }
  )
  .post(
    "/events/:id/moderate",
    requireAdmin,
    validator("json", eventModerationActionSchema, onValidationError),
    describeRoute({
      operationId: "moderateEvent",
      tags: ["admin", "events"],
      summary: "Moderate an event",
      description:
        "Administrative endpoint to moderate or restore an event with an immutable reason and audit record.",
      responses: {
        200: {
          description: "The moderated event",
          content: { "application/json": { schema: resolver(eventItemSchema) } },
        },
        ...authenticatedErrorResponses,
      },
    }),
    async c => {
      const auth = c.get("auth");
      if (!auth) {
        throw new HttpError(401, "unauthorized", "Authentication required");
      }

      const { id } = c.req.param();
      const { action, reason } = c.req.valid("json");

      const nextStatus = action === "moderate" ? "moderated" : "active";

      await db.transaction(async tx => {
        const current = await tx
          .select({ id: event.id, status: event.status })
          .from(event)
          .where(eq(event.id, id))
          .for("update")
          .limit(1);

        if (current.length === 0) {
          throw new HttpError(404, "not_found", "Event not found");
        }

        const previousStatus = current[0].status;

        // Insert audit log
        await tx.insert(eventModerationAudit).values({
          eventId: id,
          actorId: auth.userId,
          previousStatus,
          nextStatus,
          reason,
        });

        // Update event status
        await tx
          .update(event)
          .set({
            status: nextStatus,
            moderationReason: action === "moderate" ? reason : null,
            updatedAt: new Date(),
          })
          .where(eq(event.id, id));
      });

      const rows = (await db
        .select(buildEventRowSelect())
        .from(event)
        .innerJoin(business, eq(event.businessId, business.id))
        .innerJoin(listing, eq(event.businessId, listing.businessId))
        .leftJoin(user, eq(event.userId, user.id))
        .where(eq(event.id, id))
        .limit(1)) as SelectedEventRow[];

      return c.json(formatEventItem(rows[0]));
    }
  )
  .get(
    "/events/:id/audits",
    requireAdmin,
    describeRoute({
      operationId: "listEventAudits",
      tags: ["admin", "events"],
      summary: "List moderation audits for an event",
      description: "Returns the immutable moderation history for an event.",
      responses: {
        200: {
          description: "Moderation audit records",
          content: { "application/json": { schema: resolver(eventAuditsResponseSchema) } },
        },
        ...authenticatedErrorResponses,
      },
    }),
    async c => {
      const { id } = c.req.param();

      const existingRows = await db
        .select({ id: event.id })
        .from(event)
        .where(eq(event.id, id))
        .limit(1);

      if (existingRows.length === 0) {
        throw new HttpError(404, "not_found", "Event not found");
      }

      const rows = await db
        .select({
          id: eventModerationAudit.id,
          eventId: eventModerationAudit.eventId,
          actorId: eventModerationAudit.actorId,
          previousStatus: eventModerationAudit.previousStatus,
          nextStatus: eventModerationAudit.nextStatus,
          reason: eventModerationAudit.reason,
          createdAt: eventModerationAudit.createdAt,
        })
        .from(eventModerationAudit)
        .where(eq(eventModerationAudit.eventId, id))
        .orderBy(desc(eventModerationAudit.createdAt));

      return c.json({ items: rows });
    }
  );
