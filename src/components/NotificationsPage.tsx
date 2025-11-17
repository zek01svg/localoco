import { useState } from "react";
import {
    Bell,
    Star,
    MessageCircle,
    Calendar,
    TrendingUp,
    Check,
    Trash2,
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useThemeStore } from "../store/themeStore";

interface NotificationsPageProps {
    onBack?: () => void;
}

interface Notification {
    id: string;
    type: "review" | "event" | "forum" | "system";
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    icon: any;
}

export function NotificationsPage({ onBack }: NotificationsPageProps) {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            id: "1",
            type: "review",
            title: "New Review on Local Cafe",
            message: "Someone just reviewed a business you bookmarked",
            timestamp: "2 minutes ago",
            read: false,
            icon: Star,
        },
        {
            id: "2",
            type: "event",
            title: "Upcoming Event: Food Festival",
            message: "The Downtown Food Festival starts tomorrow!",
            timestamp: "1 hour ago",
            read: false,
            icon: Calendar,
        },
        {
            id: "3",
            type: "forum",
            title: "Reply to your post",
            message: "Alex replied to your forum discussion about local shops",
            timestamp: "3 hours ago",
            read: true,
            icon: MessageCircle,
        },
        {
            id: "4",
            type: "system",
            title: "You earned 50 loyalty points!",
            message: "Keep exploring to unlock more rewards",
            timestamp: "1 day ago",
            read: true,
            icon: TrendingUp,
        },
        {
            id: "5",
            type: "review",
            title: "Business responded to your review",
            message: "The owner of Sunset Grill thanked you for your feedback",
            timestamp: "2 days ago",
            read: true,
            icon: Star,
        },
    ]);

    const bgColor = isDarkMode ? "#3a3a3a" : "#f9fafb";
    const cardBg = isDarkMode ? "#2a2a2a" : "#ffffff";
    const textColor = isDarkMode ? "#ffffff" : "#000000";

    const unreadCount = notifications.filter((n) => !n.read).length;

    const handleMarkAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((notif) =>
                notif.id === id ? { ...notif, read: true } : notif,
            ),
        );
    };

    const handleMarkAllAsRead = () => {
        setNotifications((prev) =>
            prev.map((notif) => ({ ...notif, read: true })),
        );
    };

    const handleDelete = (id: string) => {
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    };

    const unreadNotifications = notifications.filter((n) => !n.read);
    const readNotifications = notifications.filter((n) => n.read);

    const getTypeColor = (type: string) => {
        switch (type) {
            case "review":
                return "bg-yellow-500";
            case "event":
                return "bg-blue-500";
            case "forum":
                return "bg-purple-500";
            case "system":
                return "bg-green-500";
            default:
                return "bg-gray-500";
        }
    };

    const NotificationCard = ({
        notification,
    }: {
        notification: Notification;
    }) => {
        const Icon = notification.icon;

        return (
            <Card
                className={`p-4 ${notification.read ? "opacity-60" : ""}`}
                style={{ backgroundColor: cardBg, color: textColor }}
            >
                <div className="flex gap-4">
                    <div
                        className={`p-3 rounded-full ${getTypeColor(notification.type)} flex-shrink-0`}
                    >
                        <Icon className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="text-sm">{notification.title}</h3>
                            {!notification.read && (
                                <Badge className="bg-primary text-white hover:bg-primary text-xs flex-shrink-0">
                                    New
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {notification.timestamp}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                        {!notification.read && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                    handleMarkAsRead(notification.id)
                                }
                                className={
                                    isDarkMode ? "hover:bg-white/10" : ""
                                }
                            >
                                <Check className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(notification.id)}
                            className={
                                isDarkMode
                                    ? "hover:bg-white/10 text-destructive"
                                    : "text-destructive"
                            }
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <div
            className="min-h-screen md:pl-6"
            style={{
                backgroundColor: bgColor,
            }}
        >
            <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex flex-col gap-3 mb-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-2 bg-primary rounded-lg">
                                <Bell className="w-6 h-6 text-white" />
                            </div>
                            <h1
                                className="text-2xl sm:text-3xl"
                                style={{ color: textColor }}
                            >
                                Notifications
                            </h1>
                            {unreadCount > 0 && (
                                <Badge className="bg-primary text-white hover:bg-primary whitespace-nowrap">
                                    {unreadCount} new
                                </Badge>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <Button
                                variant="outline"
                                onClick={handleMarkAllAsRead}
                                className={`w-full sm:w-auto sm:self-start ${isDarkMode ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20" : "text-foreground"}`}
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Mark all as read
                            </Button>
                        )}
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Stay updated with your activity
                    </p>
                </div>

                {/* Notifications List */}
                <Tabs defaultValue="all" className="w-full">
                    <TabsList
                        className="mb-6"
                        style={{
                            backgroundColor: isDarkMode ? "#2a2a2a" : undefined,
                        }}
                    >
                        <TabsTrigger
                            value="all"
                            className={
                                isDarkMode
                                    ? "data-[state=active]:bg-[#3a3a3a] data-[state=active]:text-white text-gray-400"
                                    : ""
                            }
                        >
                            All ({notifications.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="unread"
                            className={
                                isDarkMode
                                    ? "data-[state=active]:bg-[#3a3a3a] data-[state=active]:text-white text-gray-400"
                                    : ""
                            }
                        >
                            Unread ({unreadCount})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all">
                        {notifications.length > 0 ? (
                            <div className="space-y-3">
                                {notifications.map((notification) => (
                                    <NotificationCard
                                        key={notification.id}
                                        notification={notification}
                                    />
                                ))}
                            </div>
                        ) : (
                            <Card
                                className="p-12 text-center"
                                style={{
                                    backgroundColor: cardBg,
                                    color: textColor,
                                }}
                            >
                                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="mb-2">No notifications</h3>
                                <p className="text-muted-foreground">
                                    You're all caught up!
                                </p>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="unread">
                        {unreadNotifications.length > 0 ? (
                            <div className="space-y-3">
                                {unreadNotifications.map((notification) => (
                                    <NotificationCard
                                        key={notification.id}
                                        notification={notification}
                                    />
                                ))}
                            </div>
                        ) : (
                            <Card
                                className="p-12 text-center"
                                style={{
                                    backgroundColor: cardBg,
                                    color: textColor,
                                }}
                            >
                                <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                <h3 className="mb-2">
                                    No unread notifications
                                </h3>
                                <p className="text-muted-foreground">
                                    You've read everything!
                                </p>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
