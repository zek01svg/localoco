import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, Edit, Trash2, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "./ui/dialog";
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
import { Announcement } from "../types/announcement";
import { toast } from "sonner";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import axios from "axios";

interface AnnouncementsPageProps {
    businessUen: string;
    onBack: () => void;
    isDarkMode?: boolean;
}

export function AnnouncementsPage({
    businessUen,
    onBack,
    isDarkMode = true,
}: AnnouncementsPageProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] =
        useState<Announcement | null>(null);

    // ✨ NEW: State for handling submission and upload status
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");

    const [imageFile, setImageFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        title: "",
        content: "",
        // The image URL is now managed separately
    });
    const [existingImageUrl, setExistingImageUrl] = useState<string | null>(
        null,
    );

    const bgColor = isDarkMode ? "#1a1a1a" : "#ffffff";
    const cardBgColor = isDarkMode ? "#2a2a2a" : "#f9fafb";
    const textColor = isDarkMode ? "#ffffff" : "#000000";
    const secondaryTextColor = isDarkMode ? "#a0a0a0" : "#6b7280";
    const borderColor = isDarkMode ? "#404040" : "#e5e7eb";

    // --- API Functions ---
    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const response = axios.post("/api/announcements", {
                uen: businessUen,
            });
            const data = (await response).data;
            setAnnouncements(data || []);
        } catch (error) {
            console.error(error);
            toast.error("Could not load announcements.");
        } finally {
            setLoading(false);
        }
    };

    // ✅ 2. Integrate your upload function
    const uploadImage = async (file: File): Promise<string> => {
        setIsSubmitting(true); // Indicate that an upload is in progress
        const toastId = toast.loading("Uploading image...");

        try {
            const sasResponse = await fetch(
                `/api/url-generator?filename=${encodeURIComponent(file.name)}`,
            );
            if (!sasResponse.ok) throw new Error("Failed to get upload URL");
            const sasData = await sasResponse.json();

            const uploadResponse = await fetch(sasData.uploadUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type,
                    "x-ms-blob-type": "BlockBlob",
                },
                body: file,
            });
            if (!uploadResponse.ok) throw new Error("Image upload failed");

            const finalUrl = `https://localoco.blob.core.windows.net/images/${sasData.blobName}`;
            toast.success("Image uploaded!", { id: toastId });
            return finalUrl;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Upload failed";
            toast.error(`Upload error: ${errorMessage}`, { id: toastId });
            throw error;
        } finally {
            setIsSubmitting(false); // Reset submission status
        }
    };

    const createAnnouncement = async () => {
        if (!formData.title || !formData.content) {
            toast.error("Title and content are required.");
            return;
        }

        try {
            let finalImageUrl =
                null;

            if (imageFile) {
                finalImageUrl = await uploadImage(imageFile);
            }

            const response = await fetch("/api/new-announcement", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessUen,
                    title: formData.title,
                    content: formData.content,
                    imageUrl: finalImageUrl,
                }),
            });
            if (!response.ok) throw new Error("Failed to create announcement");

            setTimeout(fetchAnnouncements, 300);
            setShowCreateDialog(false);
            toast.success("Announcement created!");
        } catch (error) {
            toast.error("Failed to create announcement.");
        }
    };

    // (This function remains unchanged, as it sends JSON)
    const deleteAnnouncement = async () => {
        if (!selectedAnnouncement) return;
        try {
            const response = await fetch("/api/delete-announcement", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    announcementId: selectedAnnouncement.announcementId,
                }),
            });
            if (!response.ok) throw new Error("Failed to delete announcement");

            setTimeout(() => {
                fetchAnnouncements();
            }, 300);

            setShowDeleteDialog(false);
            toast.success("Announcement deleted!");
        } catch (error) {
            toast.error("Failed to delete announcement.");
        }
    };

    const updateAnnouncement = async () => {
        if (!selectedAnnouncement) return;

        try {
            let finalImageUrl = existingImageUrl; // Start with the current image URL

            if (imageFile) {
                finalImageUrl = await uploadImage(imageFile);
            }

            await axios.post("/api/update-announcement", {
                announcementId: selectedAnnouncement.announcementId,
                title: formData.title,
                content: formData.content,
                imageUrl: finalImageUrl,
            });

            setTimeout(fetchAnnouncements, 300);
            setShowEditDialog(false);
            toast.success("Announcement updated!");
        } catch (error) {
            toast.error("Failed to update announcement.");
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, [businessUen]);

    // --- Dialog Handlers ---

    const handleOpenCreateDialog = () => {
        setFormData({ title: "", content: "" });
        setImageFile(null);
        setExistingImageUrl(null);
        setShowCreateDialog(true);
    };

    const handleOpenEditDialog = (announcement: Announcement) => {
        setSelectedAnnouncement(announcement);
        setFormData({
            title: announcement.title,
            content: announcement.content,
        });
        setImageFile(null);
        setExistingImageUrl(announcement.imageUrl ?? null);
        setShowEditDialog(true);
    };

    const handleOpenDeleteDialog = (announcement: Announcement) => {
        setSelectedAnnouncement(announcement);
        setShowDeleteDialog(true);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <div className="min-h-screen p-6" style={{ backgroundColor: bgColor }}>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className={
                            isDarkMode
                                ? "text-white hover:bg-[#404040]"
                                : "text-black"
                        }
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl" style={{ color: textColor }}>
                            Announcements
                        </h1>
                        <p style={{ color: secondaryTextColor }}>
                            Manage announcements for your business.
                        </p>
                    </div>
                    <Button
                        onClick={handleOpenCreateDialog}
                        className="bg-primary text-white hover:bg-primary/90"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Announcement
                    </Button>
                </div>

                {/* Content */}
                {loading ? (
                    <div
                        className="text-center py-12"
                        style={{ color: secondaryTextColor }}
                    >
                        Loading...
                    </div>
                ) : announcements.length === 0 ? (
                    <Card
                        className="p-12 text-center"
                        style={{ backgroundColor: cardBgColor, borderColor }}
                    >
                        {/* ... No changes in this 'empty' block ... */}
                        <div className="max-w-md mx-auto">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-primary" />
                            </div>
                            <h3
                                className="text-lg mb-2"
                                style={{ color: textColor }}
                            >
                                No announcements yet
                            </h3>
                            <p
                                className="mb-6"
                                style={{ color: secondaryTextColor }}
                            >
                                Create your first announcement to engage with
                                customers.
                            </p>
                            <Button
                                onClick={handleOpenCreateDialog}
                                className="bg-primary text-white hover:bg-primary/90"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create First Announcement
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* ... No changes in this 'map' block ... */}
                        {announcements.map((announcement) => (
                            <Card
                                key={announcement.announcementId}
                                className="overflow-hidden"
                                style={{
                                    backgroundColor: cardBgColor,
                                    borderColor,
                                }}
                            >
                                {announcement.imageUrl && (
                                    <div className="relative w-full h-48 overflow-hidden">
                                        <ImageWithFallback
                                            src={announcement.imageUrl}
                                            alt={announcement.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="p-4">
                                    <h3
                                        className="text-lg mb-2"
                                        style={{ color: textColor }}
                                    >
                                        {announcement.title}
                                    </h3>
                                    <p
                                        className="text-sm mb-4 line-clamp-3"
                                        style={{ color: secondaryTextColor }}
                                    >
                                        {announcement.content}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span
                                            className="text-xs"
                                            style={{
                                                color: secondaryTextColor,
                                            }}
                                        >
                                            Updated{" "}
                                            {formatDate(announcement.updatedAt)}
                                        </span>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    handleOpenEditDialog(
                                                        announcement,
                                                    )
                                                }
                                                className={
                                                    isDarkMode
                                                        ? "text-white hover:bg-[#404040]"
                                                        : "text-black"
                                                }
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    handleOpenDeleteDialog(
                                                        announcement,
                                                    )
                                                }
                                                className="text-red-500 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* ✅ 6. Update the Dialog Content */}
            <Dialog
                open={showCreateDialog || showEditDialog}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowCreateDialog(false);
                        setShowEditDialog(false);
                    }
                }}
            >
                <DialogContent
                    className={
                        isDarkMode
                            ? "bg-[#2a2a2a] text-white border-[#404040]"
                            : "bg-white"
                    }
                >
                    <DialogHeader>
                        <DialogTitle>
                            {showCreateDialog
                                ? "Create Announcement"
                                : "Edit Announcement"}
                        </DialogTitle>
                    </DialogHeader>

                    {/* ✨ NEW: Show upload status */}
                    {uploadStatus && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-center text-blue-700">
                            {uploadStatus}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        title: e.target.value,
                                    })
                                }
                                disabled={isSubmitting} // ✨ NEW
                            />
                        </div>
                        <div>
                            <Label htmlFor="content">Content *</Label>
                            <Textarea
                                id="content"
                                value={formData.content}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        content: e.target.value,
                                    })
                                }
                                rows={4}
                                disabled={isSubmitting} // ✨ NEW
                            />
                        </div>
                        <div className="space-y-2">
                            <Label
                                htmlFor="announcement-image"
                                className="text-foreground"
                            >
                                {showEditDialog
                                    ? "Replace Image"
                                    : "Upload Image"}{" "}
                                (Optional)
                            </Label>
                            <div className="flex items-center gap-4">
                                <label
                                    htmlFor="announcement-image"
                                    className="cursor-pointer px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors font-medium text-sm"
                                >
                                    Choose File
                                </label>
                                <Input
                                    id="announcement-image"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        setImageFile(
                                            e.target.files?.[0] || null,
                                        )
                                    }
                                    disabled={isSubmitting}
                                    className="hidden"
                                />
                                <span className="text-sm text-muted-foreground">
                                    {imageFile
                                        ? imageFile.name
                                        : existingImageUrl
                                          ? "Current image is set"
                                          : "No file chosen"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCreateDialog(false);
                                setShowEditDialog(false);
                            }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={
                                showCreateDialog
                                    ? createAnnouncement
                                    : updateAnnouncement
                            }
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? "Saving..."
                                : showCreateDialog
                                  ? "Create"
                                  : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* (Delete dialog is unchanged) */}
            <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the announcement.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteAnnouncement}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
