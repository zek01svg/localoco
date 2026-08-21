import { z } from "zod/v4";

// Announcement title bounds: non-empty, max 200 characters.
export const announcementTitleSchema = z
  .string()
  .trim()
  .min(1, { message: "Title cannot be empty" })
  .max(200, { message: "Title cannot exceed 200 characters" });

// Announcement content bounds: non-empty, max 4000 characters.
export const announcementContentSchema = z
  .string()
  .trim()
  .min(1, { message: "Content cannot be empty" })
  .max(4000, { message: "Content cannot exceed 4000 characters" });

// Image URL must be a valid URL using HTTPS, max 1000 characters.
export const announcementImageUrlSchema = z
  .url({ message: "Image URL must be a valid URL" })
  .max(1000, { message: "Image URL cannot exceed 1000 characters" })
  .refine(
    url => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Image URL must use HTTPS" }
  );

// External Link URL must be a valid URL using HTTPS, max 1000 characters.
export const announcementLinkUrlSchema = z
  .url({ message: "Link URL must be a valid URL" })
  .max(1000, { message: "Link URL cannot exceed 1000 characters" })
  .refine(
    url => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Link URL must use HTTPS" }
  );

export const announcementStatusSchema = z.enum(["active", "moderated"]);
export type AnnouncementStatus = z.infer<typeof announcementStatusSchema>;

export const createAnnouncementSchema = z
  .object({
    title: announcementTitleSchema,
    content: announcementContentSchema,
    imageUrl: announcementImageUrlSchema.optional().nullable(),
    linkUrl: announcementLinkUrlSchema.optional().nullable(),
    startsAt: z.coerce.date().optional().nullable(),
    endsAt: z.coerce.date().optional().nullable(),
  })
  .refine(
    data => {
      if (data.startsAt && data.endsAt) {
        return new Date(data.endsAt).getTime() >= new Date(data.startsAt).getTime();
      }
      return true;
    },
    {
      message: "End date must not precede start date",
      path: ["endsAt"],
    }
  );
export type CreateAnnouncement = z.infer<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = z
  .object({
    title: announcementTitleSchema.optional(),
    content: announcementContentSchema.optional(),
    imageUrl: announcementImageUrlSchema.optional().nullable(),
    linkUrl: announcementLinkUrlSchema.optional().nullable(),
    startsAt: z.coerce.date().optional().nullable(),
    endsAt: z.coerce.date().optional().nullable(),
  })
  .refine(
    data =>
      data.title !== undefined ||
      data.content !== undefined ||
      data.imageUrl !== undefined ||
      data.linkUrl !== undefined ||
      data.startsAt !== undefined ||
      data.endsAt !== undefined,
    {
      message: "At least one field must be provided",
    }
  )
  .refine(
    data => {
      if (data.startsAt && data.endsAt) {
        return new Date(data.endsAt).getTime() >= new Date(data.startsAt).getTime();
      }
      return true;
    },
    {
      message: "End date must not precede start date",
      path: ["endsAt"],
    }
  );
export type UpdateAnnouncement = z.infer<typeof updateAnnouncementSchema>;

export const announcementModerationActionSchema = z.object({
  action: z.enum(["moderate", "restore"]),
  reason: z
    .string()
    .trim()
    .min(1, { message: "Moderation reason is required" })
    .max(1000, { message: "Reason cannot exceed 1000 characters" }),
});
export type AnnouncementModerationAction = z.infer<typeof announcementModerationActionSchema>;

export const announcementAuthorSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().nullable(),
});
export type AnnouncementAuthor = z.infer<typeof announcementAuthorSchema>;

export const announcementBusinessReferenceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  uen: z.string().optional(),
});
export type AnnouncementBusinessReference = z.infer<typeof announcementBusinessReferenceSchema>;

export const announcementItemSchema = z.object({
  id: z.string().min(1),
  businessId: z.string().min(1),
  userId: z.string().min(1),
  title: z.string(),
  content: z.string(),
  imageUrl: z.string().nullable(),
  linkUrl: z.string().nullable(),
  startsAt: z.coerce.date().nullable(),
  endsAt: z.coerce.date().nullable(),
  status: announcementStatusSchema,
  moderationReason: z.string().nullable(),
  canonicalUrl: z.string().optional(),
  author: announcementAuthorSchema.optional(),
  business: announcementBusinessReferenceSchema.optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type AnnouncementItem = z.infer<typeof announcementItemSchema>;

export const announcementsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).max(256).optional(),
});
export type AnnouncementsQuery = z.infer<typeof announcementsQuerySchema>;

export const announcementsResponseSchema = z.object({
  items: z.array(announcementItemSchema),
  nextCursor: z.string().nullable(),
});
export type AnnouncementsResponse = z.infer<typeof announcementsResponseSchema>;

export const announcementModerationAuditItemSchema = z.object({
  id: z.string().min(1),
  announcementId: z.string().min(1),
  actorId: z.string().min(1),
  previousStatus: announcementStatusSchema,
  nextStatus: announcementStatusSchema,
  reason: z.string(),
  createdAt: z.coerce.date(),
});
export type AnnouncementModerationAuditItem = z.infer<typeof announcementModerationAuditItemSchema>;

export const announcementAuditsResponseSchema = z.object({
  items: z.array(announcementModerationAuditItemSchema),
});
export type AnnouncementAuditsResponse = z.infer<typeof announcementAuditsResponseSchema>;
