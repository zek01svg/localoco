import db from "@server/database/db";
import type {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "@server/database/schema";
import { businessAnnouncements, businesses } from "@server/database/schema";
import logger from "@server/lib/pino";
import redis from "@server/lib/redis";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod/v4";

type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;

export async function getNewsletterAnnouncements() {
  const cached = await redis.get<any[]>("all-announcements");
  if (cached) {
    logger.info(
      { cacheKey: "all-announcements" },
      "Cache hit for all announcements"
    );
    return cached;
  }
  logger.info(
    { cacheKey: "all-announcements" },
    "Cache miss for all announcements"
  );

  const announcements = await db.query.businessAnnouncements.findMany();
  await redis.set("all-announcements", announcements, { ex: 3600 });
  return announcements;
}

export async function getAnnouncementsByUen(uen: string) {
  return db.query.businessAnnouncements.findMany({
    where: eq(businessAnnouncements.uen, uen),
  });
}

export async function createAnnouncement(
  announcement: CreateAnnouncementInput
) {
  await db.insert(businessAnnouncements).values(announcement);
  await redis.del("all-announcements");
  logger.info({ uen: announcement.uen }, "New business announcement created");
}

export async function updateAnnouncement(payload: UpdateAnnouncementInput) {
  const { announcementId, ...updateData } = payload;
  try {
    await db
      .update(businessAnnouncements)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(businessAnnouncements.announcementId, announcementId));

    await redis.del("all-announcements");
    logger.info({ announcementId }, "Announcement updated successfully");
  } catch (error) {
    logger.error({ error, announcementId }, "Failed to update announcement");
    throw error;
  }
}

export async function requireBusinessOwnerByUen(uen: string) {
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.uen, uen),
    columns: { ownerId: true },
  });
  if (!business) {
    throw new HTTPException(404, { message: "Business not found" });
  }
  return business.ownerId;
}

export async function requireAnnouncementById(announcementId: number) {
  const announcement = await db.query.businessAnnouncements.findFirst({
    where: eq(businessAnnouncements.announcementId, announcementId),
  });
  if (!announcement) {
    throw new HTTPException(404, { message: "Announcement not found" });
  }
  return announcement;
}

export async function deleteAnnouncement(announcementId: number) {
  await db
    .delete(businessAnnouncements)
    .where(eq(businessAnnouncements.announcementId, announcementId));
  await redis.del("all-announcements");
}
