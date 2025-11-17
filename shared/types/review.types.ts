export interface Review {
    id: number,
    email: string,
    uen: string,
    rating: number,
    body: string,
    likeCount: number,
    createdAt: string
}

export interface UpdateReviewData {
    rating: number,
    body: string,
}