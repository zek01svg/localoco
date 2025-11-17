import { useState, useCallback, useEffect } from "react";
import { Review } from "../types/business";
import { SubmitReviewData } from "../types/review";
import { BackendReview } from "../types/review";

// Transform backend review to frontend Review type
const transformBackendReview = (
    backendReview: BackendReview,
    businessId: string,
): Review => {
    // Use userName from backend, fallback to email if not available
    const userName =
        backendReview.userName || backendReview.userEmail.split("@")[0];

    return {
        id: backendReview.id.toString(),
        businessId: businessId,
        userName: userName,
        userAvatar: backendReview.userImage || undefined,
        rating: backendReview.rating,
        comment: backendReview.body,
        date: backendReview.createdAt,
    };
};

export const useReviews = (businessId?: string) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submitReview = useCallback(async (reviewData: SubmitReviewData) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`/api/submit-review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reviewData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Server error response:", errorText);
                throw new Error("Failed to submit review");
            }

            const result = await response.json();
            return result;
        } catch (error: any) {
            console.error("Submit review error:", error);
            setError(error.message || "Failed to submit review");
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const getBusinessReviews = useCallback(
        async (businessUen: string): Promise<Review[]> => {
            try {
                const response = await fetch(`/api/reviews?uen=${businessUen}`);
                if (!response.ok) throw new Error("Failed to fetch reviews");

                const backendReviews: BackendReview[] = await response.json();

                // Sort reviews by createdAt date, latest first
                const sortedReviews = backendReviews.sort((a, b) => {
                    return (
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    );
                });

                return sortedReviews.map((review) =>
                    transformBackendReview(review, businessUen),
                );
            } catch (error: any) {
                console.error("Fetch reviews error:", error);
                setError(error.message || "Failed to fetch reviews");
                throw error;
            }
        },
        [],
    );

    // Fetch reviews for specific business on mount
    useEffect(() => {
        if (businessId) {
            setIsLoading(true);
            getBusinessReviews(businessId)
                .then((fetchedReviews) => {
                    setReviews(fetchedReviews);
                    setError(null);
                })
                .catch((err) => {
                    console.error("Error loading reviews:", err);
                    setError(err.message || "Failed to load reviews");
                    setReviews([]);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [businessId, getBusinessReviews]);

    return {
        reviews,
        isLoading,
        submitReview,
        getBusinessReviews,
        isSubmitting,
        error,
    };
};
