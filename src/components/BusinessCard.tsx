import {
    Star,
    MapPin,
    Phone,
    Clock,
    Bookmark,
    TrendingUp,
    Share2,
} from "lucide-react";
import { Business } from "../types/business";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
    checkBusinessOpenStatus,
    getCategoryDisplayName,
} from "../utils/businessUtils";
import { useThemeStore } from "../store/themeStore";
import { useState } from "react";

interface BusinessCardProps {
    business: Business;
    isBookmarked: boolean;
    onBookmarkToggle: (businessId: string) => void;
    onViewDetails: (business: Business) => void;
}

export function BusinessCard({
    business,
    isBookmarked,
    onBookmarkToggle,
    onViewDetails,
}: BusinessCardProps) {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [shareMessage, setShareMessage] = useState("");

    const cardBgColor = isDarkMode ? "#2a2a2a" : "#ffffff";

    // Convert price range to symbols
    const getPriceRangeSymbol = (priceRange: string): string => {
        const priceMap: { [key: string]: string } = {
            low: "$",
            medium: "$$",
            high: "$$$",
        };
        return priceMap[priceRange] || priceRange;
    };
    const textColor = isDarkMode ? "text-white" : "text-black";
    const mutedTextColor = isDarkMode
        ? "text-gray-400"
        : "text-muted-foreground";
    const borderColor = isDarkMode ? "border-gray-700" : "border-gray-200";

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 ${
                    i < Math.floor(rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : i < rating
                          ? "fill-yellow-400/50 text-yellow-400"
                          : "text-gray-300"
                }`}
            />
        ));
    };

    const openStatus = checkBusinessOpenStatus(business);

    // ✅ Share functionality
    const handleShare = async (platform: "copy" | "whatsapp" | "email") => {
        const shareText = `Check out ${business.name} - ${business.description}`;
        const businessUrl =
            window.location.origin + `/business/${business.uen}`;

        try {
            if (platform === "copy") {
                await navigator.clipboard.writeText(
                    `${shareText}\n${businessUrl}`,
                );
                setShareMessage("Copied to clipboard! ✓");
                setTimeout(() => setShareMessage(""), 2000);
            } else if (platform === "whatsapp") {
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + " " + businessUrl)}`;
                window.open(whatsappUrl, "_blank");
            } else if (platform === "email") {
                const emailUrl = `mailto:?subject=Check out ${business.name}&body=${encodeURIComponent(shareText + "\n" + businessUrl)}`;
                window.location.href = emailUrl;
            }
            setShowShareMenu(false);
        } catch (error) {
            console.error("Share failed:", error);
        }
    };
    const fallbackImage = "";
    return (
        <Card
            className={`overflow-hidden hover:shadow-lg transition-shadow duration-200 ${borderColor}`}
            style={{ backgroundColor: cardBgColor }}
        >
            <CardHeader className="p-0">
                <div className="relative">
                    <ImageWithFallback
                        src={
                            business.image
                                ? business.image.startsWith("http")
                                    ? business.image
                                    : `https://localoco.blob.core.windows.net/images/${business.image}`
                                : fallbackImage // Use the empty string as the fallback
                        }
                        alt={business.name}
                        className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                        {/* ✅ Share button */}
                        <div className="relative">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="p-2"
                                onClick={() => setShowShareMenu(!showShareMenu)}
                            >
                                <Share2 className="w-4 h-4" />
                            </Button>

                            {/* Share menu */}
                            {showShareMenu && (
                                <div
                                    className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-10 ${borderColor}`}
                                    style={{ backgroundColor: cardBgColor }}
                                >
                                    <button
                                        onClick={() => handleShare("copy")}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${textColor}`}
                                    >
                                        Copy Link
                                    </button>
                                    <button
                                        onClick={() => handleShare("whatsapp")}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${textColor}`}
                                    >
                                        Share on WhatsApp
                                    </button>
                                    <button
                                        onClick={() => handleShare("email")}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 ${textColor}`}
                                    >
                                        Share via Email
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Bookmark button */}
                        <Button
                            variant={isBookmarked ? "default" : "secondary"}
                            size="sm"
                            className="p-2"
                            onClick={() => onBookmarkToggle(business.uen)}
                        >
                            <Bookmark
                                className={`w-4 h-4 ${isBookmarked ? "fill-white" : "fill-none"}`}
                            />
                        </Button>
                    </div>

                    <div className="absolute bottom-2 left-2 space-y-1">
                        <Badge
                            variant="secondary"
                            className="bg-white/90 text-black"
                        >
                            {getCategoryDisplayName(business.category)}
                        </Badge>
                        {business.isPopular && (
                            <Badge
                                variant="default"
                                className="bg-red-500 text-white flex items-center gap-1"
                            >
                                <TrendingUp className="w-3 h-3" />
                                Popular
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4">
                <div className="space-y-2">
                    <div className="flex items-start justify-between">
                        <h3
                            className={`text-lg font-semibold line-clamp-1 ${textColor}`}
                        >
                            {business.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm">
                            {business.avgRating !== undefined && (
                                <>
                                    <div className="flex">
                                        {renderStars(business.avgRating)}
                                    </div>
                                    <span className={mutedTextColor}>
                                        ({business.reviewCount})
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <p className={`text-sm ${mutedTextColor} line-clamp-2`}>
                        {business.description}
                    </p>

                    <div
                        className={`flex items-center gap-1 text-sm ${mutedTextColor}`}
                    >
                        <MapPin className="w-4 h-4" />
                        <span className="line-clamp-1">{business.address}</span>
                    </div>

                    <div
                        className={`flex items-center gap-1 text-sm ${mutedTextColor}`}
                    >
                        <Phone className="w-4 h-4" />
                        <span>{business.phone}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-4 h-4" />
                            <span
                                className={`${
                                    openStatus.isOpen
                                        ? openStatus.closingSoon
                                            ? "text-orange-600"
                                            : "text-green-600"
                                        : "text-red-600"
                                }`}
                            >
                                {openStatus.isOpen ? "Open" : "Closed"}
                            </span>
                            <span className={`${mutedTextColor} text-xs`}>
                                • {openStatus.nextChange}
                            </span>
                        </div>
                        <span className={`text-sm font-medium ${textColor}`}>
                            {getPriceRangeSymbol(business.priceRange)}
                        </span>
                    </div>

                    {/* ✅ Share success message */}
                    {shareMessage && (
                        <p className="text-sm text-green-600 text-center">
                            {shareMessage}
                        </p>
                    )}
                </div>
            </CardContent>

            <CardFooter className="p-4 pt-0">
                <Button
                    onClick={() => onViewDetails(business)}
                    className="w-full"
                >
                    View Details
                </Button>
            </CardFooter>
        </Card>
    );
}
