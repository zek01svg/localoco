export interface ForumPost {
    id: number,
    userEmail: string,
    userImage?: string | null,
    businessName: string | null,
    businessUen: string | null,
    title: string | null,
    body: string,
    likeCount: number,
    createdAt: string,
    replies: ForumPostReply[]
}

export interface ForumPostReply {
    id: number;
    postId: number;
    userEmail: string;
    userImage?: string | null;
    body: string;
    likeCount: number | null;
    createdAt: string | null;
}