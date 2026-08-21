import { z } from "zod/v4";

// The public face of a User, defined once at the trust boundary. Private
// account fields (email, verification state, timestamps) are structurally
// absent here — nothing strips them at render time. Public Review and Forum
// contribution streams arrive with the Reviews (PRS-190) and Forum (PRS-191)
// slices; until then this is the whole public profile.
export const publicProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().nullable(),
});

// The private shape of a User's own account, served only to the session user.
// Structurally separate from the public contract: email and verification
// state can never appear in a public response through this file's shapes.
export const privateProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().nullable(),
  email: z.string().min(1),
  emailVerified: z.boolean(),
  // The seam validates the DB row (a Date) and the client parses the wire
  // (an ISO-8601 string): coerce accepts both.
  createdAt: z.coerce.date(),
});

// The session user's own profile edits. Unknown keys — any client-supplied
// identifier — are stripped by zod, so a body identifier is data, never a
// subject. At least one field must be present.
export const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1).max(64).optional(),
    avatarUrl: z.url().max(2048).nullable().optional(),
  })
  .refine(update => update.displayName !== undefined || update.avatarUrl !== undefined, {
    message: "At least one profile field must be provided",
  });
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export const emailChangeSchema = z.object({
  email: z.email().max(254),
});
export type EmailChange = z.infer<typeof emailChangeSchema>;

// Email changes are double opt-in (confirm at the old address, then verify at
// the new one), so the endpoint answers before the email actually changes.
export const emailChangeResponseSchema = z.object({
  status: z.literal("confirmation_sent"),
});
export type EmailChangeResponse = z.infer<typeof emailChangeResponseSchema>;

// Deletion preview: counts of owned Listings, authored contributions, affected
// Forum posts, and third-party Replies destroyed if the User's account is
// permanently deleted.
export const deletionPreviewSchema = z.object({
  ownedListings: z.number().int().nonnegative(),
  authoredContributions: z.number().int().nonnegative(),
  affectedForumPosts: z.number().int().nonnegative(),
  thirdPartyReplies: z.number().int().nonnegative(),
});
export type DeletionPreview = z.infer<typeof deletionPreviewSchema>;

// Explicit destructive confirmation payload requiring password reauthentication
// and typing "DELETE".
export const accountDeletionSchema = z.object({
  password: z.string().min(1, "Password is required for reauthentication"),
  confirmation: z.literal("DELETE"),
});
export type AccountDeletion = z.infer<typeof accountDeletionSchema>;

export const accountDeletionResponseSchema = z.object({
  status: z.literal("account_deleted"),
  deletedAt: z.coerce.date(),
});
export type AccountDeletionResponse = z.infer<typeof accountDeletionResponseSchema>;
