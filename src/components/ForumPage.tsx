import React, { useState } from "react";
import { Store, MessageCircle, ThumbsUp, Send } from "lucide-react";
import { ForumDiscussion, ForumReply } from "../types/forum";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useThemeStore } from "../store/themeStore";
import { useForumPosts } from "../hooks/useForumPosts";
import { useAuthStore } from "../store/authStore";
import { useUser } from "../hooks/useUser";
import { BusinessSearchDropdown } from "./BusinessSearchDropdown";
import { User } from "../types/user";
import { BusinessOwner } from "../types/auth.store.types";

interface ForumPageProps {
    onBack?: () => void;
}

export function ForumPage({ onBack }: ForumPageProps) {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    const userId = useAuthStore((state) => state.userId);
    const { user } = useUser(userId);
    const {
        discussions,
        isLoading,
        error,
        createDiscussion,
        createReply,
        likeDiscussion,
        likeReply,
    } = useForumPosts(user?.email);

    const bgColor = isDarkMode ? "#3a3a3a" : "#f9fafb";
    const cardBgColor = isDarkMode ? "#2a2a2a" : "#ffffff";
    const textColor = isDarkMode ? "text-white" : "text-black";
    const mutedTextColor = isDarkMode ? "text-gray-400" : "text-gray-600";
    const borderColor = isDarkMode ? "border-gray-700" : "border-gray-200";
    const [newDiscussion, setNewDiscussion] = useState({
        title: "",
        businessTag: "",
        businessUen: "",
        content: "",
    });
    const [replyInputs, setReplyInputs] = useState<{ [key: string]: string }>(
        {},
    );

    const handleCreateDiscussion = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newDiscussion.title || !newDiscussion.content) {
            alert("Please fill in all required fields");
            return;
        }

        const discussion: ForumDiscussion = {
            id: Date.now().toString(),
            title: newDiscussion.title,
            businessTag: newDiscussion.businessTag || undefined,
            businessUen: newDiscussion.businessUen || undefined,
            content: newDiscussion.content,
            userName: user?.name || user?.businessName || "Anonymous",
            createdAt: new Date().toISOString(),
            likes: 0,
            replies: [],
        };

        try {
            await createDiscussion(discussion);
            setNewDiscussion({
                title: "",
                businessTag: "",
                businessUen: "",
                content: "",
            });
        } catch (error) {
            console.error("Failed to create discussion:", error);
        }
    };

    const handleLike = (discussionId: string) => {
        likeDiscussion(discussionId);
    };

    const handleReplyLike = (discussionId: string, replyId: string) => {
        likeReply(discussionId, replyId);
    };

    const handleReply = async (discussionId: string) => {
        const replyContent = replyInputs[discussionId];
        if (!replyContent?.trim()) return;

        const reply: ForumReply = {
            id: `${discussionId}-${Date.now()}`,
            discussionId,
            userName: user?.businessName || "Anonymous",
            content: replyContent,
            createdAt: new Date().toISOString(),
            likes: 0,
        };

        try {
            await createReply(discussionId, reply);
            setReplyInputs((prev) => ({ ...prev, [discussionId]: "" }));
        } catch (error) {
            console.error("Failed to create reply:", error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div
            className="min-h-screen md:pl-6"
            style={{ backgroundColor: bgColor }}
        >
            {/* Main Content */}
            <div className="max-w-5xl mx-auto p-6 space-y-8">
                {/* Create Discussion */}
                <Card
                    className={`p-8 shadow-lg ${borderColor}`}
                    style={{ backgroundColor: cardBgColor }}
                >
                    <h2 className={`mb-6 ${textColor}`}>
                        Start a New Discussion
                    </h2>
                    <form
                        onSubmit={handleCreateDiscussion}
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <Input
                                placeholder="Title"
                                value={newDiscussion.title}
                                onChange={(e) =>
                                    setNewDiscussion((prev) => ({
                                        ...prev,
                                        title: e.target.value,
                                    }))
                                }
                                required
                                className={`${textColor} ${isDarkMode ? "bg-[#2a2a2a] border-gray-700" : "bg-input-background"}`}
                            />
                        </div>
                        <div className="space-y-2">
                            <BusinessSearchDropdown
                                value={newDiscussion.businessTag}
                                onChange={(value, uen) =>
                                    setNewDiscussion((prev) => ({
                                        ...prev,
                                        businessTag: value,
                                        businessUen: uen || "",
                                    }))
                                }
                                placeholder="Tag/Business Name (optional)"
                            />
                        </div>
                        <div className="space-y-2">
                            <Textarea
                                placeholder="Share your thoughts, reviews, or ask a question..."
                                value={newDiscussion.content}
                                onChange={(e) =>
                                    setNewDiscussion((prev) => ({
                                        ...prev,
                                        content: e.target.value,
                                    }))
                                }
                                required
                                rows={6}
                                className={`resize-none ${textColor} ${isDarkMode ? "bg-[#2a2a2a] border-gray-700" : "bg-input-background"}`}
                            />
                        </div>
                        <Button
                            type="submit"
                            className="bg-primary hover:bg-primary/90 text-white"
                        >
                            Post Discussion
                        </Button>
                    </form>
                </Card>

                {/* Community Discussions */}
                <Card
                    className={`p-8 shadow-lg ${borderColor}`}
                    style={{ backgroundColor: cardBgColor }}
                >
                    <h2 className={`mb-6 ${textColor}`}>
                        Community Discussions
                    </h2>

                    {/* Loading State */}
                    {isLoading && (
                        <div className={`text-center py-8 ${mutedTextColor}`}>
                            Loading discussions...
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="text-center py-8 text-red-500">
                            Error: {error}
                        </div>
                    )}

                    {/* Discussions List */}
                    {!isLoading && !error && (
                        <div className="space-y-6">
                            {discussions.map((discussion) => (
                                <div
                                    key={discussion.id}
                                    className={`space-y-4 pb-6 border-b last:border-b-0 ${borderColor}`}
                                >
                                    {/* Discussion Header */}
                                    <div className="flex gap-4">
                                        <Avatar className="w-12 h-12 bg-primary/20 flex-shrink-0">
                                            {discussion.userAvatar && (
                                                <AvatarImage
                                                    src={discussion.userAvatar}
                                                    alt={discussion.userName}
                                                />
                                            )}
                                            <AvatarFallback className="bg-primary/20 text-primary">
                                                {discussion.userName
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 space-y-2">
                                            <div>
                                                <p className={textColor}>
                                                    {discussion.userName}
                                                </p>
                                                <h3 className={textColor}>
                                                    {discussion.title}
                                                </h3>
                                                {discussion.businessTag && (
                                                    <p className="text-sm text-primary">
                                                        {discussion.businessTag}
                                                    </p>
                                                )}
                                            </div>
                                            <p className={mutedTextColor}>
                                                {discussion.content}
                                            </p>

                                            <div
                                                className={`flex items-center gap-4 text-sm ${mutedTextColor}`}
                                            >
                                                <button
                                                    onClick={() =>
                                                        handleLike(
                                                            discussion.id,
                                                        )
                                                    }
                                                    className="flex items-center gap-1 hover:text-primary transition-colors"
                                                >
                                                    <ThumbsUp className="w-4 h-4" />
                                                    {discussion.likes} Likes
                                                </button>
                                                <span className="flex items-center gap-1">
                                                    <MessageCircle className="w-4 h-4" />
                                                    {discussion.replies.length}{" "}
                                                    Replies
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Replies */}
                                    {discussion.replies.length > 0 && (
                                        <div className="ml-16 space-y-4">
                                            {discussion.replies.map((reply) => (
                                                <div
                                                    key={reply.id}
                                                    className="flex gap-3"
                                                >
                                                    <Avatar className="w-10 h-10 bg-primary/20 flex-shrink-0">
                                                        {reply.userAvatar && (
                                                            <AvatarImage
                                                                src={
                                                                    reply.userAvatar
                                                                }
                                                                alt={
                                                                    reply.userName
                                                                }
                                                            />
                                                        )}
                                                        <AvatarFallback className="bg-primary/20 text-primary text-sm">
                                                            {reply.userName
                                                                .charAt(0)
                                                                .toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <p
                                                            className={`text-sm ${textColor}`}
                                                        >
                                                            {reply.userName}
                                                        </p>
                                                        <p
                                                            className={`${mutedTextColor} text-sm`}
                                                        >
                                                            {reply.content}
                                                        </p>
                                                        <button
                                                            onClick={() =>
                                                                handleReplyLike(
                                                                    discussion.id,
                                                                    reply.id,
                                                                )
                                                            }
                                                            className={`flex items-center gap-1 text-xs ${mutedTextColor} hover:text-primary transition-colors mt-1`}
                                                        >
                                                            <ThumbsUp className="w-3 h-3" />
                                                            {reply.likes} Likes
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Reply Input */}
                                    <div className="ml-16">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Write a reply..."
                                                value={
                                                    replyInputs[
                                                        discussion.id
                                                    ] || ""
                                                }
                                                onChange={(e) =>
                                                    setReplyInputs((prev) => ({
                                                        ...prev,
                                                        [discussion.id]:
                                                            e.target.value,
                                                    }))
                                                }
                                                className={`${textColor} ${isDarkMode ? "bg-[#2a2a2a] border-gray-700" : "bg-input-background"}`}
                                            />
                                            <Button
                                                onClick={() =>
                                                    handleReply(discussion.id)
                                                }
                                                disabled={
                                                    !replyInputs[
                                                        discussion.id
                                                    ]?.trim()
                                                }
                                                className="bg-primary hover:bg-primary/90 text-white"
                                            >
                                                Reply
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
