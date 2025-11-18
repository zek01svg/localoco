import { Bookmark } from "../../shared/types/bookmark.types";
import { bookmarkedBusinesses } from "../database/schema";
import db from "../database/db";
import { eq, and } from "drizzle-orm";
import checkDbResult from "server/utils/check-db-result";

class BookmarkService {
    /**
     * Retrieves all bookmarked businesses for a specific user.
     *
     * @param {string} userId - The unique identifier of the user whose bookmarks are to be fetched.
     * @returns {Promise<Bookmark[]>} A promise that resolves to an array of `Bookmark` objects associated with the user.
     */
    public static async getUserBookmarks (userId: string):Promise<Bookmark[]> {
        
        const userBookmarkedBusinesses:Bookmark[] = await db.select().from(bookmarkedBusinesses).where(eq(bookmarkedBusinesses.userId, userId))
        return userBookmarkedBusinesses
    }
    
    /**
     * Adds or removes a business bookmark for a user based on the click state.
     *
     * @param {string} userId - The unique identifier of the user performing the action.
     * @param {string} uen - The Unique Entity Number (UEN) of the business.
     * @param {boolean} clicked - `true` to add the bookmark, `false` to remove it.
     * @returns {Promise<void>} Resolves on success.
     * @throws {Error} Throws an error if the database operation fails.
     */
    public static async updateBookmarks (userId: string, uen: string, clicked: boolean):Promise<void | Error> {
        
        // if clicked on the bookmark button, add bookmark
        if (clicked) {
            const rawResult = await db.insert(bookmarkedBusinesses).values({
                userId:userId,
                uen: uen
            })

            if (!checkDbResult(rawResult)) {
                throw new Error('Failed to add bookmark')
            }
        }
        // otherwise delete from the table
        else {
            const rawResult = await db.delete(bookmarkedBusinesses).where(and(
                eq(bookmarkedBusinesses.uen, uen),
                eq(bookmarkedBusinesses.userId, userId)
                
            ));

            if (!checkDbResult(rawResult)) {
                throw new Error('Failed to delete bookmark')
            }
        }
    }
}

export default BookmarkService