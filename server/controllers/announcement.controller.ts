import AnnouncementService from "services/announcement.service"
import { Context } from "hono"
import { createAnnouncementSchema, deleteAnnouncementSchema, getAnnouncementsByUenSchema, updateAnnouncementSchema } from "../../shared/zod-schemas/announcement.schema";

class AnnouncementController {
    static async newAnnouncement(c: Context): Promise<void> {

        const payload = await c.req.json()
        const validationResult = createAnnouncementSchema.safeParse(payload)
        
        if (!validationResult.success) {
            throw validationResult.error
        }

        const announcement = validationResult.data
        await AnnouncementService.newAnnouncement(announcement);
        
        c.json({ 
            message: "Announcement added successfully" 
        }, 201);
        
    }

    static async getAllAnnouncements(c: Context): Promise<void> {

        const announcements = await AnnouncementService.getAllAnnouncements();
        c.json(announcements, 200)

    }

    static async getAnnouncementsByUEN(c: Context): Promise<void> {
        
        const payload = c.req.param('uen')
        const validationResult = getAnnouncementsByUenSchema.safeParse({uen: payload})
        
        if (!validationResult.success) {
            throw validationResult.error
        }

        const uen = validationResult.data.uen

        const announcements = await AnnouncementService.getAnnouncementsByUEN(uen);
        c.json(announcements, 200)

    }

    static async updateAnnouncement (c: Context): Promise<void> {

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
        c.json({ 
            message: "Announcement updated successfully" 
        }, 200)
        
    } 

    static async deleteAnnouncement (c: Context): Promise<void> {
        
        const payload = await c.req.json()
        const validationResult = deleteAnnouncementSchema.safeParse(payload)
        
        if (!validationResult.success) {
            throw validationResult.error
        }

        const announcementId = validationResult.data.announcementId

        await AnnouncementService.deleteAnnouncement(announcementId)
        c.json({ 
            message: "Announcement deleted successfully" 
        }, 200)
        
    } 
}

export default AnnouncementController