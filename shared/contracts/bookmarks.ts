import { z } from "zod/v4";

import { listingSchema } from "./listings";

// The base shape of a Bookmark record.
// The seam validates the DB row (a Date) and the client parses the wire
// (an ISO-8601 string): coerce accepts both.
export const bookmarkSchema = z.object({
  id: z.string().min(1),
  businessId: z.string().min(1),
  createdAt: z.coerce.date(),
});

// Detailed item in a user's private bookmark list, including the referenced
// Business and published Listing details if available.
export const bookmarkItemSchema = z.object({
  id: z.string().min(1),
  businessId: z.string().min(1),
  createdAt: z.coerce.date(),
  business: z.object({
    id: z.string().min(1),
    uen: z.string().min(1),
  }),
  listing: listingSchema.nullable(),
});

export const bookmarkCreateSchema = z.object({
  businessId: z.string().trim().min(1).max(256),
});

export const bookmarksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().trim().min(1).max(256).optional(),
});

export const bookmarksResponseSchema = z.object({
  items: z.array(bookmarkItemSchema),
  nextCursor: z.string().nullable(),
});

export const bookmarkActionResponseSchema = z.object({
  status: z.enum(["bookmarked", "removed"]),
  bookmark: bookmarkSchema.optional(),
});

export const bookmarkStatusResponseSchema = z.object({
  bookmarked: z.boolean(),
  bookmark: bookmarkSchema.nullable(),
});
export type BookmarkStatusResponse = z.infer<typeof bookmarkStatusResponseSchema>;
