import type { ForumPost, ForumPostReply } from "@server/database/schema";

export interface HydratedForumPost extends ForumPost {
  imageUrl: string;
  businessName: string;
  replies: HydratedForumPostReply[];
}

export interface HydratedForumPostReply extends ForumPostReply {
  imageUrl: string;
}
