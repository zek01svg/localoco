import {
  createAnnouncementSchema,
  deleteAnnouncementSchema,
  updateAnnouncementSchema,
} from "@server/database/schema";
import protectRoute from "@server/middleware/protect-route";
import verifyOwnership from "@server/utils/verify-ownership";
import { Hono } from "hono";
import { describeRoute, validator, resolver } from "hono-openapi";
import { z } from "zod/v4";

import {
  createAnnouncement,
  deleteAnnouncement,
  requireAnnouncementById,
  requireBusinessOwnerByUen,
  updateAnnouncement,
} from "./announcement.service";

export const managementAnnouncementRouter = new Hono()
  /**
   * this route handles submissions for announcements
   */
  .post(
    "/new-announcement",
    describeRoute({
      summary: "Create new business announcement",
      responses: {
        201: {
          description: "Created",
          content: {
            "application/json": {
              schema: resolver(z.object({ message: z.string() })),
            },
          },
        },
      },
    }),
    validator("json", createAnnouncementSchema),
    protectRoute,
    async (c) => {
      const announcement = c.req.valid("json");
      const ownerId = await requireBusinessOwnerByUen(announcement.uen);
      await verifyOwnership(c, ownerId);
      await createAnnouncement(announcement);
      return c.json({ message: "Announcement added successfully" }, 201);
    }
  )

  /**
   * this route handles submissions to update announcements
   */
  .put(
    "/update-announcement",
    describeRoute({
      summary: "Update an existing announcement",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(z.object({ message: z.string() })),
            },
          },
        },
      },
    }),
    validator("json", updateAnnouncementSchema),
    protectRoute,
    async (c) => {
      const payload = c.req.valid("json");
      const ownerId = await requireBusinessOwnerByUen(payload.uen);
      await verifyOwnership(c, ownerId);
      await updateAnnouncement(payload);
      return c.json({ message: "Announcement updated successfully" }, 200);
    }
  )

  /**
   * this route handles deletions for announcements
   */
  .delete(
    "/delete-announcement",
    describeRoute({
      summary: "Delete an announcement",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(z.object({ message: z.string() })),
            },
          },
        },
      },
    }),
    validator("json", deleteAnnouncementSchema),
    protectRoute,
    async (c) => {
      const { announcementId } = c.req.valid("json");
      const announcement = await requireAnnouncementById(announcementId);
      const ownerId = await requireBusinessOwnerByUen(announcement.uen);
      await verifyOwnership(c, ownerId);
      await deleteAnnouncement(announcementId);
      return c.json({ message: "Announcement deleted successfully" }, 200);
    }
  );
