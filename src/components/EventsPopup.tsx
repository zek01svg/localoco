import { Calendar, MapPin, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useThemeStore } from "../store/themeStore";
import { useEffect, useState } from "react";

interface Announcement {
    announcementId: number;
    businessUen: string;
    title: string;
    content: string;
    imageUrl?: string;
    createdAt: string;
}

interface EventsPopupProps {
    open: boolean;
    onClose: () => void;
}

export function EventsPopup({ open, onClose }: EventsPopupProps) {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchAnnouncements();
        }
    }, [open]);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const response = await fetch("api/newsletter");
            if (!response.ok) throw new Error("Failed to fetch");
            const data = await response.json();
            setAnnouncements(data || []);
        } catch (error) {
            console.error("Error fetching announcements:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    const cardBgColor = isDarkMode ? "#2a2a2a" : "#ffffff";
    const textColor = isDarkMode ? "text-white" : "text-black";
    const mutedTextColor = isDarkMode
        ? "text-gray-400"
        : "text-muted-foreground";
    const borderColor = isDarkMode ? "border-gray-700" : "border-gray-200";
    const hoverBgColor = isDarkMode
        ? "hover:bg-gray-700/50"
        : "hover:bg-muted/50";

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card
                className={`w-full max-w-2xl max-h-[80vh] overflow-hidden ${borderColor}`}
                style={{ backgroundColor: cardBgColor }}
            >
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle
                            className={`flex items-center gap-2 ${textColor}`}
                        >
                            <Calendar className="w-5 h-5 text-primary" />
                            Latest Events & Announcements
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className={`h-8 w-8 p-0 ${textColor}`}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                    {loading && (
                        <div className={`text-center py-8 ${mutedTextColor}`}>
                            Loading announcements...
                        </div>
                    )}

                    {!loading &&
                        announcements.map((announcement) => (
                            <div
                                key={announcement.announcementId}
                                className={`flex gap-4 p-4 rounded-lg ${borderColor} ${hoverBgColor} cursor-pointer transition-colors`}
                                style={{ borderWidth: "1px" }}
                            >
                                {announcement.imageUrl && (
                                    <ImageWithFallback
                                        src={
                                            announcement.imageUrl.includes(
                                                "localhost",
                                            ) ||
                                            announcement.imageUrl.includes(
                                                "azurewebsites.net",
                                            )
                                                ? announcement.imageUrl.replace(
                                                      /https?:\/\/(localhost:\d+|[^/]*azurewebsites\.net)\//,
                                                      "https://localoco.blob.core.windows.net/images/",
                                                  )
                                                : announcement.imageUrl.startsWith(
                                                        "http",
                                                    )
                                                  ? announcement.imageUrl
                                                  : `https://localoco.blob.core.windows.net/images/${announcement.imageUrl}`
                                        }
                                        alt={announcement.title}
                                        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                    />
                                )}

                                <div className="flex-1 space-y-2">
                                    <div className="flex items-start justify-between">
                                        <h4
                                            className={`font-medium line-clamp-2 ${textColor}`}
                                        >
                                            {announcement.title}
                                        </h4>
                                        <Badge
                                            variant="default"
                                            className="bg-red-500 text-white text-xs"
                                        >
                                            NEW
                                        </Badge>
                                    </div>

                                    <p
                                        className={`text-sm ${mutedTextColor} line-clamp-2`}
                                    >
                                        {announcement.content}
                                    </p>

                                    <div
                                        className={`flex items-center justify-between text-xs ${mutedTextColor}`}
                                    >
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            <span>
                                                {formatDate(
                                                    announcement.createdAt,
                                                )}
                                            </span>
                                        </div>

                                        {announcement.businessUen && (
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                <span>
                                                    {announcement.businessUen}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                    {!loading && announcements.length === 0 && (
                        <div className="text-center py-8">
                            <Calendar
                                className={`w-12 h-12 ${mutedTextColor} mx-auto mb-3`}
                            />
                            <p className={mutedTextColor}>
                                No announcements at the moment
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
