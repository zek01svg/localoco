import { Hono } from "hono";
import BookmarkController from "controllers/bookmark.controller";
import protectRoute from "../middleware/protect-route";
const bookmarkRouter = new Hono()

// this route gets all the bookmarked businesses of a user
bookmarkRouter.get('/:userId/bookmarks', protectRoute, BookmarkController.getUserBookmarks)

// this route handles a bookmark button click
bookmarkRouter.put('/update-bookmark', protectRoute, BookmarkController.updateBookmarks)

export default bookmarkRouter