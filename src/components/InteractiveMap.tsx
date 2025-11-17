import React, { useState, useRef } from "react";
import { MapPin, ZoomIn, ZoomOut, Navigation, Search } from "lucide-react";
import { Business } from "../types/business";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface InteractiveMapProps {
    businesses: Business[];
    onBusinessClick: (business: Business) => void;
    onViewListView?: () => void;
}

export function InteractiveMap({
    businesses,
    onBusinessClick,
    onViewListView,
}: InteractiveMapProps) {
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [selectedPin, setSelectedPin] = useState<Business | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);

    // Business positions on the map (Singapore-style layout)
    const businessPositions = businesses.slice(0, 10).map((business, index) => {
        const positions = [
            { x: 52, y: 45 }, // Orchard
            { x: 48, y: 65 }, // CBD
            { x: 60, y: 30 }, // East Coast
            { x: 55, y: 70 }, // Marina Bay
            { x: 45, y: 40 }, // Newton
            { x: 62, y: 55 }, // Katong
            { x: 48, y: 35 }, // Novena
            { x: 58, y: 50 }, // Geylang
            { x: 52, y: 60 }, // Tanjong Pagar
            { x: 50, y: 48 }, // Somerset
        ];
        return {
            business,
            ...positions[index],
        };
    });

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest(".business-pin")) return;
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.2, 3));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.2, 0.5));
    };

    const handleRecenter = () => {
        setPosition({ x: 0, y: 0 });
        setZoom(1);
    };

    const handlePinClick = (business: Business) => {
        setSelectedPin(business);
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-blue-50 to-green-50">
            {/* Search Bar */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-2xl px-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                        type="text"
                        placeholder="Search for businesses on map..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setShowSearch(true)}
                        className="pl-12 pr-4 h-12 bg-white rounded-full shadow-lg border-primary/20 text-foreground"
                    />
                </div>

                {showSearch && (
                    <Card className="mt-2 p-4 shadow-xl max-h-80 overflow-auto">
                        <div className="space-y-3">
                            {searchTerm && (
                                <div className="space-y-2 pb-3 border-b">
                                    {businesses
                                        .filter((b) =>
                                            b.name
                                                .toLowerCase()
                                                .includes(
                                                    searchTerm.toLowerCase(),
                                                ),
                                        )
                                        .slice(0, 5)
                                        .map((business) => (
                                            <button
                                                key={business.uen}
                                                onClick={() => {
                                                    setSelectedPin(business);
                                                    setShowSearch(false);
                                                }}
                                                className="w-full text-left p-2 hover:bg-accent rounded-md transition-colors"
                                            >
                                                <p className="font-medium">
                                                    {business.name}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {business.address}
                                                </p>
                                            </button>
                                        ))}
                                </div>
                            )}
                            {onViewListView && (
                                <Button
                                    onClick={() => {
                                        onViewListView();
                                        setShowSearch(false);
                                    }}
                                    className="w-full bg-primary hover:bg-primary/90 text-white"
                                >
                                    View All Businesses (List View)
                                </Button>
                            )}
                        </div>
                    </Card>
                )}
            </div>

            {/* Interactive Map Container */}
            <div
                ref={mapRef}
                className="w-full h-full cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Map Background with Streets Pattern */}
                <div
                    className="absolute inset-0 transition-transform duration-200"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                        transformOrigin: "center center",
                    }}
                >
                    {/* Streets Pattern */}
                    <svg
                        className="w-full h-full"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <pattern
                                id="streets"
                                x="0"
                                y="0"
                                width="100"
                                height="100"
                                patternUnits="userSpaceOnUse"
                            >
                                <path
                                    d="M 0 50 L 100 50 M 50 0 L 50 100"
                                    stroke="#CBD5E0"
                                    strokeWidth="2"
                                    fill="none"
                                />
                                <path
                                    d="M 0 25 L 100 25 M 0 75 L 100 75 M 25 0 L 25 100 M 75 0 L 75 100"
                                    stroke="#E2E8F0"
                                    strokeWidth="1"
                                    fill="none"
                                />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#streets)" />

                        {/* Main Roads */}
                        <line
                            x1="10%"
                            y1="45%"
                            x2="90%"
                            y2="45%"
                            stroke="#94A3B8"
                            strokeWidth="4"
                        />
                        <line
                            x1="10%"
                            y1="65%"
                            x2="90%"
                            y2="65%"
                            stroke="#94A3B8"
                            strokeWidth="4"
                        />
                        <line
                            x1="45%"
                            y1="10%"
                            x2="45%"
                            y2="90%"
                            stroke="#94A3B8"
                            strokeWidth="4"
                        />
                        <line
                            x1="58%"
                            y1="10%"
                            x2="58%"
                            y2="90%"
                            stroke="#94A3B8"
                            strokeWidth="4"
                        />

                        {/* Parks/Green Spaces */}
                        <circle
                            cx="30%"
                            cy="30%"
                            r="8%"
                            fill="#86EFAC"
                            opacity="0.3"
                        />
                        <circle
                            cx="70%"
                            cy="35%"
                            r="6%"
                            fill="#86EFAC"
                            opacity="0.3"
                        />
                        <circle
                            cx="65%"
                            cy="75%"
                            r="7%"
                            fill="#86EFAC"
                            opacity="0.3"
                        />

                        {/* Water Body */}
                        <ellipse
                            cx="55%"
                            cy="70%"
                            rx="12%"
                            ry="8%"
                            fill="#93C5FD"
                            opacity="0.4"
                        />
                    </svg>

                    {/* Business Pins */}
                    {businessPositions.map(({ business, x, y }) => (
                        <div
                            key={business.uen}
                            className="business-pin absolute transform -translate-x-1/2 -translate-y-full"
                            style={{ left: `${x}%`, top: `${y}%` }}
                        >
                            <button
                                onClick={() => handlePinClick(business)}
                                className="transition-transform hover:scale-125 relative"
                            >
                                <MapPin
                                    className={`w-10 h-10 drop-shadow-lg ${
                                        selectedPin?.id === business.uen
                                            ? "text-primary fill-primary"
                                            : "text-red-500 fill-red-500"
                                    }`}
                                />
                                {/* Pulse animation for selected pin */}
                                {selectedPin?.id === business.uen && (
                                    <div className="absolute inset-0 animate-ping">
                                        <MapPin className="w-10 h-10 text-primary fill-primary opacity-75" />
                                    </div>
                                )}
                            </button>

                            {/* Business Info Card */}
                            {selectedPin?.id === business.uen && (
                                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-72 z-50">
                                    <Card className="p-4 shadow-2xl border-2 border-primary">
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-medium">
                                                    {business.name}
                                                </h3>
                                                <Badge className="text-xs bg-primary text-white">
                                                    {business.priceRange}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {business.description}
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin className="w-4 h-4" />
                                                <span className="line-clamp-1">
                                                    {business.address}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={(
                                                        e: React.MouseEvent,
                                                    ) => {
                                                        e.stopPropagation();
                                                        onBusinessClick(
                                                            business,
                                                        );
                                                    }}
                                                    className="flex-1 bg-primary hover:bg-primary/90 text-white"
                                                >
                                                    View Details
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(
                                                        e: React.MouseEvent,
                                                    ) => {
                                                        e.stopPropagation();
                                                        setSelectedPin(null);
                                                    }}
                                                    className="text-foreground"
                                                >
                                                    Close
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-24 right-6 z-30 flex flex-col gap-2">
                <Button
                    size="icon"
                    onClick={handleZoomIn}
                    className="bg-white hover:bg-gray-100 text-gray-800 shadow-lg w-12 h-12"
                >
                    <ZoomIn className="w-5 h-5" />
                </Button>
                <Button
                    size="icon"
                    onClick={handleZoomOut}
                    className="bg-white hover:bg-gray-100 text-gray-800 shadow-lg w-12 h-12"
                >
                    <ZoomOut className="w-5 h-5" />
                </Button>
            </div>

            {/* Current Location / Recenter Button */}
            <div className="absolute bottom-6 right-6 z-30">
                <Button
                    size="icon"
                    onClick={handleRecenter}
                    className="bg-primary hover:bg-primary/90 text-white shadow-lg w-12 h-12"
                >
                    <Navigation className="w-5 h-5" />
                </Button>
            </div>

            {/* Map Legend */}
            <div className="absolute bottom-6 left-24 z-30">
                <Card className="px-4 py-3 bg-white/95 backdrop-blur-sm">
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-red-500 fill-red-500" />
                            <span>Business</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary fill-primary" />
                            <span>Selected</span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                            Drag to pan • Scroll to zoom
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
