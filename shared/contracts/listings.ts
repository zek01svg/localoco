import { z } from "zod/v4";

// The public shape of a Listing, defined once at the trust boundary and used
// for both provider (data seam) rows and HTTP responses. Transport types are
// inferred from these schemas; client and server never maintain parallel
// interfaces.
export const listingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  address: z.string().min(1),
  postalCode: z.string().min(1),
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
});
export type ListingsQuery = z.infer<typeof listingsQuerySchema>;

export const listingsResponseSchema = z.object({
  items: z.array(listingSchema),
  nextCursor: z.string().nullable(),
});
export type ListingsResponse = z.infer<typeof listingsResponseSchema>;
