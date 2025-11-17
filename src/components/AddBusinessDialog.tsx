import React, { useState } from "react";
import { Building2, ChevronRight, ChevronLeft, Upload } from "lucide-react"; // Added Upload for consistency
import { BusinessVerificationData } from "../types/auth.store.types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea"; // Added Textarea for consistency
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter, // Added DialogFooter
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { toast } from "sonner";
// import { useThemeStore } from '../../store/themeStore'; // Uncomment and import if needed

type PriceTier = "" | "$" | "$$" | "$$$";

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
    "Credit/Debit Card",
    "PayNow",
    "Digital Wallets (Apple/Google/Samsung/GrabPay)",
];

interface AddBusinessDialogProps {
    onSubmit: (data: BusinessVerificationData) => void;
    trigger?: React.ReactNode;
}

export function AddBusinessDialog({
    onSubmit,
    trigger,
}: AddBusinessDialogProps) {
    // const isDarkMode = useThemeStore((state) => state.isDarkMode); // Uncomment if needed
    const [open, setOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false); // Added 'saving' state
    // const [uploading, setUploading] = useState(false); // Add if file upload becomes complex
    const totalSteps = 5;

    const [formData, setFormData] = useState({
        businessName: "",
        uen: "",
        businessCategory: "", // Changed from 'category'
        description: "",
        address: "",
        email: "", // Changed from 'businessEmail'
        phoneNumber: "", // Changed from 'phone'
        website: "",
        socialMedia: "",
        wallpaper: null as File | null,
        open247: false,
        openingHours: DAYS_OF_WEEK.reduce(
            (acc, day) => {
                acc[day] = { open: "09:00", close: "17:00" };
                return acc;
            },
            {} as { [day: string]: { open: string; close: string } },
        ),
        priceTier: "" as PriceTier,
        offersDelivery: false,
        offersPickup: false,
        paymentOptions: [] as string[],
    });

    const [useSameHours, setUseSameHours] = useState(false);
    const [defaultHours, setDefaultHours] = useState({
        open: "09:00",
        close: "17:00",
    });

    const handleChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError("");
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
                [day]: {
                    ...prev.openingHours[day],
                    [type]: value,
                },
            },
        }));
    };

    const handleDefaultHoursChange = (
        type: "open" | "close",
        value: string,
    ) => {
        setDefaultHours((prev) => ({ ...prev, [type]: value }));
        if (useSameHours) {
            const newHours = DAYS_OF_WEEK.reduce(
                (acc, day) => {
                    acc[day] = { ...defaultHours, [type]: value };
                    return acc;
                },
                {} as { [day: string]: { open: string; close: string } },
            );
            setFormData((prev) => ({ ...prev, openingHours: newHours }));
        }
    };

    const handleSameHoursToggle = (checked: boolean) => {
        setUseSameHours(checked);
        if (checked) {
            const newHours = DAYS_OF_WEEK.reduce(
                (acc, day) => {
                    acc[day] = { ...defaultHours };
                    return acc;
                },
                {} as { [day: string]: { open: string; close: string } },
            );
            setFormData((prev) => ({ ...prev, openingHours: newHours }));
        }
    };

    const handlePaymentToggle = (payment: string) => {
        setFormData((prev) => ({
            ...prev,
            paymentOptions: prev.paymentOptions.includes(payment)
                ? prev.paymentOptions.filter((p) => p !== payment)
                : [...prev.paymentOptions, payment],
        }));
    };

    const validateStep = (step: number): boolean => {
        setError("");

        switch (step) {
            case 1:
                // ✅ FIX: Use the new property name 'businessCategory'
                if (
                    !formData.businessName.trim() ||
                    !formData.uen.trim() ||
                    !formData.businessCategory ||
                    !formData.description.trim() ||
                    !formData.address.trim()
                ) {
                    setError(
                        "Please fill in all required fields in Basic Information.",
                    );
                    return false;
                }
                return true;

            case 2:
                // ✅ FIX: Use the new property names 'email' and 'phoneNumber'
                if (
                    !formData.email.trim() ||
                    !formData.email.includes("@") ||
                    !formData.phoneNumber.trim()
                ) {
                    setError("Please enter a valid email and phone number.");
                    return false;
                }
                return true;

            case 3:
            case 4:
            case 5:
                return true; // Simple validation for non-mandatory steps

            default:
                return true;
        }
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
        }
    };

    const handlePrevious = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
        setError("");
    };

    // Changed to async function and included saving state logic
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (currentStep !== totalSteps) {
            return;
        }

        if (!validateStep(currentStep)) {
            return;
        }

        setSaving(true);
        setError("");

        try {
            // Assume onSubmit is asynchronous or can be wrapped to simulate save
            await new Promise((resolve) => setTimeout(resolve, 500)); // Simulating API call
            onSubmit(formData);

            // Reset form and close dialog upon success
            setFormData({
                businessName: "",
                uen: "",
                businessCategory: "", // Use correct property name
                description: "",
                address: "",
                email: "",
                phoneNumber: "",
                website: "",
                socialMedia: "",
                wallpaper: null,
                open247: false,
                openingHours: DAYS_OF_WEEK.reduce(
                    (acc, day) => ({
                        ...acc,
                        [day]: { open: "09:00", close: "17:00" },
                    }),
                    {},
                ),
                priceTier: "",
                offersDelivery: false,
                offersPickup: false,
                paymentOptions: [],
            });
            setCurrentStep(1);
            setOpen(false);
            toast.success("Business added successfully!");
            setCurrentStep(1);
            setOpen(false);
            toast.success("Business added successfully!");
        } catch (err: any) {
            console.error("Error registering business:", err);
            setError(
                err.message || "Failed to register business. Please try again.",
            );
            toast.error("Failed to register business.");
        } finally {
            setSaving(false);
        }
    };

    const renderStepIndicator = () => {
        const steps = ["Basic Info", "Contact", "Hours", "Details", "Review"];

        return (
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => (
                        <React.Fragment key={step}>
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                                        index + 1 === currentStep
                                            ? "bg-primary text-white"
                                            : index + 1 < currentStep
                                              ? "bg-green-500 text-white"
                                              : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                    }`}
                                >
                                    {index + 1}
                                </div>
                                <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                                    {step}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <div
                                    className={`flex-1 h-1 mx-2 transition-colors ${
                                        index + 1 < currentStep
                                            ? "bg-green-500"
                                            : "bg-gray-200 dark:bg-gray-700"
                                    }`}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        );
    };

    const renderStep = () => {
        // Step 1: Basic Information
        if (currentStep === 1) {
            return (
                <div className="space-y-4">
                    <div>
                        <h3>Basic Information</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Tell us about your business
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="businessName">
                                Business Name *
                            </Label>
                            <Input
                                id="businessName"
                                value={formData.businessName}
                                onChange={(e) =>
                                    handleChange("businessName", e.target.value)
                                }
                                placeholder="Your Business Name"
                                // className="bg-input-background" // Removed for cleaner styling
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="uen">UEN *</Label>
                            <Input
                                id="uen"
                                value={formData.uen}
                                onChange={(e) =>
                                    handleChange("uen", e.target.value)
                                }
                                placeholder="Enter UEN"
                                // className="bg-input-background"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select
                            value={formData.businessCategory}
                            onValueChange={(value) =>
                                handleChange("businessCategory", value)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fnb">F&B</SelectItem>
                                <SelectItem value="retail">Retail</SelectItem>
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
                        <Label htmlFor="description">Description *</Label>
                        <Textarea // Used Textarea component
                            id="description"
                            placeholder="Tell customers about your business..."
                            value={formData.description}
                            onChange={(e) =>
                                handleChange("description", e.target.value)
                            }
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Business Address *</Label>
                        <Input
                            id="address"
                            placeholder="Street Address, City, Postal Code"
                            value={formData.address}
                            onChange={(e) =>
                                handleChange("address", e.target.value)
                            }
                            // className="bg-input-background"
                        />
                    </div>
                </div>
            );
        }

        // Step 2: Contact Information
        if (currentStep === 2) {
            return (
                <div className="space-y-4">
                    <div>
                        <h3>Contact Information</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            How can customers reach you?
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="businessEmail">Business Email *</Label>
                        <Input
                            id="businessEmail"
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                                handleChange("email", e.target.value)
                            }
                            placeholder="contact@yourbusiness.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={(e) =>
                                handleChange("phoneNumber", e.target.value)
                            }
                            placeholder="+65 1234 5678"
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
                            placeholder="https://www.yourbusiness.com"
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
                            placeholder="https://instagram.com/yourbusiness"
                        />
                    </div>

                    {/* Business Photo section stylized similarly to Avatar Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="wallpaper">
                            Business Photo (Wallpaper)
                        </Label>
                        <div className="flex items-center gap-4">
                            {/* Photo Preview (simplified) */}
                            <div className="w-20 h-20 rounded flex items-center justify-center overflow-hidden bg-gray-200 dark:bg-gray-700">
                                {formData.wallpaper ? (
                                    <span className="text-xs text-center p-1 text-muted-foreground break-all">
                                        {formData.wallpaper.name}
                                    </span>
                                ) : (
                                    <Upload className="w-8 h-8 text-gray-500" />
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label
                                    htmlFor="wallpaper"
                                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 bg-muted hover:bg-muted/80"
                                >
                                    Choose File
                                </label>
                                <Input
                                    id="wallpaper"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        handleChange(
                                            "wallpaper",
                                            e.target.files?.[0] || null,
                                        )
                                    }
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        handleChange("wallpaper", null)
                                    }
                                    disabled={!formData.wallpaper}
                                    className="text-xs text-red-500"
                                >
                                    Remove Photo
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Step 3: Operating Hours
        if (currentStep === 3) {
            return (
                <div className="space-y-4">
                    <div>
                        <h3>Operating Hours</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            When is your business open?
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="open247"
                            checked={formData.open247}
                            onCheckedChange={(checked: boolean) =>
                                handleChange("open247", checked)
                            }
                        />
                        <label htmlFor="open247" className="cursor-pointer">
                            Open 24/7
                        </label>
                    </div>

                    {!formData.open247 && (
                        <>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="sameHours"
                                    checked={useSameHours}
                                    onCheckedChange={handleSameHoursToggle}
                                />
                                <label
                                    htmlFor="sameHours"
                                    className="cursor-pointer text-sm"
                                >
                                    Same hours for all days
                                </label>
                            </div>

                            {useSameHours ? (
                                <div className="p-4 rounded-md space-y-2 bg-muted/50">
                                    <Label>Default Hours (All Days)</Label>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="time"
                                            value={defaultHours.open}
                                            onChange={(e) =>
                                                handleDefaultHoursChange(
                                                    "open",
                                                    e.target.value,
                                                )
                                            }
                                            className="flex-1"
                                        />
                                        <span className="text-muted-foreground">
                                            to
                                        </span>
                                        <Input
                                            type="time"
                                            value={defaultHours.close}
                                            onChange={(e) =>
                                                handleDefaultHoursChange(
                                                    "close",
                                                    e.target.value,
                                                )
                                            }
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-md max-h-80 overflow-y-auto bg-muted/50">
                                    <div className="space-y-3">
                                        {DAYS_OF_WEEK.map((day) => (
                                            <div
                                                key={day}
                                                className="flex items-center gap-3"
                                            >
                                                <span className="w-24 text-sm font-medium">
                                                    {day}
                                                </span>
                                                <Input
                                                    type="time"
                                                    value={
                                                        formData.openingHours[
                                                            day
                                                        ].open
                                                    }
                                                    onChange={(e) =>
                                                        handleOpeningHoursChange(
                                                            day,
                                                            "open",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="flex-1"
                                                />
                                                <span className="text-muted-foreground text-sm">
                                                    to
                                                </span>
                                                <Input
                                                    type="time"
                                                    value={
                                                        formData.openingHours[
                                                            day
                                                        ].close
                                                    }
                                                    onChange={(e) =>
                                                        handleOpeningHoursChange(
                                                            day,
                                                            "close",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="flex-1"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            );
        }

        // Step 4: Business Details
        if (currentStep === 4) {
            return (
                <div className="space-y-4">
                    {/* ... (Step 4 content remains the same for functionality) ... */}
                    <div>
                        <h3>Business Details</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Additional information about your business
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="priceTier">Price Tier</Label>
                        <Select
                            value={formData.priceTier}
                            onValueChange={(value) =>
                                handleChange("priceTier", value as PriceTier)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select price tier" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="$">$</SelectItem>
                                <SelectItem value="$$">$$</SelectItem>
                                <SelectItem value="$$$">$$$</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label>Service Options</Label>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="delivery"
                                    checked={formData.offersDelivery}
                                    onCheckedChange={(checked: boolean) =>
                                        handleChange("offersDelivery", checked)
                                    }
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
                                        handleChange("offersPickup", checked)
                                    }
                                />
                                <label
                                    htmlFor="pickup"
                                    className="cursor-pointer"
                                >
                                    Offers Pickup
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Payment Options</Label>
                        <div className="rounded-md p-4 bg-muted/50">
                            <div className="space-y-3">
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
                                        />
                                        <label
                                            htmlFor={payment}
                                            className="text-sm cursor-pointer flex-1"
                                        >
                                            {payment}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Step 5: Review & Submit
        if (currentStep === 5) {
            return (
                <div className="space-y-4">
                    <div>
                        <h3>Review & Submit</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Please review your business information
                        </p>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                        <p className="text-sm text-blue-900 dark:text-blue-200">
                            <strong>Almost done!</strong> Review your
                            information and click "Register Business" to
                            complete.
                        </p>
                    </div>

                    <div className="bg-muted/30 rounded-md p-4 space-y-3 max-h-96 overflow-y-auto">
                        {/* ... Review content remains the same ... */}
                        <div>
                            <p className="text-sm font-medium">
                                Basic Information
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {formData.businessName} ({formData.uen})
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Category: {formData.businessCategory}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {formData.address}
                            </p>
                        </div>

                        <div className="border-t pt-3">
                            <p className="text-sm font-medium">Contact</p>
                            <p className="text-sm text-muted-foreground">
                                {formData.email} • {formData.phoneNumber}
                            </p>
                            {formData.website && (
                                <p className="text-sm text-muted-foreground">
                                    Website: {formData.website}
                                </p>
                            )}
                        </div>

                        <div className="border-t pt-3">
                            <p className="text-sm font-medium">
                                Operating Hours
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {formData.open247 ? "24/7" : "Custom hours set"}
                            </p>
                        </div>

                        {formData.priceTier && (
                            <div className="border-t pt-3">
                                <p className="text-sm font-medium">
                                    Price Tier
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {formData.priceTier}
                                </p>
                            </div>
                        )}

                        {formData.paymentOptions.length > 0 && (
                            <div className="border-t pt-3">
                                <p className="text-sm font-medium">
                                    Payment Options
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {formData.paymentOptions.join(", ")}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (!isOpen) {
                    setCurrentStep(1);
                    setError("");
                }
            }}
        >
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-primary hover:bg-primary/90">
                        <Building2 className="w-4 h-4 mr-2" />
                        Add Business
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        Register Your Business
                    </DialogTitle>
                    <DialogDescription>
                        Add your business to LocaLoco and start reaching more
                        customers in your community.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step Indicator */}
                    {renderStepIndicator()}

                    {/* Error Display - Adjusted style to match EditProfileDialog */}
                    {error && (
                        <div
                            className={`border px-4 py-3 rounded text-sm ${
                                // isDarkMode // If available, use this check:
                                false // Assuming light mode styling if isDarkMode is unavailable
                                    ? "bg-red-900/20 border-red-800 text-red-300"
                                    : "bg-red-50 border-red-200 text-red-700"
                            }`}
                        >
                            {error}
                        </div>
                    )}

                    {/* Form Content */}
                    <div className="max-h-[50vh] overflow-y-auto pr-2">
                        {renderStep()}
                    </div>

                    {/* Navigation Buttons placed inside DialogFooter */}
                    <DialogFooter>
                        <div className="flex w-full gap-3">
                            {currentStep > 1 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handlePrevious}
                                    className="flex-1"
                                    disabled={saving} // Disable while saving
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" />
                                    Previous
                                </Button>
                            )}

                            {currentStep === totalSteps ? (
                                <Button
                                    type="submit"
                                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                                    disabled={saving} // Disable while saving
                                >
                                    {saving
                                        ? "Registering..."
                                        : "Register Business"}
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleNext();
                                    }}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                                    disabled={saving} // Disable while saving
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
