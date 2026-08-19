import { z } from "zod/v4";

// Event title bounds: non-empty, max 200 characters.
export const eventTitleSchema = z
  .string()
  .trim()
  .min(1, { message: "Title cannot be empty" })
  .max(200, { message: "Title cannot exceed 200 characters" });

// Event description bounds: non-empty, max 4000 characters.
export const eventDescriptionSchema = z
  .string()
  .trim()
  .min(1, { message: "Description cannot be empty" })
  .max(4000, { message: "Description cannot exceed 4000 characters" });

// Image URL must be a valid URL using HTTPS, max 1000 characters.
export const eventImageUrlSchema = z
  .url({ message: "Image URL must be a valid URL" })
  .max(1000, { message: "Image URL cannot exceed 1000 characters" })
  .refine(url => url.startsWith("https://"), { message: "Image URL must use HTTPS" });

// External Link URL must be a valid URL using HTTPS, max 1000 characters.
export const eventLinkUrlSchema = z
  .url({ message: "Link URL must be a valid URL" })
  .max(1000, { message: "Link URL cannot exceed 1000 characters" })
  .refine(url => url.startsWith("https://"), { message: "Link URL must use HTTPS" });

export const eventStatusSchema = z.enum(["active", "moderated"]);
export type EventStatus = z.infer<typeof eventStatusSchema>;

export const createEventSchema = z
  .object({
    title: eventTitleSchema,
    description: eventDescriptionSchema,
    imageUrl: eventImageUrlSchema.optional().nullable(),
    linkUrl: eventLinkUrlSchema.optional().nullable(),
    startsAt: z.coerce.date({ message: "Start date is required" }),
    endsAt: z.coerce.date({ message: "End date is required" }),
  })
  .refine(data => data.endsAt >= data.startsAt, {
    message: "End date must not precede start date",
    path: ["endsAt"],
  });
export type CreateEvent = z.infer<typeof createEventSchema>;

export const updateEventSchema = z
  .object({
    title: eventTitleSchema.optional(),
    description: eventDescriptionSchema.optional(),
    imageUrl: eventImageUrlSchema.optional().nullable(),
    linkUrl: eventLinkUrlSchema.optional().nullable(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
  })
  .refine(
    data =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.imageUrl !== undefined ||
      data.linkUrl !== undefined ||
      data.startsAt !== undefined ||
      data.endsAt !== undefined,
    {
      message: "At least one field must be provided",
    }
  )
  .refine(data => (data.startsAt && data.endsAt ? data.endsAt >= data.startsAt : true), {
    message: "End date must not precede start date",
    path: ["endsAt"],
  });
export type UpdateEvent = z.infer<typeof updateEventSchema>;

export const eventModerationActionSchema = z.object({
  action: z.enum(["moderate", "restore"]),
  reason: z
    .string()
    .trim()
    .min(1, { message: "Moderation reason is required" })
    .max(1000, { message: "Reason cannot exceed 1000 characters" }),
});
export type EventModerationAction = z.infer<typeof eventModerationActionSchema>;

export const eventAuthorSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().nullable(),
});
export type EventAuthor = z.infer<typeof eventAuthorSchema>;

export const eventBusinessReferenceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  uen: z.string().optional(),
});
export type EventBusinessReference = z.infer<typeof eventBusinessReferenceSchema>;

export const eventItemSchema = z.object({
  id: z.string().min(1),
  businessId: z.string().min(1),
  userId: z.string().min(1),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().nullable(),
  linkUrl: z.string().nullable(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  status: eventStatusSchema,
  moderationReason: z.string().nullable(),
  canonicalUrl: z.string().optional(),
  author: eventAuthorSchema.optional(),
  business: eventBusinessReferenceSchema.optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type EventItem = z.infer<typeof eventItemSchema>;

export const eventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).max(256).optional(),
});
export type EventsQuery = z.infer<typeof eventsQuerySchema>;

export const eventsResponseSchema = z.object({
  items: z.array(eventItemSchema),
  nextCursor: z.string().nullable(),
});
export type EventsResponse = z.infer<typeof eventsResponseSchema>;

export const eventModerationAuditItemSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  actorId: z.string().min(1),
  previousStatus: eventStatusSchema,
  nextStatus: eventStatusSchema,
  reason: z.string(),
  createdAt: z.coerce.date(),
});
export type EventModerationAuditItem = z.infer<typeof eventModerationAuditItemSchema>;

export const eventAuditsResponseSchema = z.object({
  items: z.array(eventModerationAuditItemSchema),
});
export type EventAuditsResponse = z.infer<typeof eventAuditsResponseSchema>;
