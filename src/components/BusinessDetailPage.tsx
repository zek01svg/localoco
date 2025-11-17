// components/BusinessDetailPage.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBusinesses } from "../hooks/useBusinesses";
import { useBookmarks } from "../hooks/useBookmarks";
import { useTheme } from "../hooks/useTheme";
import { useReviews } from "../hooks/useReviews";
import { BusinessDetail } from "./BusinessDetail";
import { ForumDiscussion } from "../types/forum";
import { url } from "../constants/url";

export const BusinessDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const { businesses } = useBusinesses();
    const { isBookmarked, toggleBookmark } = useBookmarks();

    const business = businesses.find((b) => b.id === id);

    // Fetch reviews for this business
    const { reviews, isLoading: reviewsLoading } = useReviews(business?.uen);

    // Fetch threads for this business
    const [threads, setThreads] = useState<ForumDiscussion[]>([]);
    const [threadsLoading, setThreadsLoading] = useState(false);

    useEffect(() => {
        const fetchThreads = async () => {
            if (!business?.uen) return;

            setThreadsLoading(true);
            try {
                const response = await fetch(
                    `${url}/api/forum-posts/business?uen=${business.uen}`,
                );
                if (!response.ok) throw new Error("Failed to fetch threads");

                const data = await response.json();
                const transformedThreads: ForumDiscussion[] = data.map(
                    (post: any) => ({
                        id: post.id.toString(),
                        title: post.title || "Discussion",
                        businessTag: business.name,
                        content: post.body,
                        userName: post.userEmail.split("@")[0],
                        createdAt: post.createdAt,
                        likes: post.likeCount || 0,
                        replies: post.replies.map((reply: any) => ({
                            id: reply.id.toString(),
                            discussionId: post.id.toString(),
                            userName: reply.userEmail.split("@")[0],
                            content: reply.body,
                            createdAt: reply.createdAt,
                            likes: reply.likeCount || 0,
                        })),
                    }),
                );

                setThreads(transformedThreads);
            } catch (error) {
                console.error("Error fetching threads:", error);
            } finally {
                setThreadsLoading(false);
            }
        };

        fetchThreads();
    }, [business?.uen, business?.name]);

    if (!business) {
        return (
            <div
                className="min-h-screen p-4 md:pl-6"
                style={{ backgroundColor: isDarkMode ? "#3a3a3a" : "#f9fafb" }}
            >
                <div className="max-w-7xl mx-auto text-center py-12">
                    <h2
                        className="text-2xl mb-4"
                        style={{ color: isDarkMode ? "#ffffff" : "#000000" }}
                    >
                        Business not found
                    </h2>
                    <button
                        onClick={() => navigate("/businesses")}
                        className="text-primary hover:underline"
                    >
                        ← Back to businesses
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen p-4 md:pl-6"
            style={{ backgroundColor: isDarkMode ? "#3a3a3a" : "#f9fafb" }}
        >
            <BusinessDetail
                business={business}
                reviews={reviews}
                threads={threads}
                isBookmarked={isBookmarked(business.id)}
                onBookmarkToggle={toggleBookmark}
                onBack={() => navigate("/businesses")}
                onWriteReview={(business) => {
                    navigate(`/review/${business.uen}`);
                }}
            />
        </div>
    );
};
