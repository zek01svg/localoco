import React, { useState, useEffect, useRef } from "react";
import { BusinessOwner } from "../../types/auth.store.types";
import { toast } from "sonner";
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
import { Checkbox } from "../ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { Alert, AlertDescription } from "../ui/alert";
import {
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Upload,
    X,
    Truck,
    ShoppingBag,
} from "lucide-react";

// --- OneMap API Functions (no changes) ---
const getAuthToken = async (): Promise<string | null> => {
    try {
        const response = await fetch(
            "https://www.onemap.gov.sg/api/auth/post/getToken",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: "pamika.lim.2024@computing.smu.edu.sg",
                    password: "CKPF6pu@DBRJ7cK",
                }),
            },
        );
        if (!response.ok) throw new Error("Failed to get OneMap token");
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Failed to get OneMap token:", error);
        toast.error("Failed to authenticate with OneMap service.");
        return null;
    }
};

const getAddressFromPostalCode = async (
    postalCode: string,
): Promise<string> => {
    if (postalCode.length !== 6 || isNaN(Number(postalCode))) {
        toast.error("Invalid Postal Code", {
            description: "Please enter a valid 6-digit postal code.",
        });
        return "";
    }
    const authToken = await getAuthToken();
    if (!authToken) return "";
    try {
        const response = await fetch(
            `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=N&getAddrDetails=Y`,
            { headers: { Authorization: `Bearer ${authToken}` } },
        );
        if (!response.ok) throw new Error("OneMap API request failed");
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            return data.results[0].ADDRESS;
        } else {
            toast.error("Invalid Postal Code", {
                description: "No address found for this postal code.",
            });
            return "";
        }
    } catch (error) {
        console.error("Error fetching address from postal code:", error);
        toast.error("Failed to fetch address from OneMap.");
        return "";
    }
};

interface EditBusinessProfileDialogProps {
    businessOwner: BusinessOwner;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (updatedBusiness: BusinessOwner) => void;
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
    { value: "cash", label: "Cash" },
    { value: "card", label: "Credit/Debit Card" },
    { value: "paynow", label: "PayNow" },
    { value: "digital_wallets", label: "Digital Wallets" },
    
];
const TOTAL_STEPS = 4;

export function EditBusinessProfileDialog({
    businessOwner,
    open,
    onOpenChange,
    onSave,
}: EditBusinessProfileDialogProps) {
    const [formData, setFormData] = useState<BusinessOwner>(businessOwner);
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [useSameHours, setUseSameHours] = useState(false);
    const [defaultHours, setDefaultHours] = useState({
        open: "09:00",
        close: "17:00",
    });
    const [postalCode, setPostalCode] = useState("");
    const [isFetchingAddress, setIsFetchingAddress] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        businessOwner.wallpaper || null,
    );
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const convertToFrontendFormat = (tier: string): string => {
        const mapping: Record<string, string> = {
            low: "$",
            medium: "$$",
            high: "$$$",
        };
        return mapping[tier] || tier;
    };

    // --- All hooks and handlers below this line have no changes ---
    useEffect(() => {
        const fetchAddress = async () => {
            if (postalCode.length === 6) {
                setIsFetchingAddress(true);
                const fetchedAddress =
                    await getAddressFromPostalCode(postalCode);
                if (fetchedAddress) {
                    setFormData((prev) => ({
                        ...prev,
                        address: fetchedAddress,
                    }));
                }
                setIsFetchingAddress(false);
            }
        };
        const debounceFetch = setTimeout(() => {
            fetchAddress();
        }, 500);
        return () => clearTimeout(debounceFetch);
    }, [postalCode, setFormData]);

    const normalizePaymentOptions = (options: string[]): string[] => {
        const normalized = new Set<string>();
        const validValues = PAYMENT_OPTIONS.map((opt) => opt.value);

        options.forEach((option) => {
            const lowercased = option.toLowerCase();
            // Map common variations to standard values
            if (lowercased === "cash" || lowercased === "Cash") {
                normalized.add("cash");
            } else if (
                lowercased === "card" ||
                lowercased === "credit/debit card"
            ) {
                normalized.add("card");
            } else if (lowercased === "paynow") {
                normalized.add("paynow");
            } else if (
                lowercased === "digital_wallets" ||
                lowercased === "digital wallets"
            ) {
                normalized.add("digital_wallets");
            }
        });

        return Array.from(normalized);
    };

    useEffect(() => {
        setFormData({
            ...businessOwner,
            priceTier: convertToFrontendFormat(businessOwner.priceTier),
            paymentOptions: normalizePaymentOptions(
                businessOwner.paymentOptions || [],
            ),
        });
    }, [businessOwner]);

    // Reset to step 1 when dialog opens
    useEffect(() => {
        if (open) {
            setCurrentStep(1);
            setError(null);
        }
    }, [open]);

    const handleChange = (field: keyof BusinessOwner, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError(null);
    };

    const handleDayToggle = (day: string) => {
        const updatedOperatingDays = formData.operatingDays || [];
        const updatedOpeningHours = { ...(formData.openingHours || {}) };

        const isDayCurrentlySelected = updatedOperatingDays.includes(day);

        if (isDayCurrentlySelected) {
            // If day is being DE-selected, remove it from both places
            const newOperatingDays = updatedOperatingDays.filter(
                (d) => d !== day,
            );
            delete updatedOpeningHours[day]; // Also remove its hours

            setFormData((prev) => ({
                ...prev,
                operatingDays: newOperatingDays,
                openingHours: updatedOpeningHours,
            }));
        } else {
            // If day is being ADDED, add it to the array and initialize its hours
            const newOperatingDays = [...updatedOperatingDays, day];
            updatedOpeningHours[day] = { open: "09:00", close: "17:00" }; // Initialize with default times

            setFormData((prev) => ({
                ...prev,
                operatingDays: newOperatingDays,
                openingHours: updatedOpeningHours,
                open247: false, // When selecting specific days, turn off 24/7
            }));
        }
    };
    const handlePaymentToggle = (payment: string) => {
        const paymentOptions = formData.paymentOptions || [];
        setFormData((prev) => ({
            ...prev,
            paymentOptions: paymentOptions.includes(payment)
                ? paymentOptions.filter((p) => p !== payment)
                : [...paymentOptions, payment],
        }));
    };

    const handleOpeningHoursChange = (
        day: string,
        type: "open" | "close",
        value: string,
    ) => {
        setFormData((prev) => ({
            ...prev,
            openingHours: {
                ...prev.openingHours,
                [day]: { ...prev.openingHours?.[day], [type]: value },
            },
        }));
    };

    const handleDefaultHoursChange = (type: 'open' | 'close', value: string) => {
      const newDefaultHours = { ...defaultHours, [type]: value };
      setDefaultHours(newDefaultHours);
    
      if (useSameHours) {
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
        const newHours = allDays.reduce((acc, day) => {
          acc[day] = newDefaultHours;
          return acc;
        }, {} as Record<string, { open: string; close: string }>);
    
        setFormData(prev => ({
          ...prev,
          openingHours: newHours,
          operatingDays: allDays, // <--- Ensure all days set here
        }));
      }
    };
    const handleSameHoursToggle = (checked: boolean) => {
      setUseSameHours(checked);
      if (checked) {
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        setFormData(prev => ({
          ...prev,
          operatingDays: allDays,
          openingHours: allDays.reduce((acc, day) => {
            acc[day] = defaultHours;
            return acc;
          }, {} as Record<string, { open: string; close: string }>),
          open247: false, // When using same hours for specific days, turn off 24/7
        }));
      }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("Image size should be less than 5MB");
            return;
        }
        setUploading(true);
        try {
            const urlResponse = await fetch(
                `/api/url-generator?filename=${encodeURIComponent(file.name)}`,
            );
            if (!urlResponse.ok) throw new Error("Failed to get upload URL");
            const { uploadUrl } = await urlResponse.json();
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                    "x-ms-blob-type": "BlockBlob",
                    "Content-Type": file.type,
                },
                body: file,
            });
            if (!uploadResponse.ok) throw new Error("Failed to upload image");
            const blobUrl = uploadUrl.split("?")[0];
            setPreviewUrl(blobUrl);
            setFormData((prev: BusinessOwner) => ({
                ...prev,
                wallpaper: blobUrl,
            }));
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveWallpaper = () => {
        setPreviewUrl(null);
        setFormData((prev: BusinessOwner) => ({
            ...prev,
            wallpaper: undefined,
        }));
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const validateStep = (step: number): boolean => {
        setError(null);
        switch (step) {
            case 1:
                if (
                    !formData.businessName ||
                    !formData.category ||
                    !formData.description
                ) {
                    setError("Please fill in all basic information fields.");
                    return false;
                }
                break;
            case 2:
                if (
                    !formData.businessEmail ||
                    !formData.phone ||
                    !formData.address
                ) {
                    setError(
                        "Please provide a valid address, email, and phone number.",
                    );
                    return false;
                }
                break;
            case 3:
              if (
                !formData.priceTier ||
                (!formData.open247 && formData.operatingDays.length === 0)
              ) {
                setError(
                  'Please select a price tier and at least one operating day, or select "Open 24/7".'
                );
                return false;
                }
                break;
            default:
                return true;
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
        }
    };

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const convertToBackendFormat = (tier: string): string => {
        const mapping: Record<string, string> = {
            $: "low",
            $$: "medium",
            $$$: "high",
        };
        return mapping[tier] || tier;
    };

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(TOTAL_STEPS)) return;
    setSaving(true);
    setError(null);
    try {
      const dataToSend = {
        // Add the UEN to identify which business to update
        ownerId: businessOwner.ownerId, 

        uen: businessOwner.uen,

        // Map frontend state fields to backend field names
        businessName: formData.businessName,
        businessCategory: formData.category,
        description: formData.description,
        address: formData.address,
        email: formData.businessEmail,
        phoneNumber: formData.phone,
        websiteLink: formData.website || '',
        socialMediaLink: formData.socialMedia || '',
        wallpaper: formData.wallpaper || '',

        // Convert price tier from ('$', '$$') to ('low', 'medium')
        priceTier: convertToBackendFormat(formData.priceTier),

        // Convert booleans to 1 or 0
        offersDelivery: formData.offersDelivery ? 1 : 0,
        offersPickup: formData.offersPickup ? 1 : 0,
        open247: formData.open247 ? 1 : 0,

        // Include other operational details
        operatingDays: formData.open247
        ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        : formData.operatingDays,
      openingHours: formData.open247
        ? {
            Monday: { open: '00:00', close: '23:59' },
            Tuesday: { open: '00:00', close: '23:59' },
            Wednesday: { open: '00:00', close: '23:59' },
            Thursday: { open: '00:00', close: '23:59' },
            Friday: { open: '00:00', close: '23:59' },
            Saturday: { open: '00:00', close: '23:59' },
            Sunday: { open: '00:00', close: '23:59' },
          }
        : formData.openingHours,
      paymentOptions: formData.paymentOptions,
    };

      console.log("📦 Payload being sent to backend:", JSON.stringify(dataToSend, null, 2));

        const response = await fetch(`/api/update-business`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
        });
        if (!response.ok) {
            throw new Error('Failed to update business profile');
        }
        const result = await response.json();
        onSave(result.business);
        onOpenChange(false);
        toast.success("Business profile updated successfully!");
      } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred.');
        }
    } finally {
        setSaving(false);
    }
  };


    const renderStepIndicator = () => (
        <div style={{ flexShrink: 0 }}>
            <div className="flex items-center justify-between mb-6">
                {["Basic Info", "Contact", "Operations", "Review"].map(
                    (step, index) => (
                        <React.Fragment key={step}>
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-colors ${
                                        index + 1 === currentStep
                                            ? "bg-primary text-white"
                                            : index + 1 < currentStep
                                              ? "bg-green-500 text-white"
                                              : "bg-gray-200 text-gray-600"
                                    }`}
                                >
                                    {index + 1}
                                </div>
                                <span className="text-xs mt-1 text-muted-foreground">
                                    {step}
                                </span>
                            </div>
                            {index < 3 && (
                                <div
                                    className={`flex-1 h-1 mx-2 transition-colors ${index + 1 < currentStep ? "bg-green-500" : "bg-gray-200"}`}
                                ></div>
                            )}
                        </React.Fragment>
                    ),
                )}
            </div>
        </div>
    );

    const renderStepContent = () => {
        // No changes to the content of the steps
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">
                            Business Information
                        </h3>
                        <Separator />
                        <div className="space-y-2">
                            <Label>Business Wallpaper</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden bg-gray-200">
                                    {previewUrl ? (
                                        <img
                                            src={previewUrl}
                                            alt="Business preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Upload className="w-8 h-8 text-gray-400" />
                                    )}
                                </div>
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
                                            onClick={handleRemoveWallpaper}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Recommended: Landscape image, max 5MB
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="businessName">Business Name</Label>
                            <Input
                                id="businessName"
                                value={formData.businessName}
                                onChange={(e) =>
                                    handleChange("businessName", e.target.value)
                                }
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="businessCategory">
                                Business Category
                            </Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) =>
                                    handleChange("category", value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fnb">F&B</SelectItem>
                                    <SelectItem value="retail">
                                        Retail
                                    </SelectItem>
                                    <SelectItem value="services">
                                        Services
                                    </SelectItem>
                                    <SelectItem value="entertainment">
                                        Entertainment
                                    </SelectItem>
                                    <SelectItem value="health_wellness">
                                        Health/Wellness
                                    </SelectItem>
                                    <SelectItem value="professional_services">
                                        Professional Services
                                    </SelectItem>
                                    <SelectItem value="home_living">
                                        Home and Living
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) =>
                                    handleChange("description", e.target.value)
                                }
                                rows={4}
                            />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">
                            Contact & Location
                        </h3>
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="postalCode">Postal Code</Label>
                            <Input
                                id="postalCode"
                                value={postalCode}
                                onChange={(e) => setPostalCode(e.target.value)}
                                maxLength={6}
                                placeholder="Enter 6-digit postal code"
                            />
                            {isFetchingAddress && (
                                <p className="text-sm text-muted-foreground">
                                    Fetching address...
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Business Address</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) =>
                                    handleChange("address", e.target.value)
                                }
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="businessEmail">
                                Business Email
                            </Label>
                            <Input
                                id="businessEmail"
                                type="email"
                                value={formData.businessEmail}
                                onChange={(e) =>
                                    handleChange(
                                        "businessEmail",
                                        e.target.value,
                                    )
                                }
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) =>
                                    handleChange("phone", e.target.value)
                                }
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input
                                id="website"
                                type="url"
                                value={formData.website}
                                onChange={(e) =>
                                    handleChange("website", e.target.value)
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="socialMedia">Social Media</Label>
                            <Input
                                id="socialMedia"
                                type="url"
                                value={formData.socialMedia}
                                onChange={(e) =>
                                    handleChange("socialMedia", e.target.value)
                                }
                            />
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6">
                        <h3 className="font-semibold text-lg">
                            Hours & Operations
                        </h3>
                        <Separator />
                        <div className="space-y-3">
                            <Label>Operating Days & Hours</Label>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="open247"
                                    checked={formData.open247}
                                    onCheckedChange={(checked: boolean) => {
                                        handleChange("open247", checked);
                                        // When checking 24/7, clear operating days and hours
                                        if (checked) {
                                            setFormData(prev => ({
                                                ...prev,
                                                open247: true,
                                                operatingDays: [],
                                                openingHours: {},
                                            }));
                                            setUseSameHours(false);
                                        }
                                    }}
                                />
                                <label htmlFor="open247">Open 24/7</label>
                            </div>
                            {!formData.open247 && (
                                <>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="sameHours"
                                            checked={useSameHours}
                                            onCheckedChange={
                                                handleSameHoursToggle
                                            }
                                        />
                                        <label htmlFor="sameHours">
                                            Same hours for all selected days
                                        </label>
                                    </div>
                                    {useSameHours ? (
                                        <div className="flex items-center gap-2 p-2 border rounded-md">
                                            <Input
                                                type="time"
                                                value={defaultHours.open}
                                                onChange={(e) =>
                                                    handleDefaultHoursChange(
                                                        "open",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <span>to</span>
                                            <Input
                                                type="time"
                                                value={defaultHours.close}
                                                onChange={(e) =>
                                                    handleDefaultHoursChange(
                                                        "close",
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {DAYS_OF_WEEK.map((day) => (
                                                <div
                                                    key={day}
                                                    className="flex items-center justify-between gap-2"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`edit-${day}`}
                                                            checked={(
                                                                formData.operatingDays ||
                                                                []
                                                            ).includes(day)}
                                                            onCheckedChange={() =>
                                                                handleDayToggle(
                                                                    day,
                                                                )
                                                            }
                                                        />
                                                        <label
                                                            htmlFor={`edit-${day}`}
                                                        >
                                                            {day}
                                                        </label>
                                                    </div>
                                                    {(
                                                        formData.operatingDays ||
                                                        []
                                                    ).includes(day) && (
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="time"
                                                                value={
                                                                    formData
                                                                        .openingHours?.[
                                                                        day
                                                                    ]?.open ||
                                                                    ""
                                                                }
                                                                onChange={(e) =>
                                                                    handleOpeningHoursChange(
                                                                        day,
                                                                        "open",
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                            <span>to</span>
                                                            <Input
                                                                type="time"
                                                                value={
                                                                    formData
                                                                        .openingHours?.[
                                                                        day
                                                                    ]?.close ||
                                                                    ""
                                                                }
                                                                onChange={(e) =>
                                                                    handleOpeningHoursChange(
                                                                        day,
                                                                        "close",
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <Separator />
                        <div className="space-y-3">
                            <Label>Service Options</Label>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="offersDelivery"
                                    checked={formData.offersDelivery}
                                    onCheckedChange={(checked: boolean) =>
                                        handleChange("offersDelivery", checked)
                                    }
                                />
                                <Truck className="w-4 h-4 text-muted-foreground" />
                                <label
                                    htmlFor="offersDelivery"
                                    className="text-sm"
                                >
                                    Offers Delivery
                                </label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="offersPickup"
                                    checked={formData.offersPickup}
                                    onCheckedChange={(checked: boolean) =>
                                        handleChange("offersPickup", checked)
                                    }
                                />
                                <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                                <label
                                    htmlFor="offersPickup"
                                    className="text-sm"
                                >
                                    Offers Pickup
                                </label>
                            </div>
                        </div>
                        <Separator />
                        <div className="space-y-3">
                            <Label htmlFor="priceTier">Price Tier</Label>
                            <Select
                                value={formData.priceTier}
                                onValueChange={(value) =>
                                    handleChange("priceTier", value)
                                }
                            >
                                <SelectTrigger>
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
                        <Separator />
                        <div className="space-y-3">
                            <Label>Payment Options</Label>
                            <div className="border border-input rounded-md p-4 grid grid-cols-2 gap-4">
                                {PAYMENT_OPTIONS.map((payment) => (
                                    <div
                                        key={payment.value}
                                        className="flex items-center space-x-2"
                                    >
                                        <Checkbox
                                            id={`edit-payment-${payment.value}`}
                                            checked={(
                                                formData.paymentOptions || []
                                            ).includes(payment.value)}
                                            onCheckedChange={() =>
                                                handlePaymentToggle(
                                                    payment.value,
                                                )
                                            }
                                        />
                                        <label
                                            htmlFor={`edit-payment-${payment.value}`}
                                            className="text-sm"
                                        >
                                            {payment.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 4:
                const getPaymentLabels = (values: string[]): string => {
                    return values
                        .map((val) => {
                            const option = PAYMENT_OPTIONS.find(
                                (opt) => opt.value === val,
                            );
                            return option ? option.label : val;
                        })
                        .join(", ");
                };

                return (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg">
                            Review Changes
                        </h3>
                        <Separator />
                        <div className="space-y-2 text-sm max-h-80 overflow-y-auto">
                            <p>
                                <strong>Name:</strong> {formData.businessName}
                            </p>
                            <p>
                                <strong>Category:</strong> {formData.category}
                            </p>
                            <p>
                                <strong>Address:</strong> {formData.address}
                            </p>
                            <p>
                                <strong>Email:</strong> {formData.businessEmail}
                            </p>
                            <p>
                                <strong>Phone:</strong> {formData.phone}
                            </p>
                            <p>
                                <strong>Operating Days:</strong>{" "}
                                {formData.open247
                                    ? "Open 24/7"
                                    : (formData.operatingDays || []).join(", ")}
                            </p>
                            <p>
                                <strong>Price Tier:</strong>{" "}
                                {formData.priceTier}
                            </p>
                            <p>
                                <strong>Payment Options:</strong>{" "}
                                {getPaymentLabels(
                                    formData.paymentOptions || [],
                                )}
                            </p>
                            <Separator className="my-2" />
                            <p>
                                <strong>Offers Delivery:</strong>{" "}
                                {formData.offersDelivery ? "Yes" : "No"}
                            </p>
                            <p>
                                <strong>Offers Pickup:</strong>{" "}
                                {formData.offersPickup ? "Yes" : "No"}
                            </p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-md flex flex-col" // REVERTED to original width
                style={{ height: "90vh" }}
            >
                <DialogHeader style={{ flexShrink: 0 }}>
                    <DialogTitle>Edit Business Profile</DialogTitle>
                    <DialogDescription>
                        Update your business information step-by-step.
                    </DialogDescription>
                </DialogHeader>

                {renderStepIndicator()}

                <div
                    className="pr-4"
                    style={{ flex: "1 1 auto", overflowY: "auto" }}
                >
                    <form
                        onSubmit={handleSubmit}
                        id="edit-business-form"
                        className="space-y-6"
                    >
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {renderStepContent()}
                    </form>
                </div>

                <DialogFooter
                    className="mt-4 pt-4 border-t"
                    style={{ flexShrink: 0 }}
                >
                    <div className="flex justify-between w-full">
                        {currentStep > 1 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                            >
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                Previous
                            </Button>
                        )}
                        <div className="flex-grow"></div>
                        {currentStep < TOTAL_STEPS && (
                            <Button type="button" onClick={handleNext}>
                                Next
                                <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        )}
                        {currentStep === TOTAL_STEPS && (
                            <Button
                                type="submit"
                                form="edit-business-form"
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
