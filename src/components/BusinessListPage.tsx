import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Bookmark as BookmarkIcon, Store } from "lucide-react";
import { useBusinesses } from "../hooks/useBusinesses";
import { useBookmarks } from "../hooks/useBookmarks";
import { useTheme } from "../hooks/useTheme";
import { useBusinessStore } from "../store/businessStore";
import { Business } from "../types/business";
import { SearchBar } from "./SearchBar";
import { BusinessCard } from "./BusinessCard";
import { EventsPopup } from "./EventsPopup";
import { FiltersPanel } from "./FiltersPanel";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
// import { mockEvents } from "../data/data";

export const BusinessListPage = () => {
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const { filteredBusinesses } = useBusinesses();
    const { bookmarkedBusinesses, toggleBookmark, isBookmarked } =
        useBookmarks();

    const filters = useBusinessStore((state) => state.filters);
    const setFilters = useBusinessStore((state) => state.setFilters);
    const resetFilters = useBusinessStore((state) => state.resetFilters);

    const [activeTab, setActiveTab] = useState("all");
    const [showEventsPopup, setShowEventsPopup] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Show events popup on mount
    useEffect(() => {
        const timer = setTimeout(() => setShowEventsPopup(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    const handleViewDetails = (business: Business) => {
        navigate(`/business/${business.uen}`);
    };

    return (
        <div
            className="min-h-screen md:pl-6"
            style={{ backgroundColor: isDarkMode ? "#3a3a3a" : "#f9fafb" }}
        >
            <EventsPopup
                open={showEventsPopup}
                onClose={() => setShowEventsPopup(false)}
            />

            {showFilters && (
                <FiltersPanel
                    selectedCategories={filters.selectedCategories}
                    onCategoriesChange={(cats) =>
                        setFilters({ selectedCategories: cats })
                    }
                    selectedPrices={filters.selectedPrices}
                    onPricesChange={(prices) =>
                        setFilters({ selectedPrices: prices })
                    }
                    openNowOnly={filters.openNowOnly}
                    onOpenNowChange={(open) =>
                        setFilters({ openNowOnly: open })
                    }
                    onClose={() => setShowFilters(false)}
                />
            )}

            <header
                className="shadow-sm sticky top-0 z-10"
                style={{ backgroundColor: isDarkMode ? "#3a3a3a" : "#ffffff" }}
            >
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <SearchBar
                        searchTerm={filters.searchTerm}
                        onSearchChange={(term) =>
                            setFilters({ searchTerm: term })
                        }
                        selectedCategories={filters.selectedCategories}
                        onCategoriesChange={(cats) =>
                            setFilters({ selectedCategories: cats })
                        }
                        selectedPrices={filters.selectedPrices}
                        onPricesChange={(prices) =>
                            setFilters({ selectedPrices: prices })
                        }
                        openNowOnly={filters.openNowOnly}
                        onOpenNowChange={(open) =>
                            setFilters({ openNowOnly: open })
                        }
                    />
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6">
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                >
                    <div className="flex items-center justify-between mb-6">
                        <TabsList
                            style={{
                                backgroundColor: isDarkMode
                                    ? "#2a2a2a"
                                    : undefined,
                            }}
                        >
                            <TabsTrigger
                                value="all"
                                className={`flex items-center gap-2 ${
                                    isDarkMode
                                        ? "data-[state=active]:bg-[#3a3a3a] data-[state=active]:text-white text-gray-400"
                                        : ""
                                }`}
                            >
                                <MapPin className="w-4 h-4" />
                                All Businesses
                                <Badge
                                    variant="secondary"
                                    className={`ml-2 ${
                                        isDarkMode
                                            ? "bg-[#3a3a3a] text-white"
                                            : ""
                                    }`}
                                >
                                    {filteredBusinesses.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="bookmarked"
                                className={`flex items-center gap-2 ${
                                    isDarkMode
                                        ? "data-[state=active]:bg-[#3a3a3a] data-[state=active]:text-white text-gray-400"
                                        : ""
                                }`}
                            >
                                <BookmarkIcon className="w-4 h-4" />
                                Bookmarked
                                <Badge
                                    variant="secondary"
                                    className={`ml-2 ${
                                        isDarkMode
                                            ? "bg-[#3a3a3a] text-white"
                                            : ""
                                    }`}
                                >
                                    {bookmarkedBusinesses.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="all">
                        {filteredBusinesses.length > 0 ? (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {filteredBusinesses.map((business, index) => (
                                    <BusinessCard
                                        key={
                                            business.uen || `business-${index}`
                                        }
                                        business={business}
                                        isBookmarked={isBookmarked(
                                            business.uen,
                                        )}
                                        onBookmarkToggle={toggleBookmark}
                                        onViewDetails={handleViewDetails}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3
                                    className="text-lg mb-2"
                                    style={{
                                        color: isDarkMode
                                            ? "#ffffff"
                                            : "#000000",
                                    }}
                                >
                                    No businesses found
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    Try adjusting your search criteria or browse
                                    all businesses.
                                </p>
                                <Button
                                    onClick={resetFilters}
                                    className="bg-primary text-white hover:bg-primary/90"
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="bookmarked">
                        {bookmarkedBusinesses.length > 0 ? (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {bookmarkedBusinesses.map((business, index) => (
                                    <BusinessCard
                                        key={
                                            business.uen ||
                                            `bookmarked-${index}`
                                        }
                                        business={business}
                                        isBookmarked={true}
                                        onBookmarkToggle={toggleBookmark}
                                        onViewDetails={handleViewDetails}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <BookmarkIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3
                                    className="text-lg mb-2"
                                    style={{
                                        color: isDarkMode
                                            ? "#ffffff"
                                            : "#000000",
                                    }}
                                >
                                    No bookmarked businesses
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    Start exploring and bookmark your favorite
                                    local businesses!
                                </p>
                                <Button
                                    onClick={() => setActiveTab("all")}
                                    className="bg-primary text-white hover:bg-primary/90"
                                >
                                    Browse Businesses
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};
