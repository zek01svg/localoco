// components/BookmarksPage.tsx
import { useNavigate } from "react-router-dom";
import { Bookmark as BookmarkIcon } from "lucide-react";
import { useBookmarks } from "../hooks/useBookmarks";
import { useBusinesses } from "../hooks/useBusinesses";
import { useTheme } from "../hooks/useTheme";
import { BusinessCard } from "./BusinessCard";
import { Button } from "./ui/button";

export const BookmarksPage = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const { isLoading } = useBusinesses(); // Ensure businesses are loaded
    const { bookmarkedBusinesses, toggleBookmark } = useBookmarks();

    return (
        <div
            className="min-h-screen md:pl-6"
            style={{ backgroundColor: isDarkMode ? "#3a3a3a" : "#f9fafb" }}
        >
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-6">
                    <h1
                        className="text-3xl mb-2"
                        style={{ color: isDarkMode ? "#ffffff" : "#000000" }}
                    >
                        My Bookmarks
                    </h1>
                    <p className="text-muted-foreground">
                        Your saved businesses
                    </p>
                </div>
                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">
                            Loading your bookmarks...
                        </p>
                    </div>
                ) : bookmarkedBusinesses.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {bookmarkedBusinesses.map((business) => (
                            <BusinessCard
                                key={business.uen}
                                business={business}
                                isBookmarked={true}
                                onBookmarkToggle={toggleBookmark}
                                onViewDetails={(id) =>
                                    navigate(`/business/${business.uen}`)
                                }
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <BookmarkIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3
                            className="text-lg mb-2"
                            style={{
                                color: isDarkMode ? "#ffffff" : "#000000",
                            }}
                        >
                            No bookmarked businesses
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            Start exploring and bookmark your favorite local
                            businesses!
                        </p>
                        <Button
                            onClick={() => navigate("/businesses")}
                            className="bg-primary text-white hover:bg-primary/90"
                        >
                            Browse Businesses
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
