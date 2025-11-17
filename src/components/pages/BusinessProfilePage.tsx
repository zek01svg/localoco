import React, { useState, useEffect } from "react"; // Added useEffect for better logging
import {
    Store,
    Mail,
    Phone,
    MapPin,
    Globe,
    Instagram,
    Edit2,
    DollarSign,
    Truck,
    ShoppingBag,
    CreditCard,
    Clock,
} from "lucide-react";
import { BusinessOwner } from "../../types/auth.store.types";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { EditBusinessProfileDialog } from "./EditBusinessProfileDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useThemeStore } from "../../store/themeStore";
import { useUser } from "../../hooks/useUser";
import { useAuthStore } from "../../store/authStore";

interface BusinessProfilePageProps {
    businessOwner?: BusinessOwner;
    onBack?: () => void;
    onUpdateBusiness?: (updatedBusiness: BusinessOwner) => void;
}

export function BusinessProfilePage({
    businessOwner: propBusinessOwner,
    onBack,
    onUpdateBusiness,
}: BusinessProfilePageProps = {}) {
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const navigate = useNavigate();
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    const userId = useAuthStore((state) => state.userId);
    const { user, loading, error, updateUser } = useUser(userId);


    const [businessOwner, setBusinessOwner] = useState<
        BusinessOwner | undefined
    >(propBusinessOwner || (user as BusinessOwner));

    const DAYSOFWEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    


    useEffect(() => {
        setBusinessOwner(propBusinessOwner);
    }, [propBusinessOwner]);
    // *** LOGGING ADDED HERE ***
    // This will log the businessOwner object whenever it changes.
    useEffect(() => {
        
        if (businessOwner) {
            
            console.log("--- INSPECT THIS BUSINESS DATA ---", businessOwner);
        }
    }, [businessOwner]);

    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: isDarkMode ? "#3a3a3a" : "#f9fafb" }}
            >
                <div
                    className="text-center"
                    style={{ color: isDarkMode ? "#ffffff" : "#000000" }}
                >
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4 mx-auto"></div>
                    <p>Loading business profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: isDarkMode ? "#3a3a3a" : "#f9fafb" }}
            >
                <Card
                    className="p-6"
                    style={{
                        backgroundColor: isDarkMode ? "#2a2a2a" : "#ffffff",
                        color: isDarkMode ? "#ffffff" : "#000000",
                    }}
                >
                    <p className="mb-4 text-red-500">Error: {error}</p>
                    <Button onClick={() => navigate(-1)}>Go Back</Button>
                </Card>
            </div>
        );
    }

    if (!businessOwner || !businessOwner.businessName) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: isDarkMode ? "#3a3a3a" : "#f9fafb" }}
            >
                <Card
                    className="p-6"
                    style={{
                        backgroundColor: isDarkMode ? "#2a2a2a" : "#ffffff",
                        color: isDarkMode ? "#ffffff" : "#000000",
                    }}
                >
                    <p className="mb-4">Business data not found.</p>
                    <Button onClick={() => navigate(-1)}>Go Back</Button>
                </Card>
            </div>
        );
    }

    const getInitials = (name: string) => {
        if (!name) return ""; // Guard against undefined name
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();
    };

    const handleSave = (updatedBusiness: BusinessOwner) => {
        setBusinessOwner(updatedBusiness);
        if (onUpdateBusiness) {
            onUpdateBusiness(updatedBusiness);
        }
        // Don't call updateUser for business owners - the business was already updated via /api/update-business
        toast.success("Business profile updated successfully!");
    };

    const bgColor = isDarkMode ? "#3a3a3a" : "#f9fafb";
    

    return (
        <div
            className="min-h-screen md:pl-6"
            style={{
                backgroundColor: bgColor,
                transition: "background-color 0.3s ease",
            }}
        >
            <div className="max-w-5xl mx-auto px-4 py-8">
                <Card
                    className="p-8 mb-6"
                    style={{
                        backgroundColor: isDarkMode ? "#2a2a2a" : "#ffffff",
                        color: isDarkMode ? "#ffffff" : "#000000",
                        transition:
                            "background-color 0.3s ease, color 0.3s ease",
                    }}
                >
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <Avatar className="w-24 h-24 flex-shrink-0">
                            {businessOwner.wallpaper && (
                                <AvatarImage
                                    src={businessOwner.wallpaper}
                                    alt={businessOwner.businessName}
                                    className="object-cover"
                                />
                            )}
                            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                                {getInitials(businessOwner.businessName)}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-3xl mb-2 break-words">
                                        {businessOwner.businessName}
                                    </h1>
                                    <div className="flex flex-col gap-2 text-muted-foreground">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-4 h-4 flex-shrink-0 mt-1" />
                                            <span className="break-words">
                                                {businessOwner.address}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 flex-shrink-0" />
                                            <span className="break-all">
                                                {businessOwner.businessEmail}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 flex-shrink-0" />
                                            <span>{businessOwner.phone}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsEditDialogOpen(true)}
                                    className={`flex-shrink-0 ${
                                        isDarkMode
                                            ? "border-white/20 text-white hover:bg-white/10"
                                            : "text-foreground"
                                    }`}
                                >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit Profile
                                </Button>
                            </div>

                            {businessOwner.description && (
                                <>
                                    <Separator className="my-4" />
                                    <p className="text-muted-foreground break-words">
                                        {businessOwner.description}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </Card>

                <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card
                            className="p-6"
                            style={{
                                backgroundColor: isDarkMode
                                    ? "#2a2a2a"
                                    : "#ffffff",
                                color: isDarkMode ? "#ffffff" : "#000000",
                            }}
                        >
                            <h2 className="mb-4">Business Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                        <DollarSign className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-sm">
                                            Price Tier
                                        </span>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                                        className={`${
                                                            isDarkMode
                                                                ? "bg-[#3a3a3a] text-white"
                                                                : ""
                                                        } justify-start py-2 px-3 h-auto`}
                                    >
                                        {businessOwner.priceTier}
                                    </Badge>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                        <Clock className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-sm">
                                            Operating Days
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                    {businessOwner.open247 ? (
                                        <Badge
                                            variant="secondary"
                                            className={`${
                                                isDarkMode
                                                    ? "bg-[#3a3a3a] text-white"
                                                    : ""
                                            } justify-start py-2 px-3 h-auto`}
                                            style={{
                                            justifyContent: "start",
                                            whiteSpace: "normal",
                                            wordBreak: "break-word",
                                            textAlign: "left",
                                            lineHeight: "1.4",
                                            }}
                                        >
                                            Open 24/7
                                        </Badge>
                                        ) : (
                                            Object.keys(businessOwner.openingHours || {})
                                            .sort((a, b) => DAYSOFWEEK.indexOf(a) - DAYSOFWEEK.indexOf(b))
                                            .map((day) => (
                                              <Badge
                                                key={day}
                                                variant="secondary"
                                                className={`${
                                                    isDarkMode
                                                        ? "bg-[#3a3a3a] text-white"
                                                        : ""
                                                } justify-start py-2 px-3 h-auto`}
                                                style={{
                                                  justifyContent: "start",
                                                  whiteSpace: "normal",
                                                  wordBreak: "break-word",
                                                  textAlign: "left",
                                                  lineHeight: "1.4",
                                                }}
                                              >
                                                {day}: {businessOwner.openingHours[day]?.open} - {businessOwner.openingHours[day]?.close}
                                              </Badge>
                                            ))
                                        )}
                                        </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="mb-3">Service Options</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            <span
                                                className={
                                                    businessOwner.offersDelivery
                                                        ? ""
                                                        : "text-muted-foreground line-through"
                                                }
                                            >
                                                Delivery{" "}
                                                {businessOwner.offersDelivery
                                                    ? "✓"
                                                    : "✗"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ShoppingBag className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            <span
                                                className={
                                                    businessOwner.offersPickup
                                                        ? ""
                                                        : "text-muted-foreground line-through"
                                                }
                                            >
                                                Pickup{" "}
                                                {businessOwner.offersPickup
                                                    ? "✓"
                                                    : "✗"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card
                            className="p-6"
                            style={{
                                backgroundColor: isDarkMode
                                    ? "#2a2a2a"
                                    : "#ffffff",
                                color: isDarkMode ? "#ffffff" : "#000000",
                            }}
                        >
                            <h2 className="mb-4">Contact & Links</h2>
                            <div className="space-y-4">
                                {businessOwner.website && (
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                            <Globe className="w-4 h-4 flex-shrink-0" />
                                            <span className="text-sm">
                                                Website
                                            </span>
                                        </div>
                                        <a
                                            href={businessOwner.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline break-all block"
                                        >
                                            {businessOwner.website}
                                        </a>
                                    </div>
                                )}

                                {businessOwner.socialMedia && (
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                            <Instagram className="w-4 h-4 flex-shrink-0" />
                                            <span className="text-sm">
                                                Social Media
                                            </span>
                                        </div>
                                        <a
                                            href={businessOwner.socialMedia}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline break-all block"
                                        >
                                            {businessOwner.socialMedia}
                                        </a>
                                    </div>
                                )}

                                <Separator />

                                <div>
                                    <div className="flex items-center gap-2 text-muted-foreground mb-3">
                                        <CreditCard className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-sm">
                                            Payment Options
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {businessOwner.paymentOptions &&
                                            businessOwner.paymentOptions.map(
                                                (payment) => (
                                                    <Badge
                                                        key={payment}
                                                        variant="secondary"
                                                        className={`${
                                                            isDarkMode
                                                                ? "bg-[#3a3a3a] text-white"
                                                                : ""
                                                        } justify-start py-2 px-3 h-auto`}
                                                        style={{
                                                            whiteSpace:
                                                                "normal",
                                                            wordBreak:
                                                                "break-word",
                                                            textAlign: "left",
                                                            lineHeight: "1.4",
                                                        }}
                                                    >
                                                        {payment}
                                                    </Badge>
                                                ),
                                            )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {businessOwner.wallpaper && (
                        <Card
                            className="p-6"
                            style={{
                                backgroundColor: isDarkMode
                                    ? "#2a2a2a"
                                    : "#ffffff",
                                color: isDarkMode ? "#ffffff" : "#000000",
                            }}
                        >
                            <h2 className="mb-4">Business Wallpaper</h2>
                            <div className="rounded-lg overflow-hidden">
                                <img
                                    src={businessOwner.wallpaper}
                                    alt={`${businessOwner.businessName} wallpaper`}
                                    className="w-full h-64 object-cover"
                                />
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {businessOwner && (
                <EditBusinessProfileDialog
                    businessOwner={businessOwner}
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}
