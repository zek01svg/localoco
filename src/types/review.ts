export interface SubmitReviewData {
    userEmail: string;
    businessUEN: string;
    title?: string;
    body: string;
    rating: number;
}

export interface BackendReview {
    id: number;
    userEmail: string;
    userName?: string | null;
    userImage?: string | null;
    businessUen: string;
    rating: number;
    body: string;
    likeCount: number;
    createdAt: string;
}
