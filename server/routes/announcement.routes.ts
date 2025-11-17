import { Hono } from "hono";
import AnnouncementController from "controllers/announcement.controller";
import protectRoute from "../middleware/protect-route";

const announcementRouter = new Hono()

// this route fetches all the announcements for the newsletter
announcementRouter.get('/newsletter', AnnouncementController.getAllAnnouncements)

// this route fetches all the announcements for a business
announcementRouter.get('/announcements/:uen', AnnouncementController.getAnnouncementsByUEN)

// this route handles submissions for announcements
announcementRouter.post('/new-announcement', protectRoute, AnnouncementController.newAnnouncement)

// this route handles submissions to update announcements
announcementRouter.post('/update-announcement', protectRoute, AnnouncementController.updateAnnouncement)

// this route handles deletions for announcements
announcementRouter.post('/delete-announcement', protectRoute, AnnouncementController.deleteAnnouncement)

export default announcementRouter