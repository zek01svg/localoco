import { Announcement } from '../../shared/types/announcement.types';
import db from '../database/db'
import { businessAnnouncements } from '../database/schema';
import { eq } from 'drizzle-orm';
import checkDbResult from 'server/utils/check-db-result';

class AnnouncementService {
    
    /**
     * Creates a new business announcement in the database.
     *
     * @param {Omit<Announcement, 'updatedAt' | 'announcementId' | 'createdAt'>} announcement - The announcement object.
     * @returns {Promise<void>} Resolves on success.
     * @throws {Error} Throws an error if the database insertion fails.
     */
    public static async newAnnouncement (announcement:Omit<Announcement, 'updatedAt' | 'announcementId' | 'createdAt'>):Promise<void | Error> {
        const rawResult = await db.insert(businessAnnouncements).values({
            uen: announcement.uen,
            title: announcement.title,
            content: announcement.content,
            imageUrl: announcement.imageUrl,
        })

        if (!checkDbResult(rawResult)) {
            throw new Error('Failed to create new announcement')
        }
    } 

    /**
     * Retrieves all business announcements from the database.
     *
     * @returns {Promise<Announcement[]>} A promise that resolves to an array of all `Announcement` objects.
     */
    public static async getAllAnnouncements ():Promise<Announcement[]> {
        const announcements:Announcement[] = await db.select().from(businessAnnouncements)
        return announcements
    } 

    /**
     * Retrieves all announcements for a specific business, identified by its UEN.
     *
     * @param {string} uen - The Unique Entity Number (UEN) of the business.
     * @returns {Promise<Announcement[]>} A promise that resolves to an array of `Announcement` objects matching the specified UEN.
     */
    public static async getAnnouncementsByUEN (uen:string):Promise<Announcement[]> {
        const announcements:Announcement[] = await db.select().from(businessAnnouncements).where(eq(businessAnnouncements.uen, uen))
        return announcements
    } 

    /**
     * Updates an existing business announcement in the database.
     *
     * @param {number} announcementId - The unique identifier of the announcement to update.
     * @param {Omit<Announcement, 'updatedAt' | 'announcementId' | 'createdAt'>} announcementToUpdate - An object containing the new data.
     * @returns {Promise<void>} Resolves on success.
     * @throws {Error} Throws an error if the database update fails.
     */
    public static async updateAnnouncement (announcementId:number, announcementToUpdate:Omit<Announcement, 'updatedAt' | 'announcementId' | 'createdAt'>):Promise<void | Error> {
        const rawResult = await db.update(businessAnnouncements).set(announcementToUpdate).where(eq(businessAnnouncements.announcementId, announcementId))
        if (!checkDbResult(rawResult)) {
            throw new Error('Failed to update announcement')
        }
    } 

    /**
     * Deletes a business announcement from the database by its unique ID.
     *
     * @param {number} announcementId - The unique identifier of the announcement to delete.
     * @returns {Promise<void>} Resolves on success.
     * @throws {Error} Throws an error if the database deletion fails.
     */
    public static async deleteAnnouncement (announcementId:number):Promise<void | Error> {
        const rawResult = await db.delete(businessAnnouncements).where(eq(businessAnnouncements.announcementId, announcementId))
        if(!checkDbResult(rawResult)) {
            throw new Error('Failed to delete announcement')
        }
    } 
}

export default AnnouncementService