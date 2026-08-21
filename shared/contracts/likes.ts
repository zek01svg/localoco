import { z } from "zod/v4";

export const likeActionResponseSchema = z.object({
  status: z.enum(["liked", "unliked"]),
  liked: z.boolean(),
  likeCount: z.number().int().min(0),
});
export type LikeActionResponse = z.infer<typeof likeActionResponseSchema>;
