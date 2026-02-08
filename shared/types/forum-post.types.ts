export interface ForumPost {
    id: number;
    email: string;
    imageUrl: string;
    businessName: string;
    uen: string;
    title: string;
    body: string;
    likeCount: number;
    createdAt: Date;
    replies: ForumPostReply[];
}

export interface ForumPostReply {
    id: number;
    postId: number;
    email: string;
    imageUrl: string;
    body: string;
    likeCount: number;
    createdAt: Date;
}
