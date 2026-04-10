import { z } from "zod/v4";

export const HydratedReviewSchema = z.object({
  id: z.string(),
  uen: z.string(),
  email: z.string(),
  rating: z.number(),
  comment: z.string().nullable(),
  likeCount: z.number().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  userName: z.string(),
  userImage: z.string(),
});
