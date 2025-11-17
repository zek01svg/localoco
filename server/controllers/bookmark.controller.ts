import BookmarkService from "services/bookmark.service"
import { Context } from "hono"
import { getUserBookmarksSchema, updateBookmarksSchema } from "../../shared/zod-schemas/bookmark.schema"

class BookmarkController{

    static async getUserBookmarks (c: Context): Promise<void> {
        
        const payload = await c.req.param('userId')
        const validationResult = getUserBookmarksSchema.safeParse({userId: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }

        const userId = validationResult.data.userId

        const userBookmarks = await BookmarkService.getUserBookmarks(userId)
        c.json(userBookmarks, 200)
    }

    static async updateBookmarks (c: Context): Promise<void> {
        
        const payload = await c.req.json()
        const validationResult = updateBookmarksSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const clicked = validationResult.data.clicked
        const userId = validationResult.data.userId
        const uen = validationResult.data.uen

        
        await BookmarkService.updateBookmarks(userId, uen, clicked)
        c.json({ 
            message: "User bookmarks updated successfully" 
        }, 200)
        
    }
}

export default BookmarkController