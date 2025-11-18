import AnnouncementService from "server/services/announcement.service";
import { Context } from "hono"
import { createAnnouncementSchema, deleteAnnouncementSchema, getAnnouncementsByUenSchema, updateAnnouncementSchema } from "../../shared/zod-schemas/announcement.schema";

class AnnouncementController {

    /**
     * Creates a new announcement.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with a success message.
     */
    static async newAnnouncement(c: Context): Promise<Response> {

        const payload = await c.req.json()
        const validationResult = createAnnouncementSchema.safeParse(payload)
        
        if (!validationResult.success) {
            throw validationResult.error
        }

        const announcement = validationResult.data
        await AnnouncementService.newAnnouncement(announcement);
        
        return c.json({ 
            message: "Announcement added successfully" 
        }, 201);
    }

    /**
     * Retrieves all announcements.
     * @param {Context} c - The Hono context.
     * @returns {Promise<Response>} A JSON response containing an array of all announcements.
     */
    static async getAllAnnouncements(c: Context): Promise<Response> {

        const announcements = await AnnouncementService.getAllAnnouncements();
        return c.json(announcements, 200)
    }

    /**
     * Retrieves all announcements for a specific business UEN.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the UEN parameter fails validation.
     * @returns {Promise<Response>} A JSON response containing an array of announcements for the specified business.
     */
    static async getAnnouncementsByUEN(c: Context): Promise<Response> {
        
        const payload = c.req.param('uen')
        const validationResult = getAnnouncementsByUenSchema.safeParse({uen: payload})
        
        if (!validationResult.success) {
            throw validationResult.error
        }

        const uen = validationResult.data.uen

        const announcements = await AnnouncementService.getAnnouncementsByUEN(uen);
        return c.json(announcements, 200)
    }

    /**
     * Updates an existing announcement.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with a success message.
     */
    static async updateAnnouncement (c: Context): Promise<Response> {

        const payload = await c.req.json()
        const validationResult = updateAnnouncementSchema.safeParse(payload)
        
        if (!validationResult.success) {
            throw validationResult.error
        }

        const announcementId = validationResult.data.announcementId
        const announcementToUpdate = {
            uen: validationResult.data.uen,
            title: validationResult.data.title,
            content: validationResult.data.content,
            imageUrl: validationResult.data.imageUrl
        }

        await AnnouncementService.updateAnnouncement(announcementId, announcementToUpdate)
        return c.json({ 
            message: "Announcement updated successfully" 
        }, 200)
        
    } 

    /**
     * Deletes an announcement by its ID.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with a success message.
     */
    static async deleteAnnouncement (c: Context): Promise<Response> {
        
        const payload = await c.req.json()
        const validationResult = deleteAnnouncementSchema.safeParse(payload)
        
        if (!validationResult.success) {
            throw validationResult.error
        }

        const announcementId = validationResult.data.announcementId

        await AnnouncementService.deleteAnnouncement(announcementId)
        return c.json({ 
            message: "Announcement deleted successfully" 
        }, 200)        
    } 
}

export default AnnouncementController