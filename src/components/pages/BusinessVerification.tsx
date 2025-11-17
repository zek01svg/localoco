import React, { useState } from "react";
import { Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";

interface BusinessVerificationProps {
    onSubmit?: (data: any) => void;
    onSkip?: () => void;
}

const DAYS_OF_WEEK = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];
const PAYMENT_OPTIONS = [
    "Cash",
    "Credit Card",
    "Debit Card",
    "PayNow",
    "GrabPay",
    "PayLah",
];

const convertPriceTier = (tier: string): "" | "$" | "$$" | "$$$" => {
    const mapping: Record<string, "" | "$" | "$$" | "$$$"> = {
        low: "$",
        medium: "$$",
        high: "$$$",
        $: "$",
        $$: "$$",
        $$$: "$$$",
        "": "",
    };
    return mapping[tier.toLowerCase()] || "";
};

const convertToBackendFormat = (tier: string): string => {
    const mapping: Record<string, string> = {
        $: "low",
        $$: "medium",
        $$$: "high",
    };
    return mapping[tier] || tier;
};

export function BusinessVerification({
    onSubmit,
    onSkip,
}: BusinessVerificationProps = {}) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");

    const [formData, setFormData] = useState({
        uen: "",
        businessName: "",
        businessCategory: "",
        description: "",
        address: "",
        phoneNumber: "",
        email: "",
        websiteLink: "",
        socialMediaLink: "",
        wallpaper: null as File | null,
        priceTier: "",
        open247: false,
        openingHours: DAYS_OF_WEEK.reduce(
            (acc, day) => {
                acc[day] = { open: "", close: "" };
                return acc;
            },
            {} as { [day: string]: { open: string; close: string } },
        ),
        offersDelivery: false,
        offersPickup: false,
        paymentOptions: [] as string[],
    });

    // Handle opening hours time change
    const handleOpeningHoursChange = (
        day: string,
        type: "open" | "close",
        value: string,
    ) => {
        setFormData((prev) => ({
            ...prev,
            openingHours: {
                ...prev.openingHours,
                [day]: {
                    ...prev.openingHours[day],
                    [type]: value,
                },
            },
        }));
    };

    const handlePaymentToggle = (payment: string) => {
        setFormData((prev) => ({
            ...prev,
            paymentOptions: prev.paymentOptions.includes(payment)
                ? prev.paymentOptions.filter((p) => p !== payment)
                : [...prev.paymentOptions, payment],
        }));
    };

    const uploadWallpaper = async (file: File): Promise<string> => {
        setUploadStatus("Uploading image...");

        try {
            const sasResponse = await fetch(
                `/api/url-generator?filename=${encodeURIComponent(file.name)}`,
            );

            if (!sasResponse.ok) {
                throw new Error("Failed to generate upload URL");
            }

            const sasData = await sasResponse.json();

            const uploadResponse = await fetch(sasData.uploadUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type,
                    "x-ms-blob-type": "BlockBlob",
                },
                body: file,
            });

            if (!uploadResponse.ok) {
                throw new Error(
                    `Upload failed with status ${uploadResponse.status}`,
                );
            }

            const wallpaperUrl = `https://localoco.blob.core.windows.net/images/${sasData.blobName}`;
            setUploadStatus("Image uploaded successfully");
            return wallpaperUrl;
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Upload failed";
            setUploadStatus(`Upload error: ${errorMessage}`);
            throw error;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setUploadStatus("");

        try {
            let wallpaperUrl = "";

            if (formData.wallpaper) {
                setUploadStatus("Generating upload URL...");
                const sasResponse = await fetch(
                    `/api/url-generator?filename=${encodeURIComponent(formData.wallpaper.name)}`,
                );

                if (!sasResponse.ok) {
                    const error = await sasResponse.json();
                    throw new Error(
                        error.error || "Failed to generate upload URL",
                    );
                }

                const sasData = await sasResponse.json();

                setUploadStatus("Uploading image to storage...");
                const uploadResponse = await fetch(sasData.uploadUrl, {
                    method: "PUT",
                    headers: {
                        "Content-Type": formData.wallpaper.type,
                        "x-ms-blob-type": "BlockBlob",
                    },
                    body: formData.wallpaper,
                });

                if (!uploadResponse.ok) {
                    throw new Error(
                        `Upload failed with status ${uploadResponse.status}`,
                    );
                }

                wallpaperUrl = `https://localoco.blob.core.windows.net/images/${sasData.blobName}`;
                setUploadStatus("Image uploaded successfully");
            } else {
                setUploadStatus("No image selected, continuing...");
            }
            setUploadStatus("Finalizing registration...");

            const finalPayload = {
                uen: formData.uen,
                businessName: formData.businessName,
                businessCategory: formData.businessCategory,
                description: formData.description,
                address: formData.address,
                open247: formData.open247,
                openingHours: formData.openingHours,
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                websiteLink: formData.websiteLink,
                socialMediaLink: formData.socialMediaLink,
                wallpaper: wallpaperUrl,
                dateOfCreation: new Date().toISOString().slice(0, 10),
                priceTier: convertToBackendFormat(formData.priceTier),
                offersDelivery: formData.offersDelivery,
                offersPickup: formData.offersPickup,
                paymentOptions: formData.paymentOptions,
            };

            const response = await fetch("/api/register-business", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(finalPayload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Registration failed");
            }

            setUploadStatus("Success! Redirecting...");
            alert("Business Registered Successfully!");

            if (onSubmit) {
                onSubmit(formData);
            } else {
                navigate("/map");
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred";
            console.error("Registration error:", error);
            setUploadStatus(`Error: ${errorMessage}`);
            alert("Error: " + errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        if (onSkip) {
            onSkip();
        } else {
            navigate("/map");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header
                className="text-white shadow-md"
                style={{ backgroundColor: "#3a3a3a" }}
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

            {/* Verification Form */}
            <div className="max-w-3xl mx-auto p-6">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <div className="mb-8">
                        <h2 className="mb-2">Business Verification</h2>
                        <p className="text-muted-foreground">
                            Complete your business profile to get verified and
                            start reaching customers
                        </p>
                    </div>

                    {uploadStatus && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                            {uploadStatus}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* UEN */}
                        <div className="space-y-2">
                            <Label htmlFor="uen">UEN</Label>
                            <Input
                                id="uen"
                                type="text"
                                placeholder="Enter UEN"
                                value={formData.uen}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        uen: e.target.value,
                                    }))
                                }
                                required
                                disabled={loading}
                                className="bg-input-background"
                            />
                        </div>

                        {/* Business Name */}
                        <div className="space-y-2">
                            <Label htmlFor="businessName">Business Name</Label>
                            <Input
                                id="businessName"
                                type="text"
                                placeholder="Enter Business Name"
                                value={formData.businessName}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        businessName: e.target.value,
                                    }))
                                }
                                required
                                disabled={loading}
                                className="bg-input-background"
                            />
                        </div>

                        {/* Business Category */}
                        <div className="space-y-2">
                            <Label htmlFor="businessCategory">
                                Business Category
                            </Label>
                            <Input
                                id="businessCategory"
                                type="text"
                                placeholder="Enter Business Category"
                                value={formData.businessCategory}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        businessCategory: e.target.value,
                                    }))
                                }
                                required
                                disabled={loading}
                                className="bg-input-background"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                placeholder="Describe your business"
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                                disabled={loading}
                                className="w-full rounded-md border border-gray-300 p-2 bg-input-background"
                                rows={4}
                                required
                            />
                        </div>

                        {/* Address */}
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                type="text"
                                placeholder="Business Address"
                                value={formData.address}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        address: e.target.value,
                                    }))
                                }
                                required
                                disabled={loading}
                                className="bg-input-background"
                            />
                        </div>

                        {/* Open 24/7 */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="open247"
                                checked={formData.open247}
                                onCheckedChange={(checked: boolean) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        open247: checked,
                                    }))
                                }
                                disabled={loading}
                            />
                            <label htmlFor="open247" className="cursor-pointer">
                                Open 24/7
                            </label>
                        </div>

                        {/* Opening Hours */}
                        {!formData.open247 && (
                            <div className="space-y-4">
                                <Label>Opening Hours</Label>
                                {DAYS_OF_WEEK.map((day) => (
                                    <div key={day} className="space-y-1">
                                        <Label className="font-semibold">
                                            {day}
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="time"
                                                value={
                                                    formData.openingHours[day]
                                                        .open
                                                }
                                                onChange={(e) =>
                                                    handleOpeningHoursChange(
                                                        day,
                                                        "open",
                                                        e.target.value,
                                                    )
                                                }
                                                disabled={loading}
                                                className="bg-input-background"
                                            />
                                            <Input
                                                type="time"
                                                value={
                                                    formData.openingHours[day]
                                                        .close
                                                }
                                                onChange={(e) =>
                                                    handleOpeningHoursChange(
                                                        day,
                                                        "close",
                                                        e.target.value,
                                                    )
                                                }
                                                disabled={loading}
                                                className="bg-input-background"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Business Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Business Email"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        email: e.target.value,
                                    }))
                                }
                                required
                                disabled={loading}
                                className="bg-input-background"
                            />
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber">Phone Number</Label>
                            <Input
                                id="phoneNumber"
                                type="tel"
                                placeholder="Phone Number"
                                value={formData.phoneNumber}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        phoneNumber: e.target.value,
                                    }))
                                }
                                required
                                disabled={loading}
                                className="bg-input-background"
                            />
                        </div>

                        {/* Website Link */}
                        <div className="space-y-2">
                            <Label htmlFor="websiteLink">
                                Website Link (https://)
                            </Label>
                            <Input
                                id="websiteLink"
                                type="url"
                                placeholder="Website Link (https://)"
                                value={formData.websiteLink}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        websiteLink: e.target.value,
                                    }))
                                }
                                disabled={loading}
                                className="bg-input-background"
                            />
                        </div>

                        {/* Social Media Link */}
                        <div className="space-y-2">
                            <Label htmlFor="socialMediaLink">
                                Social Media Link
                            </Label>
                            <Input
                                id="socialMediaLink"
                                type="url"
                                placeholder="Social Media Link"
                                value={formData.socialMediaLink}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        socialMediaLink: e.target.value,
                                    }))
                                }
                                disabled={loading}
                                className="bg-input-background"
                            />
                        </div>

                        {/* Business Wallpaper */}
                        <div className="space-y-2">
                            <Label htmlFor="wallpaper">
                                Business Wallpaper
                            </Label>
                            <div className="flex items-center gap-4">
                                <label
                                    htmlFor="wallpaper"
                                    className="cursor-pointer px-4 py-2 bg-muted rounded-md hover:bg-muted/80 transition-colors"
                                >
                                    Choose File
                                </label>
                                <Input
                                    id="wallpaper"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            wallpaper:
                                                e.target.files?.[0] || null,
                                        }))
                                    }
                                    disabled={loading}
                                    className="hidden"
                                />
                                <span className="text-sm text-muted-foreground">
                                    {formData.wallpaper
                                        ? formData.wallpaper.name
                                        : "No file chosen"}
                                </span>
                            </div>
                        </div>

                        {/* Price Tier */}
                        <div className="space-y-2">
                            <Label htmlFor="priceTier">Price Tier</Label>
                            <Select
                                value={formData.priceTier}
                                onValueChange={(value) => {
                                    const converted = convertPriceTier(value);
                                    setFormData((prev) => ({
                                        ...prev,
                                        priceTier: converted,
                                    }));
                                }}
                                disabled={loading}
                            >
                                <SelectTrigger className="bg-input-background">
                                    <SelectValue placeholder="Select price tier" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="$">$ - Low</SelectItem>
                                    <SelectItem value="$$">
                                        $$ - Medium
                                    </SelectItem>
                                    <SelectItem value="$$$">
                                        $$$ - High
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Delivery & Pickup */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="delivery"
                                    checked={formData.offersDelivery}
                                    onCheckedChange={(checked: boolean) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            offersDelivery: checked,
                                        }))
                                    }
                                    disabled={loading}
                                />
                                <label
                                    htmlFor="delivery"
                                    className="cursor-pointer"
                                >
                                    Offers Delivery
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="pickup"
                                    checked={formData.offersPickup}
                                    onCheckedChange={(checked: boolean) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            offersPickup: checked,
                                        }))
                                    }
                                    disabled={loading}
                                />
                                <label
                                    htmlFor="pickup"
                                    className="cursor-pointer"
                                >
                                    Offers Pickup
                                </label>
                            </div>
                        </div>

                        {/* Payment Options */}
                        <div className="space-y-4">
                            <Label>Payment Options</Label>
                            <div className="grid grid-cols-2 gap-4">
                                {PAYMENT_OPTIONS.map((payment) => (
                                    <div
                                        key={payment}
                                        className="flex items-center space-x-2"
                                    >
                                        <Checkbox
                                            id={payment}
                                            checked={formData.paymentOptions.includes(
                                                payment,
                                            )}
                                            onCheckedChange={() =>
                                                handlePaymentToggle(payment)
                                            }
                                            disabled={loading}
                                        />
                                        <label
                                            htmlFor={payment}
                                            className="text-sm cursor-pointer"
                                        >
                                            {payment}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSkip}
                                disabled={loading}
                                className="flex-1 text-foreground"
                            >
                                Skip for Now
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-primary hover:bg-primary/90"
                            >
                                {loading
                                    ? "Submitting..."
                                    : "Submit Verification"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
