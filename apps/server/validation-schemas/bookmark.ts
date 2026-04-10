import { z } from "zod/v4";

import { HydratedBusinessSchema } from "./business";

export const BookmarkWithDetailsSchema = z.object({
  id: z.string(),
  uen: z.string(),
  userId: z.string(),
  createdAt: z.string().or(z.date()).nullable(),
  business: HydratedBusinessSchema,
});
