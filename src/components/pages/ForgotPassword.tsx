import React, { useState } from "react";
import { Store, Mail, ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { useThemeStore } from "../../store/themeStore";
import { authClient } from "../../lib/authClient";
import { url } from "../../constants/url";

interface ForgotPasswordPageProps {
    onBack: () => void;
    onEmailSent: (email: string) => void;
}

// 2. Define the URL your backend will send in the reset email.
// This URL must point to your React app's reset password page.
const redirectTo = `${url}/reset-password`;

export function ForgotPasswordPage({
    onBack,
    onEmailSent,
}: ForgotPasswordPageProps) {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isDarkMode = useThemeStore((state) => state.isDarkMode);

    const headerBgColor = isDarkMode ? "#3a3a3a" : "#ffffff";
    const headerTextColor = isDarkMode ? "#ffffff" : "#000000";
    const bgColor = isDarkMode ? "#3a3a3a" : "";
    const cardBgColor = isDarkMode ? "#2a2a2a" : "#ffffff";
    const textColor = isDarkMode ? "#ffffff" : "#000000";
    const mutedTextColor = isDarkMode ? "#a1a1aa" : "#6b7280";

    // 3. Update the handleSubmit function
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim() || !email.includes("@")) {
            toast.error("Please enter a valid email address");
            return;
        }

        setIsSubmitting(true);

        try {
            const { data, error } = await authClient.requestPasswordReset({
                email: email,
                redirectTo: "/password-reset",
            });

            if (error) {
                console.error("Password reset request failed:", error);
                toast.success(
                    "If an account exists for this email, a reset link has been sent.",
                );
                setIsSubmitting(false);
                onEmailSent(email);
                return;
            }

            if (data) {
                console.log("Password reset link sent successfully");
                toast.success(
                    "Password reset link sent! Please check your inbox.",
                );
                setIsSubmitting(false);
                onEmailSent(email);
            }
        } catch (err) {
            console.error("An unexpected error occurred:", err);
            toast.success(
                "If an account exists for this email, a reset link has been sent.",
            );
            setIsSubmitting(false);
            onEmailSent(email);
        }
    };

    // ✅ THIS IS THE JSX THAT NEEDS TO BE RETURNED
    return (
        <div
            className={`min-h-screen relative ${!isDarkMode ? "bg-gradient-to-br from-pink-50 via-pink-100 to-orange-50" : ""}`}
            style={isDarkMode ? { backgroundColor: bgColor } : {}}
        >
            {!isDarkMode && (
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
            )}

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

            <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-4 relative z-10">
                <div className="w-full max-w-md">
                    <form
                        onSubmit={handleSubmit}
                        className="rounded-lg shadow-lg p-8 space-y-6"
                        style={{
                            backgroundColor: cardBgColor,
                            color: textColor,
                        }}
                    >
                        <div className="text-center space-y-2">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                                <Mail className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-2xl">Forgot Password?</h2>
                            <p
                                className="text-sm"
                                style={{ color: mutedTextColor }}
                            >
                                No worries! Enter your registered email address
                                and we'll send you a link to reset your
                                password.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your registered email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-input-background"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Sending..." : "Send Reset Link"}
                        </Button>

                        <div className="text-center pt-4">
                            <button
                                type="button"
                                className="text-sm hover:text-foreground flex items-center gap-2 mx-auto"
                                style={{ color: mutedTextColor }}
                                onClick={onBack}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to login
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
