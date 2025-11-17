// hooks/useBookmarks.ts
import { useMemo, useCallback, useEffect } from "react";
import { useBusinessStore } from "../store/businessStore";
import { useAuthStore } from "../store/authStore";
import { toast } from "sonner";

export const useBookmarks = () => {
    const store = useBusinessStore();
    const userId = useAuthStore((state) => state.userId);

    // Fetch bookmarks from backend on mount
    useEffect(() => {
        const fetchBookmarks = async () => {
            if (!userId) {
                console.log("No userId available, skipping bookmark fetch");
                return;
            }

            try {
                console.log("Fetching bookmarks for user:", userId);
                const response = await fetch(`/api/user/bookmarks`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId }),
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch bookmarks");
                }

                const data = await response.json();
                console.log("Bookmarks fetched from backend:", data);

                // Transform backend response to match store format
                // Backend returns: [{ userId: string, businessUen: string }, ...]
                // Store expects: [{ businessId: string, dateBookmarked: string }, ...]
                const bookmarks = data.map((bookmark: any) => ({
                    businessId: bookmark.businessUen,
                    dateBookmarked: new Date().toISOString(), // Backend doesn't return date, use current
                }));

                store.setBookmarks(bookmarks);
                console.log("Bookmarks loaded into store:", bookmarks.length);
            } catch (error) {
                console.error("Error fetching bookmarks:", error);
            }
        };

        fetchBookmarks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]); // Only run when userId changes, not when store changes

    // Get bookmarked businesses
    const bookmarkedBusinesses = useMemo(() => {
        const bookmarkedIds = store.bookmarkedBusinesses.map(
            (b) => b.businessId,
        );
        return store.businesses.filter((business) =>
            bookmarkedIds.includes(business.uen),
        );
    }, [store.businesses, store.bookmarkedBusinesses]);

    // Toggle bookmark with feedback and API call
    const toggleBookmark = useCallback(
        async (businessId: string) => {
            const wasBookmarked = store.isBookmarked(businessId);

            // Optimistically update UI
            store.toggleBookmark(businessId);

            // Show user feedback
            toast.success(
                wasBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
            );

            // Call backend API
            try {
                if (!userId) {
                    console.error("No userId found for bookmark update");
                    return;
                }

                const payload = {
                    userId: userId,
                    businessUen: businessId,
                    clicked: !wasBookmarked, // true if adding, false if removing
                };

                console.log(
                    "Sending bookmark request to:",
                    `/api/update-bookmark`,
                );
                console.log("Payload:", payload);

                const response = await fetch(`/api/update-bookmark`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error("Failed to update bookmark");
                }
            } catch (error) {
                console.error("Error updating bookmark:", error);
                // Rollback optimistic update on error
                store.toggleBookmark(businessId);
                toast.error("Failed to update bookmark");
            }
        },
        [store, userId],
    );

    return {
        bookmarkedBusinesses,
        bookmarkCount: store.bookmarkedBusinesses.length,
        toggleBookmark,
        isBookmarked: store.isBookmarked,
    };
};
