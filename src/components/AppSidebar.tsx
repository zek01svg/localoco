import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useUserBusinesses } from "../hooks/useUserBusinesses";
import { authClient } from "../lib/authClient";
import { useUser } from "../hooks/useUser";
import {
    Home,
    Box,
    Layers,
    Bell, // Bell is already imported
    Moon,
    Sun,
    Settings,
    MoreVertical,
    Store,
    Bookmark,
    Ticket,
    User,
    LogOut,
    LogIn,
    Briefcase,
    ChevronDown,
    X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuPortal,
} from "./ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { useThemeStore } from "../store/themeStore";
import { toast } from "sonner";
import { url } from "../constants/url";

interface AppSidebarProps {
    // Added 'announcements' to the view types
    onNavigate: (
        view:
            | "map"
            | "list"
            | "forum"
            | "profile"
            | "filters"
            | "bookmarks"
            | "notifications"
            | "settings"
            | "vouchers"
            | "announcements",
    ) => void;
    onLogout: () => void;
    currentView?: string;
    userName?: string;
    userEmail?: string;
    avatarUrl?: string;
    notificationCount?: number;
    onThemeToggle?: () => void;
    isAuthenticated?: boolean;
}

export function AppSidebar({
    onNavigate,
    onLogout,
    currentView,
    userName = "User",
    userEmail = "user@example.com",
    avatarUrl,
    notificationCount = 0,
    onThemeToggle,
    isAuthenticated = true,
}: AppSidebarProps) {
    const navigate = useNavigate();
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
    const [showMobileBusinessMenu, setShowMobileBusinessMenu] = useState(false);
    const [showTransition, setShowTransition] = useState(false);
    const [transitionText, setTransitionText] = useState("");
    const [transitionIcon, setTransitionIcon] = useState<"user" | "business">(
        "user",
    );
    const [isFadingOut, setIsFadingOut] = useState(false);
    const role = useAuthStore((state) => state.role);
    const userId = useAuthStore((state) => state.userId);

    // Business mode state
    const businessMode = useAuthStore((state) => state.businessMode);
    const enableBusinessMode = useAuthStore(
        (state) => state.enableBusinessMode,
    );
    const disableBusinessMode = useAuthStore(
        (state) => state.disableBusinessMode,
    );
    const switchBusiness = useAuthStore((state) => state.switchBusiness);

    // Fetch user session to check has_business
    const { data: session } = authClient.useSession();
    const hasBusiness = session?.user?.hasBusiness || false;

    // Fetch user's businesses
    const { businesses, isLoading: businessesLoading } = useUserBusinesses();

    // Fetch user data for avatar
    const { user, refetch: refetchUser } = useUser(userId);

    // Detect screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Check on mount
        checkMobile();

        // Add listener for window resize
        window.addEventListener("resize", checkMobile);

        // Cleanup
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const bgColor = isDarkMode ? "#3a3a3a" : "#ffffff";
    const textColor = isDarkMode ? "text-white" : "text-black";
    const secondaryTextColor = isDarkMode ? "text-gray-400" : "text-gray-600";
    const borderColor = isDarkMode ? "border-gray-600" : "border-gray-200";
    const hoverBgColor = isDarkMode
        ? "hover:bg-[#404040]"
        : "hover:bg-gray-100";
    const avatarBgColor = isDarkMode ? "bg-gray-600" : "bg-gray-300";

    // Define the base set of user menu items
    const userMenuItems = [
        { icon: Home, label: "Home", view: "map" as const },
        { icon: Box, label: "Explore", view: "list" as const },
        {
            icon: Bookmark,
            label: "Bookmarks",
            view: "bookmarks" as const,
            requiresAuth: true,
        },
        {
            icon: Ticket,
            label: "Vouchers",
            view: "vouchers" as const,
            userOnly: true,
            requiresAuth: true,
        },
        {
            icon: Layers,
            label: "Forum",
            view: "forum" as const,
            requiresAuth: true,
        },
    ];

    // Define the business-specific menu item
    const businessSpecificItem = {
        icon: Bell, // Reusing Bell icon for Announcements
        label: "Announcements",
        view: "announcements" as const,
        requiresAuth: true,
        isBusinessItem: true,
    };

    // Conditionally include the business item
    const allMenuItems = businessMode.isBusinessMode
        ? [
              { icon: Home, label: "Dashboard", view: "map" as const }, // Renaming Home to Dashboard in business mode
              businessSpecificItem,
              ...userMenuItems.filter((item) => item.view !== "map"), // Exclude user Home/Map, keep others if needed
          ]
        : userMenuItems;

    const mainMenuItems = allMenuItems.filter((item) => {
        // Standard filtering logic
        if (item.userOnly && role !== "user") {
            return false;
        }
        // Note: Business items are already filtered by the conditional logic above
        return true;
    });

    const bottomMenuItems = [
        {
            icon: Bell,
            label: "Notifications",
            view: "notifications" as const,
            hasNotification: notificationCount > 0,
            requiresAuth: true,
        },
        {
            icon: isDarkMode ? Sun : Moon,
            label: "Theme",
            view: null,
            isThemeToggle: true,
        },
        {
            icon: Settings,
            label: "Settings",
            view: "settings" as const,
            requiresAuth: true,
        },
    ];

    const handleMenuClick = (
        view:
            | "map"
            | "list"
            | "forum"
            | "profile"
            | "filters"
            | "bookmarks"
            | "notifications"
            | "settings"
            | "vouchers"
            | "announcements"
            | null,
        isThemeToggle?: boolean,
        requiresAuth?: boolean,
    ) => {
        if (isThemeToggle && onThemeToggle) {
            onThemeToggle();
        } else if (view) {
            if (requiresAuth && !isAuthenticated) {
                setShowLoginPrompt(true);
            } else {
                onNavigate(view);
            }
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();
    };

    const handleBusinessModeToggle = async () => {
        if (businessMode.isBusinessMode) {
            // Switch back to user mode - fetch fresh user avatar from DB
            try {
                const response = await fetch(
                    `${url}/api/users/profile/${userId}`,
                );
                if (response.ok) {
                    const data = await response.json();
                    const profileData = data.profile || data;
                    const freshAvatar = profileData.image || "";
                    useAuthStore.getState().setAvatarUrl(freshAvatar);
                }
            } catch (err) {
                console.error("Failed to fetch user avatar:", err);
            }

            setTransitionText("User Mode");
            setTransitionIcon("user");
            setShowTransition(true);

            setTimeout(() => {
                disableBusinessMode();
                toast.success("Switched to User Mode", {
                    description: "You are now viewing as a personal user",
                    duration: 3000,
                });
            }, 800);

            // Start fade out
            setTimeout(() => {
                setIsFadingOut(true);
            }, 1600);

            // Remove element after fade out completes
            setTimeout(() => {
                setShowTransition(false);
                setIsFadingOut(false);
            }, 2200);
        } else {
            // Switch to business mode with the first business - clear user avatar
            if (businesses.length > 0) {
                const firstBusiness = businesses[0];
                useAuthStore
                    .getState()
                    .setAvatarUrl(firstBusiness.wallpaper || "");

                setTransitionText(`Business Mode`);
                setTransitionIcon("business");
                setShowTransition(true);

                setTimeout(() => {
                    enableBusinessMode(
                        firstBusiness.uen,
                        firstBusiness.businessName,
                    );
                    toast.success("Switched to Business Mode", {
                        description: `Now managing: ${firstBusiness.businessName}`,
                        duration: 3000,
                    });
                }, 800);

                // Start fade out
                setTimeout(() => {
                    setIsFadingOut(true);
                }, 1600);

                // Remove element after fade out completes
                setTimeout(() => {
                    setShowTransition(false);
                    setIsFadingOut(false);
                }, 2200);
            }
        }
    };

    const handleBusinessSwitch = (uen: string, name: string) => {
        // Update avatar to new business wallpaper
        const business = businesses.find((b) => b.uen === uen);
        if (business?.wallpaper) {
            useAuthStore.getState().setAvatarUrl(business.wallpaper);
        }

        setTransitionText(name); // Show the business name
        setTransitionIcon("business");
        setShowTransition(true);

        setTimeout(() => {
            switchBusiness(uen, name);
            setShowBusinessDropdown(false);
            toast.success("Business Switched", {
                description: `Now managing: ${name}`,
                duration: 3000,
            });
        }, 800);

        // Start fade out
        setTimeout(() => {
            setIsFadingOut(true);
        }, 1600);

        // Remove element after fade out completes
        setTimeout(() => {
            setShowTransition(false);
            setIsFadingOut(false);
        }, 2200);
    };

    // Combine all menu items for mobile view
    const allBottomNavItems = [
        // Include the business-specific item only in business mode for mobile
        ...(businessMode.isBusinessMode ? [businessSpecificItem] : []),
        ...mainMenuItems.filter(
            (item) =>
                item.view !== "vouchers" &&
                item.view !== "announcements" &&
                !item.isBusinessItem,
        ), // Filter out business item if mobile nav is combined with user items
        {
            icon: Bell,
            label: "Notifications",
            view: "notifications" as const,
            hasNotification: notificationCount > 0,
            requiresAuth: true,
        },
        ...(isAuthenticated
            ? [
                  {
                      icon: null,
                      label: "Profile",
                      view: "profile" as const,
                      isAvatar: true,
                  },
              ]
            : [
                  {
                      icon: LogIn,
                      label: "Login",
                      view: null as const,
                      isLoginButton: true,
                  },
              ]),
        // ✅ Add business mode toggle for mobile (only show if user has businesses)
        ...(isAuthenticated && hasBusiness
            ? [
                  {
                      icon: Briefcase,
                      label: businessMode.isBusinessMode
                          ? "User Mode"
                          : "Business Mode",
                      view: null as const,
                      isBusinessModeToggle: true,
                  },
              ]
            : []),
        {
            icon: Settings,
            label: "Settings",
            view: "settings" as const,
            requiresAuth: true,
        },
    ];

    return (
        <>
            {/* Desktop Sidebar - only render on desktop */}
            {!isMobile && (
                <div
                    className="fixed left-0 top-0 h-screen transition-all duration-300 ease-in-out z-40"
                    style={{
                        width: isExpanded ? "280px" : "80px",
                        backgroundColor: bgColor,
                    }}
                    onMouseEnter={() => setIsExpanded(true)}
                    onMouseLeave={() => {
                        if (!isDropdownOpen && !showBusinessDropdown) {
                            setIsExpanded(false);
                        }
                    }}
                >
                    {/* ... Header content remains the same ... */}
                    <div className={`p-4 border-b ${borderColor}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 flex-shrink-0 bg-[#FFA1A3] rounded-lg flex items-center justify-center">
                                <Store className="w-7 h-7 text-white" />
                            </div>
                            {isExpanded && (
                                <div className="overflow-hidden">
                                    <h1
                                        className={`${textColor} text-xl whitespace-nowrap`}
                                    >
                                        LocaLoco
                                    </h1>
                                    <p
                                        className={`${secondaryTextColor} text-xs whitespace-nowrap overflow-hidden text-ellipsis`}
                                    >
                                        Discover and support local busine...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Menu Items */}
                    <nav className="flex-1 px-3 py-2 space-y-1">
                        {mainMenuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentView === item.view;
                            const isDisabled =
                                "requiresAuth" in item &&
                                item.requiresAuth &&
                                !isAuthenticated;
                            const isBusinessItem =
                                "isBusinessItem" in item && item.isBusinessItem;

                            return (
                                <button
                                    key={item.label}
                                    onClick={() =>
                                        handleMenuClick(
                                            item.view,
                                            false,
                                            "requiresAuth" in item
                                                ? item.requiresAuth
                                                : false,
                                        )
                                    }
                                    className={`w-full rounded-lg p-3 flex items-center gap-3 transition-colors ${
                                        isActive
                                            ? "bg-[#FFA1A3]/20 text-[#FFA1A3]"
                                            : isDisabled
                                              ? `opacity-25 cursor-not-allowed ${isDarkMode ? "text-gray-600" : "text-gray-400"}`
                                              : `${secondaryTextColor} ${hoverBgColor} ${isDarkMode ? "hover:text-white" : "hover:text-black"}`
                                    } ${isBusinessItem && businessMode.isBusinessMode ? "font-semibold text-[#FFA1A3]" : ""} `}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0" />
                                    {isExpanded && (
                                        <span className="text-sm whitespace-nowrap">
                                            {item.label}
                                        </span>
                                    )}
                                    {isBusinessItem &&
                                        businessMode.isBusinessMode && (
                                            <div className="absolute top-1 right-1 w-2 h-2 bg-[#FFA1A3] rounded-full animate-pulse"></div>
                                        )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* ... Bottom Menu Items and other sections remain the same ... */}
                    <nav
                        className={`px-3 py-4 space-y-1 border-t ${borderColor}`}
                    >
                        {bottomMenuItems.map((item) => {
                            const Icon = item.icon;
                            const isDisabled =
                                "requiresAuth" in item &&
                                item.requiresAuth &&
                                !isAuthenticated;

                            return (
                                <button
                                    key={item.label}
                                    onClick={() =>
                                        handleMenuClick(
                                            item.view,
                                            item.isThemeToggle,
                                            "requiresAuth" in item
                                                ? item.requiresAuth
                                                : false,
                                        )
                                    }
                                    className={`w-full rounded-lg p-3 flex items-center gap-3 transition-colors relative ${
                                        isDisabled
                                            ? `opacity-25 cursor-not-allowed ${isDarkMode ? "text-gray-600" : "text-gray-400"}`
                                            : `${secondaryTextColor} ${hoverBgColor} ${isDarkMode ? "hover:text-white" : "hover:text-black"}`
                                    }`}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0" />
                                    {isExpanded && (
                                        <span className="text-sm whitespace-nowrap flex-1 text-left">
                                            {item.label}
                                        </span>
                                    )}
                                    {item.hasNotification && (
                                        <Badge className="bg-[#FFA1A3] text-white hover:bg-[#FFA1A3] text-xs px-2 absolute right-2">
                                            {notificationCount}
                                        </Badge>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Business Mode Toggle Section - Only visible if user has businesses */}
                    {isAuthenticated &&
                        hasBusiness &&
                        businesses.length > 0 && (
                            <nav
                                className={`px-3 py-4 space-y-1 border-t ${borderColor}`}
                            >
                                <button
                                    onClick={handleBusinessModeToggle}
                                    className={`w-full rounded-lg p-3 flex items-center gap-3 transition-all duration-300 relative ${
                                        businessMode.isBusinessMode
                                            ? "bg-[#FFA1A3]/20 text-[#FFA1A3] shadow-lg shadow-[#FFA1A3]/30"
                                            : `${secondaryTextColor} ${hoverBgColor} ${isDarkMode ? "hover:text-white" : "hover:text-black"}`
                                    }`}
                                >
                                    <Briefcase
                                        className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${
                                            businessMode.isBusinessMode
                                                ? "scale-110"
                                                : ""
                                        }`}
                                    />
                                    {isExpanded && (
                                        <span className="text-sm whitespace-nowrap flex-1 text-left font-medium">
                                            {businessMode.isBusinessMode
                                                ? "User Mode"
                                                : "Business Mode"}
                                        </span>
                                    )}
                                    {businessMode.isBusinessMode && (
                                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#FFA1A3] rounded-full animate-pulse"></div>
                                    )}
                                </button>

                                {/* Business Dropdown - Only visible when in business mode and user has multiple businesses */}
                                {businessMode.isBusinessMode &&
                                    businesses.length > 1 && (
                                        <DropdownMenu
                                            open={showBusinessDropdown}
                                            onOpenChange={
                                                setShowBusinessDropdown
                                            }
                                        >
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    className={`w-full rounded-lg p-3 flex items-center gap-3 transition-colors ${secondaryTextColor} ${hoverBgColor} ${isDarkMode ? "hover:text-white" : "hover:text-black"}`}
                                                >
                                                    <Store className="w-5 h-5 flex-shrink-0" />
                                                    {isExpanded && (
                                                        <>
                                                            <span className="text-sm whitespace-nowrap flex-1 text-left truncate">
                                                                {businessMode.currentBusinessName ||
                                                                    "Select Business"}
                                                            </span>
                                                            <ChevronDown className="w-4 h-4 flex-shrink-0" />
                                                        </>
                                                    )}
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuPortal>
                                                <DropdownMenuContent
                                                    align="end"
                                                    side="right"
                                                    sideOffset={8}
                                                    className="w-56"
                                                    style={{
                                                        backgroundColor:
                                                            bgColor,
                                                        borderColor: isDarkMode
                                                            ? "#404040"
                                                            : "#e5e7eb",
                                                        zIndex: 9999,
                                                    }}
                                                >
                                                    <DropdownMenuLabel
                                                        className={textColor}
                                                    >
                                                        My Businesses
                                                    </DropdownMenuLabel>
                                                    <DropdownMenuSeparator
                                                        style={{
                                                            backgroundColor:
                                                                isDarkMode
                                                                    ? "#404040"
                                                                    : "#e5e7eb",
                                                        }}
                                                    />
                                                    {businesses.map(
                                                        (business) => (
                                                            <DropdownMenuItem
                                                                key={
                                                                    business.uen
                                                                }
                                                                onClick={() =>
                                                                    handleBusinessSwitch(
                                                                        business.uen,
                                                                        business.businessName,
                                                                    )
                                                                }
                                                                className={`${textColor} ${hoverBgColor} cursor-pointer ${
                                                                    businessMode.currentBusinessUen ===
                                                                    business.uen
                                                                        ? "bg-[#FFA1A3]/10"
                                                                        : ""
                                                                }`}
                                                            >
                                                                {business.wallpaper ? (
                                                                    <img
                                                                        src={
                                                                            business.wallpaper
                                                                        }
                                                                        alt={
                                                                            business.businessName
                                                                        }
                                                                        className="w-6 h-6 mr-2 rounded-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <Store className="w-4 h-4 mr-2" />
                                                                )}
                                                                <span className="truncate">
                                                                    {
                                                                        business.businessName
                                                                    }
                                                                </span>
                                                            </DropdownMenuItem>
                                                        ),
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenuPortal>
                                        </DropdownMenu>
                                    )}
                            </nav>
                        )}

                    {!isAuthenticated && (
                        <div className={`p-3 border-t ${borderColor}`}>
                            <button
                                onClick={() => navigate("/login")}
                                className={`w-full rounded-lg p-3 flex items-center justify-center gap-2 bg-[#FFA1A3] hover:bg-[#FF8A8C] text-white transition-colors`}
                            >
                                <LogIn className="w-5 h-5 flex-shrink-0" />
                                {isExpanded && (
                                    <span className="text-sm font-medium whitespace-nowrap">
                                        Login / Sign Up
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    {isAuthenticated && (
                        <div
                            className={`p-3 border-t ${borderColor} transition-all duration-300`}
                        >
                            <div
                                className={`w-full rounded-lg p-3 flex items-center gap-3 ${textColor} transition-all duration-300 relative ${
                                    businessMode.isBusinessMode
                                        ? "bg-[#FFA1A3]/10"
                                        : ""
                                }`}
                            >
                                <button
                                    onClick={() => handleMenuClick("profile")}
                                    className={`flex items-center gap-3 ${hoverBgColor} transition-colors rounded-lg flex-1`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <Avatar
                                            className={`w-10 h-10 transition-all duration-300 ${
                                                businessMode.isBusinessMode
                                                    ? "ring-2 ring-[#FFA1A3] ring-offset-2"
                                                    : ""
                                            }`}
                                            style={{ ringOffsetColor: bgColor }}
                                        >
                                            {(() => {
                                                // ✅ If in business mode, find the current business and use its wallpaper
                                                if (
                                                    businessMode.isBusinessMode &&
                                                    businessMode.currentBusinessUen
                                                ) {
                                                    const currentBusiness =
                                                        businesses.find(
                                                            (b) =>
                                                                b.uen ===
                                                                businessMode.currentBusinessUen,
                                                        );
                                                    const businessImage =
                                                        currentBusiness?.wallpaper;

                                                    return businessImage ? (
                                                        <AvatarImage
                                                            key={
                                                                businessMode.currentBusinessUen
                                                            }
                                                            src={businessImage}
                                                            alt={
                                                                businessMode.currentBusinessName ||
                                                                "Business"
                                                            }
                                                            className="animate-in fade-in duration-300"
                                                        />
                                                    ) : (
                                                        <AvatarFallback
                                                            key={
                                                                businessMode.currentBusinessUen
                                                            }
                                                            className="bg-[#FFA1A3] text-white transition-all duration-300 animate-in fade-in"
                                                        >
                                                            {getInitials(
                                                                businessMode.currentBusinessName ||
                                                                    "B",
                                                            )}
                                                        </AvatarFallback>
                                                    );
                                                }

                                                // ✅ Otherwise use user avatar (prioritize authStore for real-time updates)
                                                const userAvatar =
                                                    avatarUrl ||
                                                    user?.avatarUrl;
                                                return userAvatar ? (
                                                    <AvatarImage
                                                        key="user"
                                                        src={userAvatar}
                                                        alt={userName}
                                                        className="animate-in fade-in duration-300"
                                                    />
                                                ) : (
                                                    <AvatarFallback
                                                        key="user"
                                                        className={`${avatarBgColor} ${textColor} transition-all duration-300 animate-in fade-in`}
                                                    >
                                                        {getInitials(userName)}
                                                    </AvatarFallback>
                                                );
                                            })()}
                                        </Avatar>
                                        <div
                                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 transition-colors duration-300 ${
                                                businessMode.isBusinessMode
                                                    ? "bg-[#FFA1A3]"
                                                    : "bg-green-500"
                                            }`}
                                            style={{ borderColor: bgColor }}
                                        ></div>
                                    </div>
                                    {isExpanded && (
                                        <div className="flex-1 text-left overflow-hidden">
                                            <p
                                                key={`name-${businessMode.isBusinessMode ? businessMode.currentBusinessUen : "user"}`}
                                                className={`text-sm ${textColor} whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-300 animate-in slide-in-from-left ${
                                                    businessMode.isBusinessMode
                                                        ? "text-[#FFA1A3] font-semibold"
                                                        : ""
                                                }`}
                                            >
                                                {businessMode.isBusinessMode &&
                                                businessMode.currentBusinessName
                                                    ? businessMode.currentBusinessName
                                                    : userName}
                                            </p>
                                            <p
                                                key={`email-${businessMode.isBusinessMode ? "business" : "user"}`}
                                                className={`text-xs ${secondaryTextColor} whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-300 animate-in slide-in-from-left delay-75`}
                                            >
                                                {businessMode.isBusinessMode
                                                    ? "Business Account"
                                                    : userEmail}
                                            </p>
                                        </div>
                                    )}
                                </button>
                                {isExpanded && (
                                    <DropdownMenu
                                        open={isDropdownOpen}
                                        onOpenChange={setIsDropdownOpen}
                                    >
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className={`p-1 ${hoverBgColor} rounded transition-colors`}
                                                onClick={(
                                                    e: React.MouseEvent,
                                                ) => {
                                                    e.stopPropagation();
                                                    setIsDropdownOpen(
                                                        !isDropdownOpen,
                                                    );
                                                }}
                                            >
                                                <MoreVertical
                                                    className={`w-4 h-4 ${secondaryTextColor} flex-shrink-0`}
                                                />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuContent
                                                align="end"
                                                side="right"
                                                sideOffset={8}
                                                className="w-56"
                                                style={{
                                                    backgroundColor: bgColor,
                                                    borderColor: isDarkMode
                                                        ? "#404040"
                                                        : "#e5e7eb",
                                                    zIndex: 9999,
                                                }}
                                                onCloseAutoFocus={(e: Event) =>
                                                    e.preventDefault()
                                                }
                                            >
                                                <DropdownMenuLabel
                                                    className={textColor}
                                                >
                                                    My Account
                                                </DropdownMenuLabel>
                                                <DropdownMenuSeparator
                                                    style={{
                                                        backgroundColor:
                                                            isDarkMode
                                                                ? "#404040"
                                                                : "#e5e7eb",
                                                    }}
                                                />
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setIsDropdownOpen(
                                                            false,
                                                        );
                                                        handleMenuClick(
                                                            "profile",
                                                        );
                                                    }}
                                                    className={`${textColor} ${hoverBgColor} cursor-pointer`}
                                                >
                                                    <User className="w-4 h-4 mr-2" />
                                                    <span>View Profile</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setIsDropdownOpen(
                                                            false,
                                                        );
                                                        onLogout();
                                                    }}
                                                    className={`${textColor} ${hoverBgColor} cursor-pointer`}
                                                >
                                                    <LogOut className="w-4 h-4 mr-2 text-red-500" />
                                                    <span className="text-red-500">
                                                        Log Out
                                                    </span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenu>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Mobile Bottom Navigation - only render on mobile */}
            {isMobile && (
                <div
                    className="fixed bottom-0 left-0 right-0 z-40 border-t safe-area-inset-bottom"
                    style={{
                        backgroundColor: bgColor,
                        borderTopColor: isDarkMode ? "#404040" : "#e5e7eb",
                        width: "100%",
                        maxWidth: "100vw",
                    }}
                >
                    <div
                        className="px-2 py-3"
                        style={{
                            overflowX: "auto",
                            overflowY: "hidden",
                            scrollbarWidth: "thin",
                            scrollbarColor: isDarkMode
                                ? "#404040 transparent"
                                : "#e5e7eb transparent",
                            WebkitOverflowScrolling: "touch",
                            msOverflowStyle: "auto",
                            width: "100%",
                        }}
                    >
                        <div
                            className="inline-flex gap-1"
                            style={{ whiteSpace: "nowrap" }}
                        >
                            {allBottomNavItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentView === item.view;
                                const isThemeToggle =
                                    "isThemeToggle" in item &&
                                    item.isThemeToggle;
                                const hasNotification =
                                    "hasNotification" in item &&
                                    item.hasNotification;
                                const isAvatar =
                                    "isAvatar" in item && item.isAvatar;
                                const isLoginButton =
                                    "isLoginButton" in item &&
                                    item.isLoginButton;
                                const isDisabled =
                                    "requiresAuth" in item &&
                                    item.requiresAuth &&
                                    !isAuthenticated;
                                const isBusinessItem =
                                    "isBusinessItem" in item &&
                                    item.isBusinessItem;
                                const isBusinessModeToggle =
                                    "isBusinessModeToggle" in item &&
                                    item.isBusinessModeToggle;

                                return (
                                    <button
                                        key={item.label}
                                        onClick={() => {
                                            if (isLoginButton) {
                                                navigate("/login");
                                            } else if (isBusinessModeToggle) {
                                                setShowMobileBusinessMenu(true);
                                            } else {
                                                handleMenuClick(
                                                    item.view,
                                                    isThemeToggle,
                                                    "requiresAuth" in item
                                                        ? item.requiresAuth
                                                        : false,
                                                );
                                            }
                                        }}
                                        className={`inline-flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors relative ${
                                            isActive
                                                ? "bg-[#FFA1A3]/20 text-[#FFA1A3]"
                                                : isDisabled
                                                  ? `opacity-25 cursor-not-allowed ${isDarkMode ? "text-gray-600" : "text-gray-400"}`
                                                  : `${secondaryTextColor} active:bg-gray-100 ${isDarkMode ? "active:bg-gray-700" : ""}`
                                        }`}
                                        style={{
                                            minWidth: "64px",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {isAvatar ? (
                                            <Avatar className="w-6 h-6">
                                                {avatarUrl ||
                                                user?.avatarUrl ? (
                                                    <AvatarImage
                                                        src={
                                                            avatarUrl ||
                                                            user?.avatarUrl
                                                        }
                                                        alt={userName}
                                                    />
                                                ) : (
                                                    <AvatarFallback
                                                        className={`${avatarBgColor} ${textColor} text-xs`}
                                                    >
                                                        {getInitials(userName)}
                                                    </AvatarFallback>
                                                )}
                                            </Avatar>
                                        ) : (
                                            Icon && (
                                                <Icon className="w-5 h-5 flex-shrink-0" />
                                            )
                                        )}
                                        <span className="text-xs mt-1 whitespace-nowrap">
                                            {item.label}
                                        </span>
                                        {(hasNotification ||
                                            (isBusinessItem &&
                                                businessMode.isBusinessMode)) && (
                                            <div className="absolute top-1 right-1 w-2 h-2 bg-[#FFA1A3] rounded-full"></div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Login Prompt Modal */}
            <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Sign in Required</DialogTitle>
                        <DialogDescription>
                            Sign in to access our full services including
                            bookmarks, notifications, forum, and more.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-center">
                        <Button
                            variant="outline"
                            onClick={() => setShowLoginPrompt(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                setShowLoginPrompt(false);
                                navigate("/login");
                            }}
                            className="bg-[#FFA1A3] hover:bg-[#FF8A8C] text-white"
                        >
                            Sign In
                        </Button>
                        <Button
                            onClick={() => {
                                setShowLoginPrompt(false);
                                navigate("/signup");
                            }}
                            variant="outline"
                        >
                            Sign Up
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Full-screen transition animation */}
            {showTransition && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                        animation: isFadingOut
                            ? "fadeOut 0.6s ease-in-out forwards"
                            : "fadeIn 0.5s ease-in-out",
                    }}
                >
                    {/* Animated slide from left */}
                    <div
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: "100%",
                            height: "100%",
                            background:
                                "linear-gradient(90deg, #FFA1A3 0%, #FF8A8C 50%, #FFA1A3 100%)",
                            opacity: 0.95,
                            animation:
                                "slideInFromLeft 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                            transformOrigin: "left",
                        }}
                    />

                    {/* Content */}
                    <div
                        style={{
                            position: "relative",
                            zIndex: 10,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "24px",
                            animation:
                                "scaleIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s backwards",
                        }}
                    >
                        {/* Icon with rotation */}
                        <div
                            style={{
                                width: "96px",
                                height: "96px",
                                borderRadius: "50%",
                                background: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow:
                                    "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                                animation:
                                    "rotateIn 1s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s backwards",
                            }}
                        >
                            {transitionIcon === "business" ? (
                                <Briefcase
                                    style={{
                                        width: "48px",
                                        height: "48px",
                                        color: "#FFA1A3",
                                    }}
                                />
                            ) : (
                                <User
                                    style={{
                                        width: "48px",
                                        height: "48px",
                                        color: "#FFA1A3",
                                    }}
                                />
                            )}
                        </div>

                        {/* Text */}
                        <div
                            style={{
                                textAlign: "center",
                                animation:
                                    "slideUp 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s backwards",
                            }}
                        >
                            <h2
                                style={{
                                    fontSize: "36px",
                                    fontWeight: "bold",
                                    color: "white",
                                    marginBottom: "8px",
                                }}
                            >
                                {transitionText}
                            </h2>
                            <p
                                style={{
                                    color: "white",
                                    fontSize: "18px",
                                    opacity: 0.9,
                                }}
                            >
                                {transitionIcon === "business"
                                    ? transitionText.includes("Mode")
                                        ? "Managing your business"
                                        : "Switching business"
                                    : "Personal account"}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Add keyframe animations */}
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes slideInFromLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes rotateIn {
          from { transform: rotate(-180deg) scale(0); opacity: 0; }
          to { transform: rotate(0) scale(1); opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes waveSweep {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }

        @keyframes popIn {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }

        @keyframes spinPop {
          0% { transform: rotate(-180deg) scale(0); opacity: 0; }
          50% { transform: rotate(10deg) scale(1.1); }
          100% { transform: rotate(0) scale(1); opacity: 1; }
        }

        @keyframes fadeSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opac

        @keyframes fadeSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

            {/* Mobile Business Menu Modal */}
            {showMobileBusinessMenu && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-end md:hidden"
                    onClick={() => setShowMobileBusinessMenu(false)}
                >
                    <div
                        className="w-full rounded-t-2xl p-6 space-y-4 animate-slide-up"
                        style={{ backgroundColor: bgColor }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3
                                className={`text-lg font-semibold ${textColor}`}
                            >
                                {businessMode.isBusinessMode
                                    ? "Switch Business"
                                    : "Select Business"}
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowMobileBusinessMenu(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {/* Show "User Mode" button if currently in business mode */}
                            {businessMode.isBusinessMode && (
                                <button
                                    onClick={() => {
                                        handleBusinessModeToggle();
                                        setShowMobileBusinessMenu(false);
                                    }}
                                    className={`w-full p-4 rounded-lg flex items-center gap-3 transition-colors ${
                                        isDarkMode
                                            ? "bg-gray-700 hover:bg-gray-600"
                                            : "bg-gray-100 hover:bg-gray-200"
                                    }`}
                                >
                                    <User className="w-6 h-6 text-[#FFA1A3]" />
                                    <div className="flex-1 text-left">
                                        <p
                                            className={`font-medium ${textColor}`}
                                        >
                                            User Mode
                                        </p>
                                        <p
                                            className={`text-xs ${secondaryTextColor}`}
                                        >
                                            Switch back to personal account
                                        </p>
                                    </div>
                                </button>
                            )}

                            {/* List all businesses */}
                            {businesses.map((business) => {
                                const isCurrentBusiness =
                                    businessMode.isBusinessMode &&
                                    businessMode.currentBusinessUen ===
                                        business.uen;

                                return (
                                    <button
                                        key={business.uen}
                                        onClick={() => {
                                            if (businessMode.isBusinessMode) {
                                                handleBusinessSwitch(
                                                    business.uen,
                                                    business.businessName,
                                                );
                                            } else {
                                                handleBusinessModeToggle();
                                                setTimeout(() => {
                                                    enableBusinessMode(
                                                        business.uen,
                                                        business.businessName,
                                                    );
                                                }, 800);
                                            }
                                            setShowMobileBusinessMenu(false);
                                        }}
                                        className={`w-full p-4 rounded-lg flex items-center gap-3 transition-colors ${
                                            isCurrentBusiness
                                                ? "bg-[#FFA1A3]/20 border-2 border-[#FFA1A3]"
                                                : isDarkMode
                                                  ? "bg-gray-700 hover:bg-gray-600"
                                                  : "bg-gray-100 hover:bg-gray-200"
                                        }`}
                                    >
                                        {business.wallpaper ? (
                                            <img
                                                src={business.wallpaper}
                                                alt={business.businessName}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <Store className="w-10 h-10 text-[#FFA1A3]" />
                                        )}
                                        <div className="flex-1 text-left">
                                            <p
                                                className={`font-medium ${textColor}`}
                                            >
                                                {business.businessName}
                                            </p>
                                            {isCurrentBusiness && (
                                                <p className="text-xs text-[#FFA1A3]">
                                                    Currently active
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
