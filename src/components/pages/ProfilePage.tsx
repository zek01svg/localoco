import React, { useState } from "react";
import {
    Mail,
    MapPin,
    Calendar,
    Edit2,
    Ticket,
    Star,
    Award,
    Bookmark,
    Building2,
} from "lucide-react";
import { User, UserStats } from "../../types/user";
import { Business } from "../../types/business";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { BusinessCard } from "../BusinessCard";
import { EditProfileDialog } from "./EditProfileDialog";
import { useThemeStore } from "../../store/themeStore";
import { AddBusinessDialog } from "../AddBusinessDialog";
import { BusinessVerificationData } from "../../types/auth.store.types";
import ReferralPanel from "./ReferralPanel";

interface ProfilePageProps {
    user: User | null; // ✅ MUST be nullable
    stats: UserStats;
    bookmarkedBusinesses: Business[];
    onBack: () => void;
    onUpdateUser: (updatedUser: User) => void;
    onAddBusiness: (data: BusinessVerificationData) => void; // Only one argument!
    onViewBusinessDetails: (business: Business) => void;
    onBookmarkToggle: (businessId: string) => void;
    onNavigateToVouchers?: () => void;
    loading?: boolean; // ✅ Add loading
    error?: string | null; // ✅ Add error
}

export function ProfilePage({
    user,
    stats,
    bookmarkedBusinesses,
    onBack,
    onUpdateUser,
    onAddBusiness, // Destructure the new prop
    onViewBusinessDetails,
    onBookmarkToggle,
    onNavigateToVouchers,
    loading = false,
    error = null,
}: ProfilePageProps) {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const bgColor = isDarkMode ? "#3a3a3a" : "#f9fafb";
    const cardBg = isDarkMode ? "#2a2a2a" : "#ffffff";
    const textColor = isDarkMode ? "#ffffff" : "#000000";

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
            });
        } catch {
            return dateString;
        }
    };

    const handleSaveProfile = (updatedUser: User) => {
        console.log("ProfilePage handleSaveProfile:", updatedUser.name);
        onUpdateUser(updatedUser);
    };

    // Debug: Log stats when component renders
    console.log("📊 ProfilePage stats:", stats);
    console.log("📊 ProfilePage vouchersCount:", stats.vouchersCount);

    // ✅ Show loading state
    if (loading) {
        return (
            <div
                className="min-h-screen md:pl-6 flex items-center justify-center"
                style={{
                    backgroundColor: bgColor,
                    transition: "background-color 0.3s ease",
                }}
            >
                <div style={{ color: textColor }}>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
                    <p>Loading profile...</p>
                </div>
            </div>
        );
    }

    // ✅ Show error state
    if (error) {
        return (
            <div
                className="min-h-screen md:pl-6 flex items-center justify-center"
                style={{
                    backgroundColor: bgColor,
                    transition: "background-color 0.3s ease",
                }}
            >
                <Card
                    className="p-6"
                    style={{
                        backgroundColor: cardBg,
                        color: textColor,
                        transition:
                            "background-color 0.3s ease, color 0.3s ease",
                    }}
                >
                    <p className="mb-4 text-red-500">Error: {error}</p>
                    <Button onClick={onBack}>Go Back</Button>
                </Card>
            </div>
        );
    }

    // ✅ Show no user state
    if (!user) {
        return (
            <div
                className="min-h-screen md:pl-6 flex items-center justify-center"
                style={{
                    backgroundColor: bgColor,
                    transition: "background-color 0.3s ease",
                }}
            >
                <Card
                    className="p-6"
                    style={{
                        backgroundColor: cardBg,
                        color: textColor,
                        transition:
                            "background-color 0.3s ease, color 0.3s ease",
                    }}
                >
                    <p className="mb-4">User not found</p>
                    <Button onClick={onBack}>Go Back</Button>
                </Card>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen md:pl-6"
            style={{ backgroundColor: isDarkMode ? "#3a3a3a" : "#f9fafb" }}
        >
            <div className="max-w-5xl mx-auto px-4 py-8">
                {/* ✅ FIX: Added 'relative' positioning to the main Card */}
                <Card
                    className="p-8 mb-6 relative"
                    style={{
                        backgroundColor: isDarkMode ? "#2a2a2a" : "#ffffff",
                        color: isDarkMode ? "#ffffff" : "#000000",
                    }}
                >
                    {/* ✅ FIX: Placed buttons in an absolutely positioned container */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(true)}
                            className={` ${isDarkMode ? "border-white/40 text-white hover:bg-white/10 hover:border-white/60" : "border-gray-300 text-foreground hover:bg-gray-100"}`}
                        >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit Profile
                        </Button>

                        <AddBusinessDialog
                            onSubmit={onAddBusiness}
                            trigger={
                                <Button
                                    variant="outline"
                                    className={
                                        isDarkMode
                                            ? "bg-gray-700 hover:bg-gray-600"
                                            : ""
                                    }
                                >
                                    <Building2 className="w-4 h-4 mr-2" />
                                    Add Business
                                </Button>
                            }
                        />
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <Avatar className="w-24 h-24">
                            {user.avatarUrl ? (
                                <AvatarImage
                                    src={user.avatarUrl}
                                    alt={user.name}
                                />
                            ) : (
                                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                                    {getInitials(user.name || "U")}
                                </AvatarFallback>
                            )}
                        </Avatar>

                        <div className="flex-1">
                            {/* User info without buttons */}
                            <div>
                                <h1 className="text-3xl mb-2">
                                    {user.name || "User"}
                                </h1>
                                <div className="flex flex-col gap-2 text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        <span>{user.email || "No email"}</span>
                                    </div>
                                    {user.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4" />
                                            <span>{user.location}</span>
                                        </div>
                                    )}
                                    {user.memberSince && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                Member since{" "}
                                                {formatDate(user.memberSince)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {user.bio && (
                                <>
                                    <Separator className="my-4" />
                                    <p className="text-muted-foreground">
                                        {user.bio}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card
                        className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                        style={{
                            backgroundColor: cardBg,
                            color: textColor,
                            transition:
                                "background-color 0.3s ease, color 0.3s ease",
                        }}
                        onClick={onNavigateToVouchers}
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className="p-3 rounded-lg"
                                style={{
                                    backgroundColor: isDarkMode
                                        ? "#1e3a8a"
                                        : "#dbeafe",
                                }}
                            >
                                <Ticket
                                    className="w-6 h-6"
                                    style={{
                                        color: isDarkMode
                                            ? "#60a5fa"
                                            : "#2563eb",
                                    }}
                                />
                            </div>
                            <div>
                                <p className="text-3xl">
                                    {stats.vouchersCount || 0}
                                </p>
                                <p className="text-muted-foreground">
                                    Vouchers
                                </p>
                                {onNavigateToVouchers && (
                                    <p className="text-xs text-[#FFA1A3] mt-1">
                                        Click to view →
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card
                        className="p-6"
                        style={{
                            backgroundColor: cardBg,
                            color: textColor,
                            transition:
                                "background-color 0.3s ease, color 0.3s ease",
                        }}
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className="p-3 rounded-lg"
                                style={{
                                    backgroundColor: isDarkMode
                                        ? "#78350f"
                                        : "#fef3c7",
                                }}
                            >
                                <Star
                                    className="w-6 h-6"
                                    style={{
                                        color: isDarkMode
                                            ? "#fbbf24"
                                            : "#d97706",
                                    }}
                                />
                            </div>
                            <div>
                                <p className="text-3xl">
                                    {stats.reviewsCount || 0}
                                </p>
                                <p className="text-muted-foreground">Reviews</p>
                            </div>
                        </div>
                    </Card>

                    <Card
                        className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                        style={{
                            backgroundColor: cardBg,
                            color: textColor,
                            transition:
                                "background-color 0.3s ease, color 0.3s ease",
                        }}
                        onClick={onNavigateToVouchers}
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-[#FFA1A3]/20 rounded-lg">
                                <Award className="w-6 h-6 text-[#FFA1A3]" />
                            </div>
                            <div>
                                <p className="text-3xl">
                                    {stats.loyaltyPoints || 0}
                                </p>
                                <p className="text-muted-foreground">
                                    Loyalty Points
                                </p>
                                {onNavigateToVouchers && (
                                    <p className="text-xs text-[#FFA1A3] mt-1">
                                        Click to redeem →
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Referral Panel Section */}
                {user && (
                    <div className="mb-8">
                        <Card
                            className="p-6"
                            style={{
                                backgroundColor: cardBg,
                                color: textColor,
                                transition:
                                    "background-color 0.3s ease, color 0.3s ease",
                            }}
                        >
                            <ReferralPanel
                                userId={user.id}
                                appBaseUrl="https://localoco-wad-ii.azurewebsites.net"
                            />
                        </Card>
                    </div>
                )}

                {/* Bookmarked Businesses Section */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl" style={{ color: textColor }}>
                            My Bookmarked Businesses
                        </h2>
                        <Badge
                            variant="secondary"
                            className={
                                isDarkMode ? "bg-[#3a3a3a] text-white" : ""
                            }
                        >
                            {bookmarkedBusinesses.length} saved
                        </Badge>
                    </div>

                    {bookmarkedBusinesses.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {bookmarkedBusinesses.map((business) => (
                                <BusinessCard
                                    key={business.uen}
                                    business={business}
                                    isBookmarked={true}
                                    onBookmarkToggle={onBookmarkToggle}
                                    onViewDetails={onViewBusinessDetails}
                                />
                            ))}
                        </div>
                    ) : (
                        <Card
                            className="p-12 text-center"
                            style={{
                                backgroundColor: cardBg,
                                color: textColor,
                                transition:
                                    "background-color 0.3s ease, color 0.3s ease",
                            }}
                        >
                            <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="mb-2">
                                No bookmarked businesses yet
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                Start exploring and bookmark your favorite local
                                businesses!
                            </p>
                            <Button
                                onClick={onBack}
                                className="bg-[#FFA1A3] hover:bg-[#FF8A8C] text-white"
                            >
                                Browse Businesses
                            </Button>
                        </Card>
                    )}
                </div>
            </div>

            {/* Edit Profile Dialog */}
            {user && (
                <EditProfileDialog
                    user={user}
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    onSave={handleSaveProfile}
                />
            )}
        </div>
    );
}
