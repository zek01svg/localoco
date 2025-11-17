import React from "react";
import { Search, Filter, Clock, ChevronDown } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useThemeStore } from "../store/themeStore";
import { BusinessSearchDropdown } from "./BusinessSearchDropdown";

interface SearchBarProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedCategories: string[];
    onCategoriesChange: (value: string[]) => void;
    selectedPrices: string[];
    onPricesChange: (value: string[]) => void;
    openNowOnly: boolean;
    onOpenNowChange: (value: boolean) => void;
}

export function SearchBar({
    searchTerm,
    onSearchChange,
    selectedCategories,
    onCategoriesChange,
    selectedPrices,
    onPricesChange,
    openNowOnly,
    onOpenNowChange,
}: SearchBarProps) {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);

    const bgColor = isDarkMode ? "#2a2a2a" : "#ffffff";
    const textColor = isDarkMode ? "text-white" : "text-black";
    const borderColor = isDarkMode ? "border-gray-700" : "border-gray-200";
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

    const totalFilters =
        selectedCategories.length +
        selectedPrices.length +
        (openNowOnly ? 1 : 0);

    const getCategoryLabel = () => {
        if (selectedCategories.length === 0) return "All Categories";
        if (selectedCategories.length === 1) {
            return (
                categories.find((c) => c.value === selectedCategories[0])
                    ?.label || "Category"
            );
        }
        return `${selectedCategories.length} Categories`;
    };

    const getPriceLabel = () => {
        if (selectedPrices.length === 0) return "All Prices";
        if (selectedPrices.length === 1) {
            return selectedPrices[0];
        }
        return `${selectedPrices.length} Prices`;
    };

    return (
        <div
            className={`p-6 rounded-lg shadow-sm ${borderColor}`}
            style={{ backgroundColor: bgColor }}
        >
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <BusinessSearchDropdown
                            value={searchTerm}
                            onChange={(value) => onSearchChange(value)}
                            placeholder="Search businesses by name..."
                            limit={5}
                        />
                    </div>

                    {/* Category Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className={`w-full md:w-48 justify-between ${textColor} ${isDarkMode ? "bg-[#2a2a2a] border-gray-700" : "bg-input-background"}`}
                            >
                                {getCategoryLabel()}
                                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64 p-4" align="start">
                            <div className="space-y-3">
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {categories.map((cat) => (
                                        <div
                                            key={cat.value}
                                            className="flex items-center space-x-2"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Checkbox
                                                id={`search-category-${cat.value}`}
                                                checked={selectedCategories.includes(
                                                    cat.value,
                                                )}
                                                onCheckedChange={() =>
                                                    handleCategoryToggle(
                                                        cat.value,
                                                    )
                                                }
                                            />
                                            <label
                                                htmlFor={`search-category-${cat.value}`}
                                                className="text-sm cursor-pointer select-none flex-1"
                                            >
                                                {cat.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {selectedCategories.length > 0 && (
                                    <div className="pt-2 border-t">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCategoriesChange([]);
                                            }}
                                            className="w-full"
                                        >
                                            Clear Selection
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Price Filter */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className={`w-full md:w-32 justify-between ${textColor} ${isDarkMode ? "bg-[#2a2a2a] border-gray-700" : "bg-input-background"}`}
                            >
                                {getPriceLabel()}
                                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48 p-4" align="start">
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    {priceOptions.map((price) => (
                                        <div
                                            key={price.value}
                                            className="flex items-center space-x-2"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Checkbox
                                                id={`search-price-${price.value}`}
                                                checked={selectedPrices.includes(
                                                    price.value,
                                                )}
                                                onCheckedChange={() =>
                                                    handlePriceToggle(
                                                        price.value,
                                                    )
                                                }
                                            />
                                            <label
                                                htmlFor={`search-price-${price.value}`}
                                                className="text-sm cursor-pointer select-none flex-1"
                                            >
                                                {price.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {selectedPrices.length > 0 && (
                                    <div className="pt-2 border-t">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPricesChange([]);
                                            }}
                                            className="w-full"
                                        >
                                            Clear Selection
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center space-x-2 whitespace-nowrap">
                        <Switch
                            id="open-now"
                            checked={openNowOnly}
                            onCheckedChange={onOpenNowChange}
                        />
                        <Label
                            htmlFor="open-now"
                            className={`flex items-center gap-1 ${textColor}`}
                        >
                            <Clock className="w-4 h-4" />
                            Open Now
                        </Label>
                    </div>
                </div>

                {totalFilters > 0 && (
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary"
                        >
                            {totalFilters}{" "}
                            {totalFilters === 1 ? "filter" : "filters"} active
                        </Badge>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                onCategoriesChange([]);
                                onPricesChange([]);
                                onOpenNowChange(false);
                            }}
                            className="h-7 px-2 text-xs"
                        >
                            Clear all
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
