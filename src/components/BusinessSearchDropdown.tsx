import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "./ui/input";
import { useBusinesses } from "../hooks/useBusinesses";
import { useThemeStore } from "../store/themeStore";

interface BusinessSearchDropdownProps {
    value: string;
    onChange: (value: string, uen?: string) => void;
    placeholder?: string;
    limit?: number;
}

export function BusinessSearchDropdown({
    value,
    onChange,
    placeholder = "Tag/Business Name (optional)",
    limit = 5,
}: BusinessSearchDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    const { businesses } = useBusinesses();

    const filteredBusinesses = businesses
        .filter((business) =>
            business.name.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        .slice(0, limit);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Sync internal state with external value prop
    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSearchTerm(newValue);
        onChange(newValue);
        setIsOpen(true);
    };

    const handleSelectBusiness = (
        businessName: string,
        businessUen: string,
    ) => {
        setSearchTerm(businessName);
        onChange(businessName, businessUen);
        setIsOpen(false);
    };

    const handleInputFocus = () => {
        setIsOpen(true);
    };

    const bgColor = isDarkMode ? "#2a2a2a" : "#ffffff";
    const textColor = isDarkMode ? "text-white" : "text-black";
    const hoverBgColor = isDarkMode ? "#3a3a3a" : "#f3f4f6";
    const borderColor = isDarkMode ? "border-gray-700" : "border-gray-200";

    return (
        <div ref={dropdownRef} className="relative w-full">
            {/* Input Field */}
            <div className="relative">
                <Input
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    className={`${textColor} ${isDarkMode ? "bg-[#2a2a2a] border-gray-700" : "bg-input-background"} pr-12`}
                />
                <ChevronDown
                    className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${textColor} transition-transform ${isOpen ? "rotate-180" : ""} pointer-events-none opacity-60`}
                />
            </div>

            {/* Dropdown List */}
            {isOpen && (
                <div
                    className={`absolute z-50 w-full mt-1 rounded-md shadow-lg border ${borderColor} max-h-60 overflow-auto`}
                    style={{ backgroundColor: bgColor }}
                >
                    {filteredBusinesses.length > 0 ? (
                        <>
                            <ul className="py-1">
                                {filteredBusinesses.map((business) => (
                                    <li
                                        key={business.uen}
                                        onClick={() =>
                                            handleSelectBusiness(
                                                business.name,
                                                business.uen,
                                            )
                                        }
                                        className={`px-4 py-2 cursor-pointer transition-colors ${textColor}`}
                                        style={{
                                            backgroundColor: bgColor,
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                hoverBgColor;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                bgColor;
                                        }}
                                    >
                                        <div className="font-medium">
                                            {business.name}
                                        </div>
                                        <div
                                            className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                                        >
                                            {business.category} •{" "}
                                            {business.address}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <div
                                className={`px-4 py-2 text-xs text-center border-t ${borderColor} ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}
                            >
                                Showing top {limit} results
                            </div>
                        </>
                    ) : (
                        <div
                            className={`px-4 py-3 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}
                        >
                            {searchTerm
                                ? "No businesses found"
                                : "Start typing to search..."}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
