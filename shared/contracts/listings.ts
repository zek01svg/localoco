import { z } from "zod/v4";

import { businessHoursScheduleSchema } from "./business-hours";

export const listingStatusSchema = z.enum([
  "draft",
  "pending_review",
  "published",
  "rejected",
  "suspended",
]);
export type ListingStatus = z.infer<typeof listingStatusSchema>;

// Field-level validation shared by Business + draft Listing creation, the
// owner's Listing edit, and every Listing response (public and owner-scoped).
// Bounds mirror the PostgreSQL column definitions in server/database/listing.ts
// exactly, so nothing the API accepts can be rejected (or truncated) by the
// database — this object is the single definition of a Listing's shape.
export const listingFields = {
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(500),
  postalCode: z.string().trim().min(1).max(12),
  // Optional fields accept null so an owner can clear a previously set value;
  // null is stored as SQL NULL, identical to never setting it. An empty
  // string means the same thing and is normalized to null here.
  phone: z
    .string()
    .trim()
    .max(32)
    .transform(v => v || null)
    .nullish(),
  email: z.email().max(254).nullish(),
  website: z
    .string()
    .trim()
    .max(500)
    .transform(v => v || null)
    .nullish(),
  paymentOptions: z.array(z.string().trim().min(1).max(32)).max(8).nullish(),
  priceRange: z
    .string()
    .trim()
    .max(32)
    .transform(v => v || null)
    .nullish(),
} as const;

// The public shape of a Listing, defined once at the trust boundary and used
// for both provider (data seam) rows and HTTP responses. Transport types are
// inferred from these schemas; client and server never maintain parallel
// interfaces. Only published Listings are returned here; draft and moderated
// Listings are structurally absent from public responses.
//
// Coordinates are server-derived (geocoded at write time) and are therefore
// response-only: they are absent from `listingFields`, so a submitted
// latitude/longitude is stripped by validation and can never be client-set.
// Null means the row predates address validation and renders no Listing
// location until its address is next edited.
export const listingSchema = z.object({
  id: z.string().min(1),
  ...listingFields,
  latitude: z.number().finite().nullable(),
  longitude: z.number().finite().nullable(),
});
export type Listing = z.infer<typeof listingSchema>;

export const listingsQuerySchema = z.object({
  limit: z
    .string()
    .default("20")
    .transform(Number)
    .refine(value => Number.isInteger(value) && value >= 1 && value <= 100, {
      message: "limit must be an integer between 1 and 100",
    }),
  cursor: z.string().min(1).max(256).optional(),
  // Normalized search text matched case- and whitespace-insensitively against
  // the Listing's name and descriptive text (category and address). Empty
  // after trimming means no search filter.
  q: z.string().trim().max(200).optional(),
  // Exact category match; the valid values are the distinct categories of
  // published Listings, served by GET /api/listings/categories.
  category: z.string().trim().min(1).max(100).optional(),
});
export type ListingsQuery = z.infer<typeof listingsQuerySchema>;

export const listingsResponseSchema = z.object({
  items: z.array(listingSchema),
  nextCursor: z.string().nullable(),
});
export type ListingsResponse = z.infer<typeof listingsResponseSchema>;

export const listingsCategoriesResponseSchema = z.object({
  items: z.array(z.string()),
});
export type ListingsCategoriesResponse = z.infer<typeof listingsCategoriesResponseSchema>;

// The Listing as its owner sees it: the full lifecycle status, rejection reason
// (when rejected), plus validated fields. Database reads return NULL for absent
// optional columns, which these schemas accept. `hours` is always present: an
// empty array means the Business has recorded no opening hours (a defined,
// closed-when-evaluated state, never an accidental one).
export const ownerListingSchema = listingSchema.extend({
  status: listingStatusSchema,
  rejectionReason: z.string().nullable().optional(),
  hours: businessHoursScheduleSchema,
});
export type OwnerListing = z.infer<typeof ownerListingSchema>;

// Any subset of the Listing fields; a client sends only what it is changing.
// `partial` keeps every field optional without loosening the per-field bounds.
// `hours` replaces the whole schedule when present; absent means unchanged.
// `status` is not present here: clients cannot directly mutate lifecycle status
// via general listing edits.
export const ownerListingUpdateSchema = z
  .object({
    ...listingFields,
    hours: businessHoursScheduleSchema,
  })
  .partial();
export type OwnerListingUpdate = z.infer<typeof ownerListingUpdateSchema>;

export const listingModerationActionSchema = z.object({
  action: z.enum(["publish", "reject", "suspend"]),
  reason: z.string().trim().min(1).max(1000),
});
export type ListingModerationAction = z.infer<typeof listingModerationActionSchema>;

export const listingAuditRecordSchema = z.object({
  id: z.string().min(1),
  listingId: z.string().min(1),
  actorId: z.string().min(1),
  previousStatus: listingStatusSchema,
  nextStatus: listingStatusSchema,
  reason: z.string(),
  createdAt: z.coerce.date(),
});
export type ListingAuditRecord = z.infer<typeof listingAuditRecordSchema>;

export const listingAuditsResponseSchema = z.object({
  items: z.array(listingAuditRecordSchema),
});
export type ListingAuditsResponse = z.infer<typeof listingAuditsResponseSchema>;
