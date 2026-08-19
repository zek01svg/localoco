import { z } from "zod/v4";

import { listingFields, ownerListingSchema } from "./listings";

// The private shape of a Business as seen by its owner or an administrator.
// Ownership is derived from the session server-side; `ownerId` never leaves
// the server in this contract.
export const businessSchema = z.object({
  id: z.string().min(1),
  uen: z.string().min(1),
});
export type Business = z.infer<typeof businessSchema>;

// Singapore UEN formats, validated after normalization (trim + uppercase):
// - nnnnnnnnX  (9 chars: 8 digits + 1 letter) — pre-2009 ACRA companies
// - nnnnnnnnnX (10 chars: 9 digits + 1 letter) — post-2009 ACRA entities
// - TyyXXnnnnX (10 chars: T + 2-digit year + 2 entity letters + 4 digits + 1
//   letter) — other entities (LLP, foreign company, partnership, ...)
export const uenField = z
  .string()
  .trim()
  .toUpperCase()
  .refine(value => /^(\d{8}[A-Z]|\d{9}[A-Z]|T\d{2}[A-Z]{2}\d{4}[A-Z])$/u.test(value), {
    message: "UEN must be a valid Singapore UEN",
  });
export type Uen = z.infer<typeof uenField>;

// UEN uniqueness is enforced by the PostgreSQL unique constraint on the
// normalized value, not by a check-then-insert, so concurrent creation of the
// same Business cannot both succeed.
export const businessUpdateSchema = z.object({
  uen: uenField,
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

// Creating a Business also creates its draft Listing in one atomic write. The
// actor is never a client claim: `ownerId` is derived from the session and is
// absent from this contract, so a submitted owner identifier is stripped by
// validation and cannot create a Business for someone else.
export const businessCreateSchema = z.object({
  uen: uenField,
  listing: z.object(listingFields),
});
export type BusinessCreate = z.infer<typeof businessCreateSchema>;

export const businessCreationResponseSchema = z.object({
  id: z.string().min(1),
  uen: uenField,
  listing: ownerListingSchema,
});
export type BusinessCreationResponse = z.infer<typeof businessCreationResponseSchema>;

// Ownership changes only through the administrative transfer operation:
// `ownerId` is absent from Business and Listing update contracts, so no other
// edit path can move a Business between Users. The target is an existing
// verified login User and the reason is a mandatory, immutable part of the
// audit record.
export const ownershipTransferSchema = z.object({
  ownerId: z.string().min(1).max(256),
  reason: z.string().trim().min(1).max(1000),
});
export type OwnershipTransfer = z.infer<typeof ownershipTransferSchema>;
