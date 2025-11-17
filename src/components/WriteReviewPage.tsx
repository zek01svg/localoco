import React, { useState } from "react";
import { Star, ArrowLeft, Send, Lock } from "lucide-react"; // ✅ Added Lock here
import { Business } from "../types/business";
import { Button } from "./ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { toast } from "sonner";
import { useThemeStore } from "../store/themeStore";
import { useNavigate, useParams } from "react-router-dom";
import { useBusinesses } from "../hooks/useBusinesses";
import { useUser } from "../hooks/useUser";
import { useAuthStore } from "../store/authStore";
import { useReviews } from "../hooks/useReviews";
import type { User, BusinessOwner } from "../types/auth.store.types";

interface WriteReviewPageProps {
    business?: Business;
    onBack?: () => void;
    onSubmit?: (rating: number, comment: string) => void;
    userAvatar?: string;
    userName?: string;
}

export function WriteReviewPage({
    business: propBusiness,
    onBack,
    onSubmit,
    userAvatar: propUserAvatar,
    userName: propUserName,
}: WriteReviewPageProps = {}) {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    const navigate = useNavigate();
    const { id: businessId } = useParams(); // Route param is 'id', rename to businessId
    const { businesses } = useBusinesses();
    const userId = useAuthStore((state) => state.userId);
    const role = useAuthStore((state) => state.role);
    const { user } = useUser(userId);
    const { submitReview, isSubmitting } = useReviews(); // Don't pass businessId here for submission

    // ✅ Helper: Get user display name safely
    const getUserDisplayName = (
        userData: User | BusinessOwner | null | undefined,
    ): string => {
        if (!userData) return "Anonymous";
        if ("businessName" in userData) {
            return userData.businessName;
        }
        return (userData as User)?.name || "Anonymous";
    };

    // ✅ Helper: Get user avatar safely (use avatarUrl for your User type)
    const getUserAvatar = (
        userData: User | BusinessOwner | null | undefined,
    ): string | undefined => {
        if (!userData) return undefined;
        if ("businessName" in userData) {
            return undefined;
        }
        return (userData as User)?.avatarUrl;
    };

    // ✅ Use prop if provided, otherwise use helpers
    const business =
        propBusiness || businesses.find((b) => b.uen === businessId);
    const userName = propUserName || getUserDisplayName(user); // ✅ Use helper
    const userAvatar = propUserAvatar || getUserAvatar(user); // ✅ Use helper

    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState("");
    const [isBackButtonHovered, setIsBackButtonHovered] = useState(false);
    const [isCancelButtonHovered, setIsCancelButtonHovered] = useState(false);

    const cardBg = isDarkMode ? "#2a2a2a" : "#ffffff";
    const textColor = isDarkMode ? "#ffffff" : "#000000";
    const userBoxBg = isDarkMode ? "#3a3a3a" : "#f9fafb";
    const userBoxBorder = isDarkMode ? "#505050" : "#d1d5db";
    const labelColor = isDarkMode ? "#ffffff" : "#111827";
    const mutedColor = isDarkMode ? "#a3a3a3" : "#6b7280";

    if (!business) {
        return (
            <div className="max-w-3xl mx-auto p-4">
                <div style={{ color: textColor }}>
                    Error: Business not found
                </div>
            </div>
        );
    }

    // ✅ Check if user is a business owner - restrict access
    if (role === "business" || (user && "businessName" in user)) {
        return (
            <div
                className="min-h-screen flex items-center justify-center p-4 md:pl-6"
                style={{ backgroundColor: isDarkMode ? "#3a3a3a" : "#f9fafb" }}
            >
                <Card
                    className="max-w-md w-full"
                    style={{
                        backgroundColor: cardBg,
                        borderColor: userBoxBorder,
                    }}
                >
                    <CardContent className="p-12 text-center">
                        <Lock className="w-16 h-16 mx-auto mb-4 text-[#FFA1A3]" />
                        <h2
                            className="text-2xl font-semibold mb-2"
                            style={{ color: textColor }}
                        >
                            Access Restricted
                        </h2>
                        <p className="mb-6" style={{ color: mutedColor }}>
                            Only regular users can write reviews. Business
                            accounts can view reviews but cannot submit them.
                        </p>
                        <Button
                            onClick={() => navigate(-1)}
                            className="bg-[#FFA1A3] hover:bg-[#FF8A8C] text-white"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error("Please select a rating");
            return;
        }
        if (comment.trim().length < 10) {
            toast.error("Please write a review with at least 10 characters");
            return;
        }

        // Check if we have user email
        if (!user || !("email" in user)) {
            toast.error("Please log in to submit a review");
            return;
        }

        // If onSubmit callback is provided, use it (for testing/props)
        if (onSubmit) {
            onSubmit(rating, comment);
            handleBack();
            return;
        }

        // Submit to backend
        try {
            const result = await submitReview({
                userEmail: user.email,
                businessUEN: business.uen, // Changed to match backend parameter name
                title: "Customer Review", // Optional title
                body: comment,
                rating: rating,
            });

            console.log("Review submission response:", result);
            if (result?.pointsEarned) {
                toast.success(
                    `Review submitted successfully! 🎉 +${result.pointsEarned} points earned!`,
                );
            } else {
                toast.success("Review submitted successfully!");
            }
            handleBack();
        } catch (error) {
            toast.error("Failed to submit review. Please try again.");
        }
    };

    const renderStars = () => {
        return Array.from({ length: 5 }, (_, i) => {
            const starValue = i + 1;
            const isActive = starValue <= (hoveredRating || rating);

            return (
                <button
                    key={i}
                    type="button"
                    className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#FFA1A3] rounded"
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoveredRating(starValue)}
                    onMouseLeave={() => setHoveredRating(0)}
                >
                    <Star
                        className={`w-10 h-10 ${
                            isActive
                                ? "fill-yellow-400 text-yellow-400"
                                : isDarkMode
                                  ? "text-gray-500"
                                  : "text-gray-400"
                        }`}
                    />
                </button>
            );
        });
    };

    const getRatingText = (value: number) => {
        const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
        return labels[value];
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 p-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    onMouseEnter={() => setIsBackButtonHovered(true)}
                    onMouseLeave={() => setIsBackButtonHovered(false)}
                    style={{
                        backgroundColor: isDarkMode
                            ? isBackButtonHovered
                                ? "rgba(255, 255, 255, 0.1)"
                                : "transparent"
                            : isBackButtonHovered
                              ? "#f3f4f6"
                              : "#ffffff",
                        borderColor: isDarkMode
                            ? isBackButtonHovered
                                ? "rgba(255, 255, 255, 0.6)"
                                : "rgba(255, 255, 255, 0.4)"
                            : isBackButtonHovered
                              ? "#9ca3af"
                              : "#d1d5db",
                        color: isDarkMode ? "#ffffff" : "#111827",
                    }}
                    className="flex items-center gap-2 transition-all"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Button>
            </div>

            {/* Business Info Card */}
            <Card
                className="overflow-hidden border"
                style={{ backgroundColor: cardBg, borderColor: userBoxBorder }}
            >
                <div className="flex gap-6 items-center p-6">
                    <ImageWithFallback
                        src={`https://localoco.blob.core.windows.net/images/${business.image}`}
                        alt={business.name}
                        className="w-48 h-48 object-cover rounded-xl"
                    />
                    <div className="flex-1 min-w-0">
                        <h2
                            className="text-3xl mb-2"
                            style={{ color: textColor, fontWeight: 600 }}
                        >
                            {business.name}
                        </h2>
                        <p
                            className="text-md mb-1"
                            style={{ color: mutedColor }}
                        >
                            {business.category}
                        </p>
                        <p className="text-lg" style={{ color: mutedColor }}>
                            {business.address}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Review Form */}
            <Card
                className="border"
                style={{ backgroundColor: cardBg, borderColor: userBoxBorder }}
            >
                <CardHeader>
                    <CardTitle style={{ color: textColor, fontWeight: 600 }}>
                        Write Your Review
                    </CardTitle>
                    <CardDescription style={{ color: mutedColor }}>
                        Share your experience with others
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* User Info */}
                    <div
                        className="flex items-center gap-3 p-4 rounded-lg border"
                        style={{
                            backgroundColor: userBoxBg,
                            borderColor: userBoxBorder,
                        }}
                    >
                        <Avatar className="w-12 h-12">
                            <AvatarImage src={userAvatar} alt={userName} />
                            <AvatarFallback className="bg-[#FFA1A3] text-white">
                                {userName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p
                                className="text-sm"
                                style={{ color: mutedColor }}
                            >
                                Posting as
                            </p>
                            <p style={{ color: textColor, fontWeight: 500 }}>
                                {userName}
                            </p>
                        </div>
                    </div>

                    {/* Rating Selection */}
                    <div className="space-y-3">
                        <Label
                            htmlFor="rating"
                            style={{ color: labelColor, fontWeight: 500 }}
                        >
                            Your Rating *
                        </Label>
                        <div className="flex items-center gap-2">
                            {renderStars()}
                        </div>
                        {rating > 0 && (
                            <p
                                className="text-[#FFA1A3] transition-all"
                                style={{ fontWeight: 500 }}
                            >
                                {getRatingText(rating)}
                            </p>
                        )}
                    </div>

                    {/* Review Comment */}
                    <div className="space-y-3">
                        <Label
                            htmlFor="comment"
                            style={{ color: labelColor, fontWeight: 500 }}
                        >
                            Your Review *
                        </Label>
                        <Textarea
                            id="comment"
                            placeholder="Tell us about your experience... (minimum 10 characters)"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className={`min-h-[150px] focus:border-[#FFA1A3] focus:ring-[#FFA1A3] ${
                                isDarkMode
                                    ? "bg-[#3a3a3a] border-white/30 text-white placeholder:text-gray-500"
                                    : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                            }`}
                        />
                        <p className="text-sm" style={{ color: mutedColor }}>
                            {comment.length} characters
                        </p>
                    </div>

                    {/* Guidelines */}
                    <div
                        className="p-4 rounded-lg border"
                        style={{
                            backgroundColor: userBoxBg,
                            borderColor: userBoxBorder,
                        }}
                    >
                        <h4
                            className="text-sm mb-2"
                            style={{ color: labelColor, fontWeight: 500 }}
                        >
                            Review Guidelines
                        </h4>
                        <ul
                            className="text-xs space-y-1"
                            style={{ color: mutedColor }}
                        >
                            <li>• Be honest and constructive</li>
                            <li>• Focus on your personal experience</li>
                            <li>• Avoid inappropriate language</li>
                            <li>• Respect privacy of others</li>
                        </ul>
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3">
                        <Button
                            onClick={handleSubmit}
                            className="flex-1 bg-[#FFA1A3] hover:bg-[#FF8A8C] text-white"
                            disabled={
                                rating === 0 ||
                                comment.trim().length < 10 ||
                                isSubmitting
                            }
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {isSubmitting ? "Submitting..." : "Submit Review"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            onMouseEnter={() => setIsCancelButtonHovered(true)}
                            onMouseLeave={() => setIsCancelButtonHovered(false)}
                            style={{
                                backgroundColor: isDarkMode
                                    ? isCancelButtonHovered
                                        ? "rgba(255, 255, 255, 0.1)"
                                        : "transparent"
                                    : isCancelButtonHovered
                                      ? "#f3f4f6"
                                      : "#ffffff",
                                borderColor: isDarkMode
                                    ? isCancelButtonHovered
                                        ? "rgba(255, 255, 255, 0.6)"
                                        : "rgba(255, 255, 255, 0.4)"
                                    : isCancelButtonHovered
                                      ? "#9ca3af"
                                      : "#d1d5db",
                                color: isDarkMode ? "#ffffff" : "#111827",
                            }}
                            className="transition-all"
                        >
                            Cancel
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
