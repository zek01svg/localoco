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
export type Bookmark = z.infer<typeof bookmarkSchema>;

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
export type BookmarkItem = z.infer<typeof bookmarkItemSchema>;

export const bookmarkCreateSchema = z.object({
  businessId: z.string().trim().min(1).max(256),
});
export type BookmarkCreate = z.infer<typeof bookmarkCreateSchema>;

export const bookmarksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().trim().min(1).max(256).optional(),
});

export type BookmarksQuery = z.infer<typeof bookmarksQuerySchema>;

export const bookmarksResponseSchema = z.object({
  items: z.array(bookmarkItemSchema),
  nextCursor: z.string().nullable(),
});
export type BookmarksResponse = z.infer<typeof bookmarksResponseSchema>;

export const bookmarkActionResponseSchema = z.object({
  status: z.enum(["bookmarked", "removed"]),
  bookmark: bookmarkSchema.optional(),
});
export type BookmarkActionResponse = z.infer<typeof bookmarkActionResponseSchema>;

export const bookmarkStatusResponseSchema = z.object({
  bookmarked: z.boolean(),
  bookmark: bookmarkSchema.nullable(),
});
export type BookmarkStatusResponse = z.infer<typeof bookmarkStatusResponseSchema>;
