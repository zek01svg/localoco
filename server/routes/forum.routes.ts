import { Hono } from "hono";
import ForumController from "controllers/forum.controller";
import protectRoute from "../middleware/protect-route";
const forumRouter = new Hono()

// this route fetches all the posts for the forum page
forumRouter.get('/', ForumController.getAllForumPosts)

// this route fetches all forum posts tagged to a business
forumRouter.get('/:uen', ForumController.getForumPostsByBusinessUEN)

// this route creates a new forum post
forumRouter.post('/new-post', protectRoute, ForumController.createForumPost)

// this route creates a new reply for a forum post
forumRouter.post('/new-reply', protectRoute, ForumController.createForumReply)

// this route updates the likes for forum posts 
forumRouter.put('/like-forum-post', protectRoute, ForumController.updatePostLikes)

// this route updates the likes for forum replies
forumRouter.put('/like-forum-reply', protectRoute, ForumController.updateReplyLikes)

export default forumRouter