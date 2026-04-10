import { getAnnouncementsByUenSchema } from "@server/database/schema";
import { Hono } from "hono";
import { describeRoute, validator, resolver } from "hono-openapi";
import { z } from "zod/v4";

import { AnnouncementWithBusinessSchema } from "../../validation-schemas/announcement";
import {
  getAnnouncementsByUen,
  getNewsletterAnnouncements,
} from "./announcement.service";

export const publicAnnouncementRouter = new Hono()
  /**
   * this route fetches all the announcements for the newsletter
   */
  .get(
    "/newsletter",
    describeRoute({
      summary: "Get all business announcements for newsletter",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(z.array(AnnouncementWithBusinessSchema)),
            },
          },
        },
      },
    }),
    async (c) => {
      const announcements = await getNewsletterAnnouncements();
      return c.json(announcements, 200);
    }
  )

  /**
   * this route fetches all the announcements for a business
   */
  .get(
    "/announcements/:uen",
    describeRoute({
      summary: "Get announcements by business UEN",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: resolver(z.array(AnnouncementWithBusinessSchema)),
            },
          },
        },
      },
    }),
    validator("param", getAnnouncementsByUenSchema),
    async (c) => {
      const { uen } = c.req.valid("param");
      const announcements = await getAnnouncementsByUen(uen);

      return c.json(announcements, 200);
    }
  );
