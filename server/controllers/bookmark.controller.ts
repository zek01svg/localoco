import BookmarkService from "server/services/bookmark.service"
import { Context } from "hono"
import { getUserBookmarksSchema, updateBookmarksSchema } from "../../shared/zod-schemas/bookmark.schema"

class BookmarkController{

    /**
     * Retrieves all bookmarks for a specific user.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the userId parameter fails validation.
     * @returns {Promise<Response>} A JSON response containing an array of the user's bookmarked businesses.
     */
    static async getUserBookmarks (c: Context): Promise<Response> {
        
        const payload = await c.req.param('userId')
        const validationResult = getUserBookmarksSchema.safeParse({userId: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }

        const userId = validationResult.data.userId

        const userBookmarks = await BookmarkService.getUserBookmarks(userId)
        return c.json(userBookmarks, 200)
    }

    /**
     * Adds or removes a bookmark for a user.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with a success message.
     */
    static async updateBookmarks (c: Context): Promise<Response> {
        
        const payload = await c.req.json()
        const validationResult = updateBookmarksSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const clicked = validationResult.data.clicked
        const userId = validationResult.data.userId
        const uen = validationResult.data.uen

        
        await BookmarkService.updateBookmarks(userId, uen, clicked)
        return c.json({ 
            message: "User bookmarks updated successfully" 
        }, 200)
        
    }
}

export default BookmarkController