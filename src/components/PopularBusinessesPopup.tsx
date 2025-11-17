import React from "react";
import { Star, TrendingUp, X } from "lucide-react";
import { Business } from "../types/business";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface PopularBusinessesPopupProps {
    open: boolean;
    businesses: Business[];
    onClose: () => void;
    onViewBusiness: (business: Business) => void;
}

export function PopularBusinessesPopup({
    open,
    businesses,
    onClose,
    onViewBusiness,
}: PopularBusinessesPopupProps) {
    if (!open) return null;

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`w-3 h-3 ${
                    i < Math.floor(rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                }`}
            />
        ));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Popular Businesses This Week
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="h-8 w-8 p-0"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="overflow-y-auto">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {businesses.map((business, index) => (
                            <div
                                key={business.uen}
                                className="flex gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => onViewBusiness(business)}
                            >
                                <div className="relative">
                                    <ImageWithFallback
                                        src={business.image}
                                        alt={business.name}
                                        className="w-16 h-16 rounded-lg object-cover"
                                    />
                                    <Badge
                                        variant="secondary"
                                        className="absolute -top-1 -left-1 bg-primary text-primary-foreground text-xs px-1"
                                    >
                                        #{index + 1}
                                    </Badge>
                                </div>

                                <div className="flex-1 space-y-1">
                                    <div className="flex items-start justify-between">
                                        <h4 className="font-medium text-sm line-clamp-1">
                                            {business.name}
                                        </h4>
                                        <div className="flex items-center gap-1">
                                            {/* ✅ Add ?? 0 to handle undefined rating */}
                                            <div className="flex">
                                                {renderStars(
                                                    business.rating ?? 0,
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                ({business.reviewCount ?? 0})
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                        {business.description}
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="outline"
                                            className="text-xs"
                                        >
                                            {business.subcategory}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {business.priceRange}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
