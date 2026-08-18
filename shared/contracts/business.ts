import { z } from "zod/v4";

// The private shape of a Business as seen by its owner or an administrator.
// Ownership is derived from the session server-side; `ownerId` never leaves
// the server in this contract.
export const businessSchema = z.object({
  id: z.string().min(1),
  uen: z.string().min(1),
});
export type Business = z.infer<typeof businessSchema>;

// UEN validation stays deliberately loose here; normalization, format rules,
// and the unique database constraint arrive with the Business creation slice.
export const businessUpdateSchema = z.object({
  uen: z.string().trim().min(1).max(64),
});
export type BusinessUpdate = z.infer<typeof businessUpdateSchema>;

export const businessesQuerySchema = z.object({
  selected: z.string().min(1).max(256).optional(),
});
export type BusinessesQuery = z.infer<typeof businessesQuerySchema>;

export const businessesResponseSchema = z.object({
  items: z.array(businessSchema),
  selectedId: z.string().nullable(),
});
export type BusinessesResponse = z.infer<typeof businessesResponseSchema>;
