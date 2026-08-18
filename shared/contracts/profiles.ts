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
export type PublicProfile = z.infer<typeof publicProfileSchema>;
