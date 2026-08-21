import type { AnnouncementItem } from "#shared/contracts/announcements";

import { and, desc, eq, lt, or } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";

import {
  announcement,
  announcementModerationAudit,
  publiclyVisibleAnnouncement,
} from "#server/database/announcement";
import { user } from "#server/database/auth";
import { business, ownedBy } from "#server/database/business";
import { listing } from "#server/database/listing";
import { requireAdmin, requireBusinessOwner, resolveAuth } from "#server/lib/auth-middleware";
import { db } from "#server/lib/db";
import { HttpError, onValidationError } from "#server/lib/errors";
import {
  announcementAuditsResponseSchema,
  announcementItemSchema,
  announcementModerationActionSchema,
  announcementsQuerySchema,
  announcementsResponseSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "#shared/contracts/announcements";
import { errorEnvelopeSchema } from "#shared/contracts/error";

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

function announcementCursorCondition(decoded: { createdAt: Date; id: string }) {
  return or(
    lt(announcement.createdAt, decoded.createdAt),
    and(eq(announcement.createdAt, decoded.createdAt), lt(announcement.id, decoded.id))
  );
}

function buildAnnouncementRowSelect() {
  return {
    id: announcement.id,
    businessId: announcement.businessId,
    userId: announcement.userId,
    title: announcement.title,
    content: announcement.content,
    imageUrl: announcement.imageUrl,
    linkUrl: announcement.linkUrl,
    startsAt: announcement.startsAt,
    endsAt: announcement.endsAt,
    status: announcement.status,
    moderationReason: announcement.moderationReason,
    createdAt: announcement.createdAt,
    updatedAt: announcement.updatedAt,
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

interface SelectedAnnouncementRow {
  id: string;
  businessId: string;
  userId: string;
  title: string;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
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

function formatAnnouncementItem(row: SelectedAnnouncementRow): AnnouncementItem {
  return announcementItemSchema.parse({
    id: row.id,
    businessId: row.businessId,
    userId: row.userId,
    title: row.title,
    content: row.content,
    imageUrl: row.imageUrl,
    linkUrl: row.linkUrl,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    moderationReason: row.moderationReason,
    canonicalUrl: `/announcements/${row.id}`,
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

export const announcementsRoutes = new Hono()
  .get(
    "/announcements",
    validator("query", announcementsQuerySchema, onValidationError),
    describeRoute({
      operationId: "listPublicAnnouncements",
      tags: ["announcements"],
      summary: "List active public announcements",
      description:
        "Cursor-paginated list of active announcements from published listings, newest first. Expired announcements or those from non-published listings are excluded automatically.",
      responses: {
        200: {
          description: "A page of announcements",
          content: { "application/json": { schema: resolver(announcementsResponseSchema) } },
        },
        ...publicErrorResponses,
      },
    }),
    async c => {
      const { limit, cursor } = c.req.valid("query");
      const decodedCursor = cursor ? decodeCursor(cursor) : undefined;
      const now = new Date();

      const conditions = [eq(listing.status, "published"), publiclyVisibleAnnouncement(now)];

      if (decodedCursor) {
        const cursorCond = announcementCursorCondition(decodedCursor);
        if (cursorCond) conditions.push(cursorCond);
      }

      const rows = (await db
        .select(buildAnnouncementRowSelect())
        .from(announcement)
        .innerJoin(business, eq(announcement.businessId, business.id))
        .innerJoin(listing, eq(announcement.businessId, listing.businessId))
        .leftJoin(user, eq(announcement.userId, user.id))
        .where(and(...conditions))
        .orderBy(desc(announcement.createdAt), desc(announcement.id))
        .limit(limit + 1)) as SelectedAnnouncementRow[];

      const hasNextPage = rows.length > limit;
      const items = hasNextPage ? rows.slice(0, limit) : rows;
      const lastItem = items.length > 0 ? items.at(-1) : undefined;
      const nextCursor =
        hasNextPage && lastItem !== undefined
          ? encodeCursor(lastItem.createdAt, lastItem.id)
          : null;

      return c.json({
        items: items.map(formatAnnouncementItem),
        nextCursor,
      });
    }
  )
  .get(
    "/announcements/:id",
    resolveAuth,
    describeRoute({
      operationId: "getAnnouncementDetail",
      tags: ["announcements"],
      summary: "Get announcement detail by id",
      description:
        "Returns announcement details with canonical URL and metadata. Public viewers can only see active announcements on published listings; business owners and administrators can see any state.",
      responses: {
        200: {
          description: "Announcement detail",
          content: { "application/json": { schema: resolver(announcementItemSchema) } },
        },
        ...publicErrorResponses,
      },
    }),
    async c => {
      const { id } = c.req.param();
      const auth = c.get("auth");

      const rows = (await db
        .select(buildAnnouncementRowSelect())
        .from(announcement)
        .innerJoin(business, eq(announcement.businessId, business.id))
        .innerJoin(listing, eq(announcement.businessId, listing.businessId))
        .leftJoin(user, eq(announcement.userId, user.id))
        .where(eq(announcement.id, id))
        .limit(1)) as SelectedAnnouncementRow[];

      if (rows.length === 0) {
        throw new HttpError(404, "not_found", "Announcement not found");
      }

      const row = rows[0];
      const isOwnerOrAdmin =
        auth && (auth.isAdmin || auth.userId === row.userId || auth.userId === row.businessOwnerId);

      if (!isOwnerOrAdmin) {
        const now = new Date();
        const isPublished = row.listingStatus === "published";
        const isActive = row.status === "active";
        const isStarted = !row.startsAt || row.startsAt <= now;
        const isNotExpired = !row.endsAt || row.endsAt >= now;

        if (!isPublished || !isActive || !isStarted || !isNotExpired) {
          throw new HttpError(404, "not_found", "Announcement not found");
        }
      }

      return c.json(formatAnnouncementItem(row));
    }
  )
  .post(
    "/businesses/:id/announcements",
    requireBusinessOwner,
    validator("json", createAnnouncementSchema, onValidationError),
    describeRoute({
      operationId: "createBusinessAnnouncement",
      tags: ["businesses", "announcements"],
      summary: "Create an announcement for an owned published business",
      description:
        "Allows the owner of an actively published Business to create an announcement. If the listing is in draft, pending review, rejected, or suspended state, returns 409 Conflict. Creates zero email deliveries.",
      responses: {
        201: {
          description: "Announcement created",
          content: { "application/json": { schema: resolver(announcementItemSchema) } },
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
        throw new HttpError(
          409,
          "conflict",
          "Announcements can only be created for published listings"
        );
      }

      const insertedRows = await db
        .insert(announcement)
        .values({
          businessId,
          userId: auth.userId,
          title: body.title,
          content: body.content,
          imageUrl: body.imageUrl ?? null,
          linkUrl: body.linkUrl ?? null,
          startsAt: body.startsAt ?? null,
          endsAt: body.endsAt ?? null,
          status: "active",
        })
        .returning({ id: announcement.id });

      if (insertedRows.length === 0) {
        throw new HttpError(503, "dependency_unavailable", "Failed to insert announcement");
      }
      const inserted = insertedRows[0];

      const rows = (await db
        .select(buildAnnouncementRowSelect())
        .from(announcement)
        .innerJoin(business, eq(announcement.businessId, business.id))
        .innerJoin(listing, eq(announcement.businessId, listing.businessId))
        .leftJoin(user, eq(announcement.userId, user.id))
        .where(eq(announcement.id, inserted.id))
        .limit(1)) as SelectedAnnouncementRow[];

      return c.json(formatAnnouncementItem(rows[0]), 201);
    }
  )
  .get(
    "/businesses/:id/announcements",
    resolveAuth,
    validator("query", announcementsQuerySchema, onValidationError),
    describeRoute({
      operationId: "listBusinessAnnouncements",
      tags: ["businesses", "announcements"],
      summary: "List announcements for a business",
      description:
        "Returns announcements for a business. For the business owner and administrators, all announcements (active, scheduled, expired, moderated) are returned. For public visitors, only active and non-expired announcements on published listings are returned.",
      responses: {
        200: {
          description: "List of announcements for business",
          content: { "application/json": { schema: resolver(announcementsResponseSchema) } },
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

      const conditions = [eq(announcement.businessId, businessId)];

      if (!isOwnerOrAdmin) {
        conditions.push(eq(listing.status, "published"), publiclyVisibleAnnouncement(now));
      }

      if (decodedCursor) {
        const cursorCond = announcementCursorCondition(decodedCursor);
        if (cursorCond) conditions.push(cursorCond);
      }

      const rows = (await db
        .select(buildAnnouncementRowSelect())
        .from(announcement)
        .innerJoin(business, eq(announcement.businessId, business.id))
        .innerJoin(listing, eq(announcement.businessId, listing.businessId))
        .leftJoin(user, eq(announcement.userId, user.id))
        .where(and(...conditions))
        .orderBy(desc(announcement.createdAt), desc(announcement.id))
        .limit(limit + 1)) as SelectedAnnouncementRow[];

      const hasNextPage = rows.length > limit;
      const items = hasNextPage ? rows.slice(0, limit) : rows;
      const lastItem = items.length > 0 ? items.at(-1) : undefined;
      const nextCursor =
        hasNextPage && lastItem !== undefined
          ? encodeCursor(lastItem.createdAt, lastItem.id)
          : null;

      return c.json({
        items: items.map(formatAnnouncementItem),
        nextCursor,
      });
    }
  )
  .patch(
    "/businesses/:id/announcements/:announcementId",
    requireBusinessOwner,
    validator("json", updateAnnouncementSchema, onValidationError),
    describeRoute({
      operationId: "updateBusinessAnnouncement",
      tags: ["businesses", "announcements"],
      summary: "Update an owned business announcement",
      description: "Allows the business owner to update announcement fields.",
      responses: {
        200: {
          description: "Announcement updated",
          content: { "application/json": { schema: resolver(announcementItemSchema) } },
        },
        ...authenticatedErrorResponses,
      },
    }),
    async c => {
      const { id: businessId, announcementId } = c.req.param();
      const body = c.req.valid("json");

      const existingRows = await db
        .select({
          id: announcement.id,
          startsAt: announcement.startsAt,
          endsAt: announcement.endsAt,
        })
        .from(announcement)
        .where(and(eq(announcement.id, announcementId), eq(announcement.businessId, businessId)))
        .limit(1);

      if (existingRows.length === 0) {
        throw new HttpError(404, "not_found", "Announcement not found");
      }

      const existing = existingRows[0];
      const newStartsAt = body.startsAt === undefined ? existing.startsAt : body.startsAt;
      const newEndsAt = body.endsAt === undefined ? existing.endsAt : body.endsAt;

      if (newStartsAt !== null && newEndsAt !== null && newEndsAt < newStartsAt) {
        throw new HttpError(400, "invalid_request", "End date must not precede start date");
      }

      const updateData: Partial<typeof announcement.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (body.title !== undefined) updateData.title = body.title;
      if (body.content !== undefined) updateData.content = body.content;
      if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
      if (body.linkUrl !== undefined) updateData.linkUrl = body.linkUrl;
      if (body.startsAt !== undefined) updateData.startsAt = body.startsAt;
      if (body.endsAt !== undefined) updateData.endsAt = body.endsAt;

      await db.update(announcement).set(updateData).where(eq(announcement.id, announcementId));

      const rows = (await db
        .select(buildAnnouncementRowSelect())
        .from(announcement)
        .innerJoin(business, eq(announcement.businessId, business.id))
        .innerJoin(listing, eq(announcement.businessId, listing.businessId))
        .leftJoin(user, eq(announcement.userId, user.id))
        .where(eq(announcement.id, announcementId))
        .limit(1)) as SelectedAnnouncementRow[];

      return c.json(formatAnnouncementItem(rows[0]));
    }
  )
  .delete(
    "/businesses/:id/announcements/:announcementId",
    requireBusinessOwner,
    describeRoute({
      operationId: "deleteBusinessAnnouncement",
      tags: ["businesses", "announcements"],
      summary: "Delete an owned business announcement",
      description: "Permanently deletes an announcement owned by the business.",
      responses: {
        204: {
          description: "Announcement deleted",
        },
        ...authenticatedErrorResponses,
      },
    }),
    async c => {
      const { id: businessId, announcementId } = c.req.param();

      const existingRows = await db
        .select({ id: announcement.id })
        .from(announcement)
        .where(and(eq(announcement.id, announcementId), eq(announcement.businessId, businessId)))
        .limit(1);

      if (existingRows.length === 0) {
        throw new HttpError(404, "not_found", "Announcement not found");
      }

      await db.delete(announcement).where(eq(announcement.id, announcementId));
      return c.body(null, 204);
    }
  )
  .post(
    "/announcements/:id/moderate",
    requireAdmin,
    validator("json", announcementModerationActionSchema, onValidationError),
    describeRoute({
      operationId: "moderateAnnouncement",
      tags: ["admin", "announcements"],
      summary: "Moderate an announcement",
      description:
        "Administrative endpoint to moderate or restore an announcement with an immutable reason and audit record.",
      responses: {
        200: {
          description: "The moderated announcement",
          content: { "application/json": { schema: resolver(announcementItemSchema) } },
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
          .select({ id: announcement.id, status: announcement.status })
          .from(announcement)
          .where(eq(announcement.id, id))
          .for("update")
          .limit(1);

        if (current.length === 0) {
          throw new HttpError(404, "not_found", "Announcement not found");
        }

        const previousStatus = current[0].status;

        // Insert audit log
        await tx.insert(announcementModerationAudit).values({
          announcementId: id,
          actorId: auth.userId,
          previousStatus,
          nextStatus,
          reason,
        });

        // Update announcement status
        await tx
          .update(announcement)
          .set({
            status: nextStatus,
            moderationReason: action === "moderate" ? reason : null,
            updatedAt: new Date(),
          })
          .where(eq(announcement.id, id));
      });

      const rows = (await db
        .select(buildAnnouncementRowSelect())
        .from(announcement)
        .innerJoin(business, eq(announcement.businessId, business.id))
        .innerJoin(listing, eq(announcement.businessId, listing.businessId))
        .leftJoin(user, eq(announcement.userId, user.id))
        .where(eq(announcement.id, id))
        .limit(1)) as SelectedAnnouncementRow[];

      return c.json(formatAnnouncementItem(rows[0]));
    }
  )
  .get(
    "/announcements/:id/audits",
    requireAdmin,
    describeRoute({
      operationId: "listAnnouncementAudits",
      tags: ["admin", "announcements"],
      summary: "List moderation audits for an announcement",
      description: "Returns the immutable moderation history for an announcement.",
      responses: {
        200: {
          description: "Moderation audit records",
          content: { "application/json": { schema: resolver(announcementAuditsResponseSchema) } },
        },
        ...authenticatedErrorResponses,
      },
    }),
    async c => {
      const { id } = c.req.param();

      const existingRows = await db
        .select({ id: announcement.id })
        .from(announcement)
        .where(eq(announcement.id, id))
        .limit(1);

      if (existingRows.length === 0) {
        throw new HttpError(404, "not_found", "Announcement not found");
      }

      const rows = await db
        .select({
          id: announcementModerationAudit.id,
          announcementId: announcementModerationAudit.announcementId,
          actorId: announcementModerationAudit.actorId,
          previousStatus: announcementModerationAudit.previousStatus,
          nextStatus: announcementModerationAudit.nextStatus,
          reason: announcementModerationAudit.reason,
          createdAt: announcementModerationAudit.createdAt,
        })
        .from(announcementModerationAudit)
        .where(eq(announcementModerationAudit.announcementId, id))
        .orderBy(desc(announcementModerationAudit.createdAt));

      return c.json({ items: rows });
    }
  );
