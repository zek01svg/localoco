import { z } from 'zod';

// for createAnnouncementSchema
export const createAnnouncementSchema = z.object({
    uen: z.string().min(1, "Business UEN is required"),
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    imageUrl: z.string("Invalid image URL").default(''),
});

// for getAnnouncementsByUen
export const getAnnouncementsByUenSchema = z.object({
    uen: z.string().min(1, "UEN is required"),
});

// for updateAnnouncement
export const updateAnnouncementSchema = z.object({
    announcementId: z.number().int().positive("Announcement ID must be positive"),
    uen: z.string().min(1, "Business UEN is required"),
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    imageUrl: z.string("Invalid image URL").default(''),
});

// for deleteAnnouncement
export const deleteAnnouncementSchema = z.object({
    announcementId: z.number().int().positive("Announcement ID must be positive"),
});