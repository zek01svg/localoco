import { useEffect, useCallback } from "react";
import { useForumStore } from "./useForumStore";
import { transformBackendToForumDiscussion } from "../utils/forumUtils";
import { ForumDiscussion, ForumReply, BackendForumPost } from "../types/forum";
import { fetchBusinessUenByName } from "../utils/businessNameUtils";
import { toast } from "sonner";

export const useForumPosts = (userEmail?: string) => {
    const discussions = useForumStore((state) => state.discussions);
    const isLoading = useForumStore((state) => state.isLoading);
    const error = useForumStore((state) => state.error);

    const setDiscussions = useForumStore((state) => state.setDiscussions);
    const setLoading = useForumStore((state) => state.setLoading);
    const setError = useForumStore((state) => state.setError);
    const addDiscussion = useForumStore((state) => state.addDiscussion);
    const addReply = useForumStore((state) => state.addReply);
    const likeDiscussionInStore = useForumStore(
        (state) => state.likeDiscussion,
    );
    const likeReplyInStore = useForumStore((state) => state.likeReply);

    // Fetch all forum posts
    const fetchForumPosts = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/forum-posts`);
            if (!response.ok) throw new Error("Failed to fetch forum posts");

            const rawData: BackendForumPost[] = await response.json();
            const transformedDiscussions = rawData.map(
                transformBackendToForumDiscussion,
            );

            setDiscussions(transformedDiscussions);
            setError(null);
        } catch (error: any) {
            setError(error.message || "Unknown error occurred");
        } finally {
            setLoading(false);
        }
    }, [setDiscussions, setLoading, setError]);

    // Silent refresh (no loading state)
    const silentRefresh = useCallback(async () => {
        try {
            const response = await fetch(`/api/forum-posts`);
            if (!response.ok) throw new Error("Failed to fetch forum posts");

            const rawData: BackendForumPost[] = await response.json();
            const transformedDiscussions = rawData.map(
                transformBackendToForumDiscussion,
            );

            setDiscussions(transformedDiscussions);
        } catch (error: any) {
            // Silent fail - don't show error to user
            console.error("Background refresh failed:", error);
        }
    }, [setDiscussions]);

    // Create new discussion
    const createDiscussion = useCallback(
        async (discussion: ForumDiscussion) => {
            // Check if user email is available
            if (!userEmail) {
                console.error(
                    "Cannot create discussion: User email not available",
                );
                throw new Error(
                    "User email not available. Please refresh and try again.",
                );
            }

            // Optimistically add to UI immediately
            addDiscussion(discussion);

            try {
                // Use the businessUen directly from the discussion object
                const businessUen: string | null =
                    discussion.businessUen || null;

                if (businessUen) {
                    console.log("Posting with business UEN:", businessUen);
                }

                const postData = {
                    userEmail: userEmail, // Use actual logged-in user email
                    businessUen: businessUen, // Link to business if provided, otherwise null
                    title: discussion.title,
                    body: discussion.content,
                };

                console.log("Creating discussion with data:", postData);

                const response = await fetch(`/api/submit-post`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(postData),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("Server error response:", errorText);
                    throw new Error("Failed to create discussion");
                }

                const result = await response.json();
                console.log("Forum post response:", result);
                if (result.pointsEarned) {
                    toast.success(
                        `Discussion posted! 🎉 +${result.pointsEarned} points earned!`,
                    );
                } else {
                    toast.success("Discussion posted!");
                }

                // Silently refresh in background to get proper IDs from server
                silentRefresh();
            } catch (error: any) {
                console.error("Create discussion error:", error);
                setError(error.message || "Failed to create discussion");
                // Rollback: refetch to get accurate state
                await fetchForumPosts();
                throw error;
            }
        },
        [userEmail, addDiscussion, silentRefresh, fetchForumPosts, setError],
    );

    // Create new reply
    const createReply = useCallback(
        async (discussionId: string, reply: ForumReply) => {
            // Check if user email is available
            if (!userEmail) {
                console.error("Cannot create reply: User email not available");
                throw new Error(
                    "User email not available. Please refresh and try again.",
                );
            }

            // Optimistically add reply to UI immediately
            addReply(discussionId, reply);

            try {
                const replyData = {
                    postId: parseInt(discussionId),
                    userEmail: userEmail, // Use actual logged-in user email
                    body: reply.content,
                };

                console.log("Creating reply with data:", replyData);

                const response = await fetch(`/api/submit-post-reply`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(replyData),
                });

                if (!response.ok) throw new Error("Failed to create reply");

                const result = await response.json();
                console.log("Forum reply response:", result);
                if (result.pointsEarned) {
                    toast.success(
                        `Reply posted! 🎉 +${result.pointsEarned} points earned!`,
                    );
                } else {
                    toast.success("Reply posted!");
                }

                // Silently refresh in background to get proper IDs from server
                silentRefresh();
            } catch (error: any) {
                setError(error.message || "Failed to create reply");
                // Rollback: refetch to get accurate state
                await fetchForumPosts();
                throw error;
            }
        },
        [userEmail, addReply, silentRefresh, fetchForumPosts, setError],
    );

    // Like a discussion
    const likeDiscussion = useCallback(
        async (discussionId: string) => {
            // Optimistically update like count in UI immediately
            likeDiscussionInStore(discussionId);

            try {
                const response = await fetch(`/api/forum-posts/likes`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        postId: parseInt(discussionId),
                        clicked: true,
                    }),
                });

                if (!response.ok) throw new Error("Failed to update likes");

                // Silently refresh in background to sync with server
                silentRefresh();
            } catch (error: any) {
                setError(error.message || "Failed to update likes");
                // Rollback: refetch to get accurate state
                await fetchForumPosts();
                throw error;
            }
        },
        [likeDiscussionInStore, silentRefresh, fetchForumPosts, setError],
    );

    // Like a reply
    const likeReply = useCallback(
        async (discussionId: string, replyId: string) => {
            // Optimistically update like count in UI immediately
            likeReplyInStore(discussionId, replyId);

            try {
                const response = await fetch(`/api/forum-replies/likes`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        replyId: parseInt(replyId),
                        clicked: true,
                    }),
                });

                if (!response.ok)
                    throw new Error("Failed to update reply likes");

                // Silently refresh in background to sync with server
                silentRefresh();
            } catch (error: any) {
                setError(error.message || "Failed to update reply likes");
                // Rollback: refetch to get accurate state
                await fetchForumPosts();
                throw error;
            }
        },
        [likeReplyInStore, silentRefresh, fetchForumPosts, setError],
    );

    // Initial fetch on mount
    useEffect(() => {
        if (discussions.length === 0) {
            fetchForumPosts();
        }
    }, [discussions.length, fetchForumPosts]);

    return {
        discussions,
        isLoading,
        error,
        createDiscussion,
        createReply,
        likeDiscussion,
        likeReply,
        refreshDiscussions: fetchForumPosts,
    };
};
