import React, { useState, useRef, useEffect } from "react";
import { User } from "../../types/user";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useThemeStore } from "../../store/themeStore";
import { useAuthStore } from "../../store/authStore";
import { url } from "../../constants/url";

interface EditProfileDialogProps {
    user: User;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (updatedUser: User) => void;
}

export function EditProfileDialog({
    user,
    open,
    onOpenChange,
    onSave,
}: EditProfileDialogProps) {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    const setAvatarUrl = useAuthStore((state) => state.setAvatarUrl);
    const [formData, setFormData] = useState<User>(user);
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        user.avatarUrl || null,
    );
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isGoogleUser, setIsGoogleUser] = useState<boolean>(false);
    const [checkingProvider, setCheckingProvider] = useState<boolean>(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if user signed in with Google
    useEffect(() => {
        const checkAuthProvider = async () => {
            try {
                const response = await fetch(
                    `${url}/api/users/auth-provider/${user.id}`,
                );
                if (response.ok) {
                    const data = await response.json();
                    // If user has a Google account linked, they're a Google user
                    setIsGoogleUser(data.provider === "google");
                }
            } catch (error) {
                console.error("Error checking auth provider:", error);
                // Default to false (allow email editing) if check fails
                setIsGoogleUser(false);
            } finally {
                setCheckingProvider(false);
            }
        };

        if (open) {
            checkAuthProvider();
        }
    }, [user.id, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            const response = await fetch(`${url}/api/user/update-profile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userId: user.id,
                    name: formData.name,
                    email: formData.email,
                    imageUrl: formData.avatarUrl || null,
                    bio: formData.bio || "",
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update profile");
            }

            const result = await response.json();

            // Update local user object with new data
            const updatedUser = {
                ...user,
                name: result.name,
                email: result.email,
                avatarUrl: result.image,
                bio: result.bio || "",
            };

            setAvatarUrl(result.image || "");
            onSave(updatedUser);
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error updating profile:", error);
            setError(
                error.message || "Failed to update profile. Please try again.",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof User, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file");
            return;
        }

        // Validate file size (e.g., max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("Image size should be less than 5MB");
            return;
        }

        setUploading(true);

        try {
            // Step 1: Get upload URL from backend
            const urlResponse = await fetch(
                `${url}/api/url-generator?filename=${encodeURIComponent(file.name)}`,
            );
            if (!urlResponse.ok) {
                throw new Error("Failed to get upload URL");
            }
            const { uploadUrl, blobName } = await urlResponse.json();

            // Step 2: Upload file to Azure Blob Storage
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                    "x-ms-blob-type": "BlockBlob",
                    "Content-Type": file.type,
                },
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload image to storage");
            }

            // Step 3: Construct the permanent blob URL (without SAS token)
            const blobUrl = uploadUrl.split("?")[0]; // Remove SAS token from URL

            // Step 4: Set preview and update form data
            setPreviewUrl(blobUrl);
            setFormData((prev) => ({ ...prev, avatarUrl: blobUrl }));
            setUploading(false);
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image");
            setUploading(false);
        }
    };

    const handleRemoveAvatar = () => {
        setPreviewUrl(null);
        setFormData((prev) => ({ ...prev, avatarUrl: undefined }));
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Update your profile information. Click save when you're
                        done.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Error Message */}
                        {error && (
                            <div
                                className={`border px-4 py-3 rounded ${
                                    isDarkMode
                                        ? "bg-red-900/20 border-red-800 text-red-300"
                                        : "bg-red-50 border-red-200 text-red-700"
                                }`}
                            >
                                {error}
                            </div>
                        )}

                        {/* Avatar Upload Section */}
                        <div className="grid gap-2">
                            <Label>Profile Picture</Label>
                            <div className="flex items-center gap-4">
                                {/* Avatar Preview */}
                                <div
                                    className={`w-20 h-20 rounded-full flex items-center justify-center overflow-hidden ${
                                        isDarkMode
                                            ? "bg-gray-700"
                                            : "bg-gray-200"
                                    }`}
                                >
                                    {previewUrl ? (
                                        <img
                                            src={previewUrl}
                                            alt="Avatar preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Upload
                                            className={`w-8 h-8 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}
                                        />
                                    )}
                                </div>

                                {/* Upload/Remove Buttons */}
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={triggerFileInput}
                                        disabled={uploading}
                                    >
                                        {uploading
                                            ? "Uploading..."
                                            : previewUrl
                                              ? "Change"
                                              : "Upload"}
                                    </Button>
                                    {previewUrl && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleRemoveAvatar}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>

                                {/* Hidden File Input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                            <p
                                className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                            >
                                Recommended: Square image, max 5MB
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) =>
                                    handleChange("name", e.target.value)
                                }
                                placeholder="Your name"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                    handleChange("email", e.target.value)
                                }
                                placeholder="your.email@example.com"
                                disabled={checkingProvider || isGoogleUser}
                            />
                            {checkingProvider ? (
                                <p
                                    className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                >
                                    Checking account type...
                                </p>
                            ) : isGoogleUser ? (
                                <p
                                    className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                >
                                    Email cannot be changed for Google accounts
                                </p>
                            ) : (
                                <p
                                    className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                                >
                                    You can update your email address
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                value={formData.location || ""}
                                onChange={(e) =>
                                    handleChange("location", e.target.value)
                                }
                                placeholder="Your location"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="bio">Bio</Label>
                            <Textarea
                                id="bio"
                                value={formData.bio || ""}
                                onChange={(e) =>
                                    handleChange("bio", e.target.value)
                                }
                                placeholder="Tell us about yourself..."
                                rows={4}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={uploading || saving}>
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
