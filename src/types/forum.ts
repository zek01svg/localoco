export interface BackendForumPost {
    id: number;
    userEmail: string;
    businessUen: string | null;
    title: string | null;
    body: string;
    likeCount: number;
    createdAt: string;
    replies: Array<{
        id: number;
        postId: number;
        userEmail: string;
        body: string;
        likeCount: number | null;
        createdAt: string | null;
    }>;
}

export interface ForumReply {
    id: string;
    discussionId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    createdAt: string;
    likes: number;
}

export interface ForumDiscussion {
    id: string;
    title: string;
    businessTag?: string;
    businessUen?: string;
    content: string;
    userName: string;
    userAvatar?: string;
    createdAt: string;
    likes: number;
    replies: ForumReply[];
}

export interface ForumState {
    discussions: ForumDiscussion[];
    isLoading: boolean;
    error: string | null;
    setDiscussions: (discussions: ForumDiscussion[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    addDiscussion: (discussion: ForumDiscussion) => void;
    likeDiscussion: (id: string) => void;
    likeReply: (discussionId: string, replyId: string) => void;
    addReply: (discussionId: string, reply: ForumReply) => void;
}
