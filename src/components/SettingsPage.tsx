import React, { useState } from "react";
import { Moon, Sun, Trash2, LogOut } from "lucide-react";
import { Card } from "./ui/card";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { useAuth } from "../hooks/useAuth"; // This hook is correct
import { useNavigate } from "react-router-dom";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./ui/alert-dialog";
import { toast } from "sonner";
import { useThemeStore } from "../store/themeStore";
import { useAuthStore } from "../store/authStore"; // We need this for role, token, and UEN
import { url } from "../constants/url";

interface SettingsPageProps {
    onBack?: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    const toggleTheme = useThemeStore((state) => state.toggleTheme);
    
    // --- FIX: Destructure session and logout from useAuth ---
    const { logout, session } = useAuth();
    // The user object is inside the session
    const user = session?.user; 
    
    const navigate = useNavigate();
    
    // --- FIX: Get role, token, and business UEN from the auth store ---
    const role = useAuthStore((state) => state.role);
    const token = useAuthStore((state) => state.accessToken);
    const businessUen = useAuthStore((state) => state.businessMode.currentBusinessUen);

    const onThemeToggle = (checked: boolean) => {
        toggleTheme();
    };

    const handleSignOut = () => {
        logout();
        toast.success("Signed out successfully");
        navigate("/login"); // Redirect to login
    };

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const bgColor = isDarkMode ? "#3a3a3a" : "#f9fafb";
    const cardBg = isDarkMode ? "#2a2a2a" : "#ffffff";
    const textColor = isDarkMode ? "#ffffff" : "#000000";

    const handleDeleteAccount = async () => {
        try {
            const endpoint =
                role === "business"
                    ? "/api/delete-business"
                    : "/api/user/delete-profile";

            let payload;
            // --- FIX: Use businessUen for business role, user.id for user role ---
            if (role === "business") {
                if (!businessUen) {
                    toast.error("Business UEN not found. Cannot delete account.");
                    return;
                }
                payload = { uen: businessUen };
            } else {
                if (!user?.id) {
                    toast.error("User ID not found. Cannot delete account.");
                    return;
                }
                payload = { userId: user.id };
            }

            // --- FIX: Add the 'url' prefix and Authorization header ---
            const response = await fetch(`${url}${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // Add Authorization header
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify(payload), // Send the correct payload
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete account");
            }

            toast.success("Account deleted successfully");
            logout();
            navigate("/login"); // redirect to login page
        } catch (error: any) { // <-- Set type to any to access error.message
            console.error("Delete account error:", error); // Log the error
            toast.error(error.message || "Failed to delete account. Please try again.");
        } finally {
            setShowDeleteDialog(false);
        }
    };

    return (
        <div
            className="min-h-screen md:pl-6"
            style={{ backgroundColor: bgColor }}
        >
            <div className="max-w-3xl mx-auto px-4 py-4">
                <div className="mb-3">
                    <h1 className="text-3xl" style={{ color: textColor }}>
                        Settings
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Manage your account settings and preferences
                    </p>
                </div>

                <div className="space-y-3">
                    <Card
                        className="p-3"
                        style={{ backgroundColor: cardBg, color: textColor }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-primary rounded-lg">
                                {isDarkMode ? (
                                    <Sun className="w-4 h-4 text-white" />
                                ) : (
                                    <Moon className="w-4 h-4 text-white" />
                                )}
                            </div>
                            <h2 className="text-lg">Appearance</h2>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm">Dark Mode</Label>
                                <p className="text-xs text-muted-foreground">
                                    Toggle between light and dark theme
                                </p>
                            </div>
                            <Switch
                                checked={isDarkMode}
                                onCheckedChange={onThemeToggle}
                            />
                        </div>
                    </Card>

                    <Card
                        className="p-3"
                        style={{ backgroundColor: cardBg, color: textColor }}
                    >
                        <h3
                            className="text-lg mb-2"
                            style={{ color: textColor }}
                        >
                            Account Actions
                        </h3>
                        <div className="space-y-2">
                            <Button
                                variant="outline"
                                onClick={handleSignOut}
                                className={`w-full justify-between h-9 ${isDarkMode ? "bg-[#FFA1A3]/10 text-[#FFA1A3] border-[#FFA1A3]/30 hover:bg-[#FFA1A3]/20" : "text-[#FFA1A3] border-[#FFA1A3]/30 hover:bg-[#FFA1A3]/10"}`}
                            >
                                Sign Out
                                <LogOut className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowDeleteDialog(true)}
                                className={`w-full justify-between h-9 border-destructive hover:bg-destructive hover:text-white ${isDarkMode ? "bg-destructive/10 text-destructive" : "text-destructive"}`}
                            >
                                Delete Account
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
            >
                <AlertDialogContent
                    style={{
                        backgroundColor: cardBg,
                        color: textColor,
                        borderColor: isDarkMode ? "#404040" : "#e5e7eb",
                    }}
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle
                            className="flex items-center gap-2"
                            style={{ color: textColor }}
                        >
                            <Trash2 className="w-5 h-5 text-destructive" />
                            Delete Account
                        </AlertDialogTitle>
                        <AlertDialogDescription
                            className={
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                            }
                        >
                            This action cannot be undone. This will permanently
                            delete your account and remove all your data from
                            our servers including:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>Your profile and reviews</li>
                                <li>Saved bookmarks and vouchers</li>
                                <li>Loyalty points and rewards</li>
                                <li>Forum posts and comments</li>
                            </ul>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className={
                                isDarkMode
                                    ? "bg-[#3a3a3a] text-white border-white/20 hover:bg-[#404040]"
                                    : ""
                            }
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteAccount}
                            className="bg-destructive hover:bg-destructive/90 text-white"
                        >
                            Delete Account
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}