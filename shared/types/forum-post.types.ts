export interface ForumPost {
    id: number,
    email: string,
    image?: string | null,
    businessName: string | null,
    uen: string | null,
    title: string | null,
    body: string,
    likeCount: number,
    createdAt: string,
    replies: ForumPostReply[]
}

export interface ForumPostReply {
    id: number;
    postId: number;
    email: string;
    image?: string | null;
    body: string;
    likeCount: number | null;
    createdAt: string | null;
}