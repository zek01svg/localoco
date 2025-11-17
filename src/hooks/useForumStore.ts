import { create } from "zustand";
import { ForumState } from "../types/forum";

export const useForumStore = create<ForumState>((set) => ({
    discussions: [],
    isLoading: false,
    error: null,

    setDiscussions: (discussions) => set({ discussions }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),

    addDiscussion: (discussion) =>
        set((state) => ({ discussions: [discussion, ...state.discussions] })),

    likeDiscussion: (id) =>
        set((state) => ({
            discussions: state.discussions.map((d) =>
                d.id === id ? { ...d, likes: d.likes + 1 } : d,
            ),
        })),

    likeReply: (discussionId, replyId) =>
        set((state) => ({
            discussions: state.discussions.map((d) =>
                d.id === discussionId
                    ? {
                          ...d,
                          replies: d.replies.map((r) =>
                              r.id === replyId
                                  ? { ...r, likes: r.likes + 1 }
                                  : r,
                          ),
                      }
                    : d,
            ),
        })),

    addReply: (discussionId, reply) =>
        set((state) => ({
            discussions: state.discussions.map((d) =>
                d.id === discussionId
                    ? { ...d, replies: [...d.replies, reply] }
                    : d,
            ),
        })),
}));
