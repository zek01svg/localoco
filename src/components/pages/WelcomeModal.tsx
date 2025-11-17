import React from "react";
import { X, Store } from "lucide-react";
import { Button } from "../ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../ui/dialog";
import { useThemeStore } from "../../store/themeStore";

interface WelcomeModalProps {
    open: boolean;
    onClose: () => void;
    onLogin: () => void;
    onSignUp: () => void;
}

export function WelcomeModal({
    open,
    onClose,
    onLogin,
    onSignUp,
}: WelcomeModalProps) {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);

    const headerBgColor = isDarkMode ? "#3a3a3a" : "#ffffff";
    const headerTextColor = isDarkMode ? "#ffffff" : "#000000";

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-orange-50 relative">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
                <svg
                    width="100%"
                    height="100%"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <pattern
                            id="grid"
                            width="40"
                            height="40"
                            patternUnits="userSpaceOnUse"
                        >
                            <path
                                d="M 40 0 L 0 0 0 40"
                                fill="none"
                                stroke="#FFA1A3"
                                strokeWidth="1"
                            />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>

            {/* Header */}
            <header
                className="shadow-md relative z-10"
                style={{
                    backgroundColor: headerBgColor,
                    color: headerTextColor,
                }}
            >
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary rounded-lg">
                            <Store className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl">LocaLoco</h1>
                            <p className="text-sm opacity-90">
                                Discover and support local businesses in your
                                community - or nearby you!
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-md">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </button>

                    <DialogHeader>
                        <DialogTitle className="text-center text-primary">
                            Do you have a pre-existing account here?
                        </DialogTitle>
                        <DialogDescription className="text-center text-muted-foreground">
                            If not, sign up now to support local businesses with
                            us!
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={onLogin}
                                className="flex-1 text-foreground"
                            >
                                Log in
                            </Button>
                            <Button
                                onClick={onSignUp}
                                className="flex-1 text-white"
                                style={{ backgroundColor: "#3a3a3a" }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "#2a2a2a")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor =
                                        "#3a3a3a")
                                }
                            >
                                Sign Up
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
