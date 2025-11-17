import React from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Checkbox } from "./ui/checkbox";

interface FiltersPanelProps {
    selectedCategories: string[];
    onCategoriesChange: (categories: string[]) => void;
    selectedPrices: string[];
    onPricesChange: (prices: string[]) => void;
    openNowOnly: boolean;
    onOpenNowChange: (value: boolean) => void;
    onClose: () => void;
}

export function FiltersPanel({
    selectedCategories,
    onCategoriesChange,
    selectedPrices,
    onPricesChange,
    openNowOnly,
    onOpenNowChange,
    onClose,
}: FiltersPanelProps) {
    const categories = [
        { value: "fnb", label: "F&B" },
        { value: "retail", label: "Retail" },
        { value: "services", label: "Services" },
        { value: "entertainment", label: "Entertainment" },
        { value: "health-wellness", label: "Health/Wellness" },
        { value: "professional-services", label: "Professional Services" },
        { value: "home-living", label: "Home and Living" },
    ];

    const priceOptions = [
        { value: "$", label: "$" },
        { value: "$$", label: "$$" },
        { value: "$$$", label: "$$$" },
    ];

    const handleCategoryToggle = (categoryValue: string) => {
        if (selectedCategories.includes(categoryValue)) {
            onCategoriesChange(
                selectedCategories.filter((c) => c !== categoryValue),
            );
        } else {
            onCategoriesChange([...selectedCategories, categoryValue]);
        }
    };

    const handlePriceToggle = (priceValue: string) => {
        if (selectedPrices.includes(priceValue)) {
            onPricesChange(selectedPrices.filter((p) => p !== priceValue));
        } else {
            onPricesChange([...selectedPrices, priceValue]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h2>Filters</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="space-y-6">
                    {/* Category Filter */}
                    <div className="space-y-3">
                        <Label className="text-base">Categories</Label>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {categories.map((cat) => (
                                <div
                                    key={cat.value}
                                    className="flex items-center space-x-2"
                                >
                                    <Checkbox
                                        id={`category-${cat.value}`}
                                        checked={selectedCategories.includes(
                                            cat.value,
                                        )}
                                        onCheckedChange={() =>
                                            handleCategoryToggle(cat.value)
                                        }
                                    />
                                    <label
                                        htmlFor={`category-${cat.value}`}
                                        className="text-sm cursor-pointer select-none"
                                    >
                                        {cat.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Price Range Filter */}
                    <div className="space-y-3">
                        <Label className="text-base">Price Range</Label>
                        <div className="space-y-2">
                            {priceOptions.map((price) => (
                                <div
                                    key={price.value}
                                    className="flex items-center space-x-2"
                                >
                                    <Checkbox
                                        id={`price-${price.value}`}
                                        checked={selectedPrices.includes(
                                            price.value,
                                        )}
                                        onCheckedChange={() =>
                                            handlePriceToggle(price.value)
                                        }
                                    />
                                    <label
                                        htmlFor={`price-${price.value}`}
                                        className="text-sm cursor-pointer select-none"
                                    >
                                        {price.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Open Now Filter */}
                    <div className="flex items-center justify-between pt-2 border-t">
                        <Label>Open Now Only</Label>
                        <Switch
                            checked={openNowOnly}
                            onCheckedChange={onOpenNowChange}
                        />
                    </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                            onCategoriesChange([]);
                            onPricesChange([]);
                            onOpenNowChange(false);
                        }}
                    >
                        Clear All
                    </Button>
                    <Button
                        className="flex-1 bg-primary hover:bg-primary/90 text-white"
                        onClick={onClose}
                    >
                        Apply Filters
                    </Button>
                </div>
            </Card>
        </div>
    );
}
