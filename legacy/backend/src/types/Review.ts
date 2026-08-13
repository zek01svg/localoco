export interface Review {
    id: number,
    userEmail: string,
    businessUEN: string,
    rating: number,
    body: string,
    likeCount: number,
    createdAt: string
}

export interface UpdateReviewData {
    rating: number,
    body: string,
}