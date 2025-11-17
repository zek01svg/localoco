import React, { useState, useEffect } from "react";
import { Store, Lock, Check, X, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { useThemeStore } from "../../store/themeStore";
import { authClient } from "../../lib/authClient"; // Ensure this path is correct

// Define the component's props
interface ResetPasswordPageProps {
    email: string; // The user's email, can be passed for display purposes
    onSuccess: () => void; // A callback function to run on successful password reset
}

// Define the structure for password validation checks
interface PasswordValidation {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
    passwordsMatch: boolean;
}

export function ResetPasswordPage({
    email,
    onSuccess,
}: ResetPasswordPageProps) {
    // --- STATE MANAGEMENT ---
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [touched, setTouched] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    const isDarkMode = useThemeStore((state) => state.isDarkMode);

    // --- GET TOKEN FROM URL ---
    // This hook runs once when the component is first rendered.
    // It reads the 'token' from the URL's query parameters.
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get("token");
        if (urlToken) {
            setToken(urlToken);
        } else {
            toast.error("Invalid or missing password reset token.");
            // Optional: You could navigate the user away if no token is found.
        }
    }, []); // The empty array [] ensures this effect runs only once.

    // --- THEME & VALIDATION ---
    const headerBgColor = isDarkMode ? "#3a3a3a" : "#ffffff";
    const headerTextColor = isDarkMode ? "#ffffff" : "#000000";
    const bgColor = isDarkMode ? "#3a3a3a" : "";
    const cardBgColor = isDarkMode ? "#2a2a2a" : "#ffffff";
    const textColor = isDarkMode ? "#ffffff" : "#000000";
    const mutedTextColor = isDarkMode ? "#a1a1aa" : "#6b7280";
    const validationBgColor = isDarkMode ? "#3a3a3a" : "#f9fafb";

    const validation: PasswordValidation = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        passwordsMatch: password === confirmPassword && password.length > 0,
    };
    const isValid = Object.values(validation).every((v) => v === true);

    // --- FORM SUBMISSION ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);

        if (!isValid || !token) {
            toast.error(
                token
                    ? "Please fix all validation errors."
                    : "Reset token is missing.",
            );
            return;
        }

        setIsSubmitting(true);

        try {
            const { data, error } = await authClient.resetPassword({
                token: token,
                newPassword: password,
            });

            if (error) {
                toast.error(
                    error.message ||
                        "Failed to reset password. The link may have expired.",
                );
                setIsSubmitting(false);
                return;
            }

            if (data) {
                toast.success("Password has been reset successfully!");
                onSuccess(); // Triggers navigation provided by the parent component
            }
        } catch (err) {
            console.error(err);
            toast.error("An unexpected error occurred.");
            setIsSubmitting(false);
        }
    };

    // Helper component for displaying validation criteria
    const ValidationItem = ({
        isValid,
        text,
    }: {
        isValid: boolean;
        text: string;
    }) => (
        <div className="flex items-center gap-2 text-sm">
            {isValid ? (
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
                <X className="w-4 h-4 text-red-500 flex-shrink-0" />
            )}
            <span
                style={{
                    color: isValid
                        ? isDarkMode
                            ? "#4ade80"
                            : "#16a34a"
                        : mutedTextColor,
                }}
            >
                {text}
            </span>
        </div>
    );

    // --- RENDER ---
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
                                <Lock className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">
                                Reset Your Password
                            </h2>
                            <p
                                className="text-sm"
                                style={{ color: mutedTextColor }}
                            >
                                Create a new password for{" "}
                                <span
                                    className="font-medium"
                                    style={{ color: textColor }}
                                >
                                    {email}
                                </span>
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter new password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    onBlur={() => setTouched(true)}
                                    required
                                    className="bg-input-background pl-10"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">
                                Confirm Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    placeholder="Re-enter new password"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    onBlur={() => setTouched(true)}
                                    required
                                    className="bg-input-background pl-10"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            !showConfirmPassword,
                                        )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {touched && password.length > 0 && (
                            <div
                                className="rounded-lg p-4 space-y-2"
                                style={{ backgroundColor: validationBgColor }}
                            >
                                <p
                                    className="text-sm mb-2"
                                    style={{ color: textColor }}
                                >
                                    Password must contain:
                                </p>
                                <ValidationItem
                                    isValid={validation.minLength}
                                    text="At least 8 characters"
                                />
                                <ValidationItem
                                    isValid={validation.hasUppercase}
                                    text="At least one uppercase letter (A-Z)"
                                />
                                <ValidationItem
                                    isValid={validation.hasLowercase}
                                    text="At least one lowercase letter (a-z)"
                                />
                                <ValidationItem
                                    isValid={validation.hasNumber}
                                    text="At least one number (0-9)"
                                />
                                <ValidationItem
                                    isValid={validation.hasSymbol}
                                    text="At least one symbol (!@#$%^&*...)"
                                />
                                {confirmPassword.length > 0 && (
                                    <ValidationItem
                                        isValid={validation.passwordsMatch}
                                        text="Passwords match"
                                    />
                                )}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90"
                            disabled={isSubmitting || (touched && !isValid)}
                        >
                            {isSubmitting
                                ? "Resetting Password..."
                                : "Reset Password"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
