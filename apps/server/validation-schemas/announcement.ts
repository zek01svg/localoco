import { z } from "zod/v4";

export const AnnouncementWithBusinessSchema = z.object({
  id: z.string(),
  uen: z.string(),
  title: z.string(),
  content: z.string(),
  image: z.string().nullable(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
  businessName: z.string(),
  businessLogo: z.string(),
});
