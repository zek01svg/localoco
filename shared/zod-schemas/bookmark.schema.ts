import { z } from 'zod';

// for getUserBookmarks
export const getUserBookmarksSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
});

// for updateBookmarks
export const updateBookmarksSchema = z.object({
    clicked: z.boolean(),
    userId: z.string().min(1, "User ID is required"),
    uen: z.string().min(1, "UEN is required"),
});