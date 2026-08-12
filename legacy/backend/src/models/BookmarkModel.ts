import { Bookmark } from "../types/Bookmark.js";
import { bookmarkedBusinesses } from "../database/schema.js";
import db from "../database/db.js";
import { eq, and } from "drizzle-orm";
import { ResultSetHeader } from "mysql2";

class BookmarkModel {
    public static async getUserBookmarks (userId: string):Promise<Bookmark[]> {
        
        const userBookmarkedBusinesses:Bookmark[] = await db.select().from(bookmarkedBusinesses).where(eq(bookmarkedBusinesses.userId, userId))
        return userBookmarkedBusinesses
    }

    public static async updateBookmarks (userId: string, businessUen: string, clicked: boolean):Promise<void> {
        
        // if clicked on the bookmark button, add bookmark
        if (clicked) {
            await db.insert(bookmarkedBusinesses).values({
                userId:userId,
                businessUen: businessUen
            })
        }
        // otherwise delete from the table
        else {
            await db.delete(bookmarkedBusinesses).where(and(
                eq(bookmarkedBusinesses.businessUen, businessUen),
                eq(bookmarkedBusinesses.userId, userId)
                
            ))
        }
    }
}

export default BookmarkModel