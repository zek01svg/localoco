// src/components/pages/LoginPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Store, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useAuthStore } from "../../store/authStore";
import { useThemeStore } from "../../store/themeStore";
import { authClient } from "../../lib/authClient";
import { ROUTES } from "../../constants/routes";
import { url } from "../../constants/url";

export function LoginPage() {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const isDarkMode = useThemeStore((state) => state.isDarkMode);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Use reactive session hook
    const { data: session, isPending } = authClient.useSession();

    const headerBgColor = isDarkMode ? "#3a3a3a" : "#ffffff";
    const headerTextColor = isDarkMode ? "#ffffff" : "#000000";
    const bgColor = isDarkMode
        ? "#3a3a3a"
        : "bg-gradient-to-br from-pink-50 via-pink-100 to-orange-50";
    const cardBgColor = isDarkMode ? "#2a2a2a" : "#ffffff";
    const textColor = isDarkMode ? "#ffffff" : "#000000";
    const mutedTextColor = isDarkMode ? "#a1a1aa" : "#6b7280";

    // Automatically redirect if session exists (important for Google OAuth callback)
    useEffect(() => {
        if (!isPending && session?.user && session?.session) {
            console.log(
                "✅ Session detected on login page, redirecting to map",
            );
            const userId = session.user.id;
            const accessToken = session.session.token;
            login(userId, "user", accessToken);
            navigate("/map", { replace: true });
        }
    }, [session, isPending, login, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        console.log("🎯 handleSubmit called!", {
            email,
            password: password ? "***" : "empty",
        });
        e.preventDefault();
        setError(null);

        // Basic validation
        if (!email.trim() || !password.trim()) {
            console.log("❌ Validation failed: Empty fields");
            setError("Please fill in all fields.");
            return;
        }
        if (!email.includes("@")) {
            setError("Please enter a valid email address.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        // Real login using better-auth - everyone is a user
        try {
            console.log("🔐 Logging in with better-auth:", { email });

            const { data, error } = await authClient.signIn.email({
                email,
                password,
                callbackURL: url,
            });

            console.log("📨 SignIn response:", { data, error });

            if (error) {
                console.error("❌ Login error:", error);
                setError(
                    error.message ||
                        "Invalid email or password. Please try again.",
                );
                return;
            }

            // Session will be automatically detected by useSession hook
            // and the useEffect above will handle the redirect
            console.log("✅ Login successful, waiting for session sync...");
        } catch (err) {
            console.error("❌ Unexpected login error:", err);
            setError("An unexpected error occurred. Please try again.");
        }
    };

    const handleGoogleLogin = async () => {
        try {
            console.log("🔐 Logging in with Google");

            const { data, error } = await authClient.signIn.social({
                provider: "google",
                callbackURL: url,
            });

            if (error) {
                console.error("Google login error:", error);
                setError(
                    error.message || "Google login failed. Please try again.",
                );
                return;
            }

            // Google OAuth will handle the redirect
            // Session will be established after redirect back from Google
        } catch (err) {
            console.error("Unexpected Google login error:", err);
            setError("An unexpected error occurred with Google login.");
        }
    };

    const handleBack = () => {
        navigate("/");
    };

    return (
        <div
            className={`min-h-screen relative ${
                !isDarkMode
                    ? "bg-gradient-to-br from-pink-50 via-pink-100 to-orange-50"
                    : ""
            }`}
            style={isDarkMode ? { backgroundColor: bgColor } : {}}
        >
            {/* Background pattern */}
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

            {/* Login Form */}
            <div className="flex items-center justify-center min-h-[calc(100vh-100px)] p-4 relative z-10">
                <div className="w-full max-w-md">
                    <div
                        className="rounded-lg shadow-lg p-8 space-y-6"
                        style={{
                            backgroundColor: cardBgColor,
                            color: textColor,
                        }}
                    >
                        <h2 className="text-2xl font-bold text-center mb-2">
                            Welcome Back
                        </h2>

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError(null);
                                }}
                                required
                                className="bg-input-background"
                            />
                        </div>

                        {/* Password and Error */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError(null);
                                }}
                                required
                                className="bg-input-background"
                            />
                            {/* Error directly below password field */}
                            {error && (
                                <div
                                    className="flex items-center gap-2 mt-2"
                                    style={{ color: "#d4183d" }}
                                >
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <p className="text-sm">{error}</p>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            className="w-full bg-primary hover:bg-primary/90"
                        >
                            Log in
                        </Button>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span
                                    className="w-full border-t"
                                    style={{
                                        borderColor: isDarkMode
                                            ? "#525252"
                                            : "#e5e7eb",
                                    }}
                                />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span
                                    className="px-2"
                                    style={{
                                        backgroundColor: cardBgColor,
                                        color: mutedTextColor,
                                    }}
                                >
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        {/* Google Login Button */}
                        <Button
                            type="button"
                            onClick={handleGoogleLogin}
                            variant="outline"
                            className="w-full flex items-center justify-center gap-2 relative z-10 cursor-pointer"
                            style={{
                                backgroundColor: isDarkMode
                                    ? "#3a3a3a"
                                    : "#ffffff",
                                color: textColor,
                                borderColor: isDarkMode ? "#525252" : "#e5e7eb",
                                pointerEvents: "auto",
                            }}
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 48 48"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    fill="#FFC107"
                                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                                />
                                <path
                                    fill="#FF3D00"
                                    d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                                />
                                <path
                                    fill="#4CAF50"
                                    d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                                />
                                <path
                                    fill="#1976D2"
                                    d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                                />
                            </svg>
                            <span>Sign in with Google</span>
                        </Button>

                        {/* Links */}
                        <div className="text-center space-y-2">
                            <button
                                type="button"
                                className="text-sm underline text-foreground hover:text-primary"
                                onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}
                            >
                                Forgot password?
                            </button>
                        </div>

                        {/* Sign Up Link */}
                        <div className="text-center pt-2">
                            <span
                                className="text-sm"
                                style={{ color: mutedTextColor }}
                            >
                                New to us?{" "}
                            </span>
                            <button
                                type="button"
                                className="text-sm font-medium text-primary hover:underline"
                                onClick={() => navigate("/signup")}
                            >
                                Sign up here
                            </button>
                        </div>

                        {/* Back Button */}
                        <div className="text-center pt-2">
                            <button
                                type="button"
                                className="text-sm text-muted-foreground hover:text-foreground"
                                onClick={handleBack}
                            >
                                Back to home
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
