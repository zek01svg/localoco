import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Store, X } from "lucide-react";
import { Business } from "../types/business";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
    GoogleMap,
    Marker,
    InfoWindow,
    useLoadScript,
} from "@react-google-maps/api";
import { useBusinessStore } from "../store/businessStore";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { BusinessSearchDropdown } from "./BusinessSearchDropdown";

const mapContainerStyle = {
    width: "100%",
    height: "100%",
};

const defaultCenter = { lat: 1.3521, lng: 103.8198 }; // Singapore fallback

export function MapDiscoveryPage() {
    const navigate = useNavigate();
    const mapRef = useRef<google.maps.Map | null>(null);
    const businesses = useBusinessStore((state) => state.businesses);
    const setSelectedBusiness = useBusinessStore(
        (state) => state.setSelectedBusiness,
    );
    const logout = useAuthStore((state) => state.logout);
    const isDarkMode = useThemeStore((state) => state.isDarkMode);

    const safeBusinesses: Business[] = Array.isArray(businesses)
        ? businesses
        : [];

    const pageBg = isDarkMode ? "#3a3a3a" : "#f9fafb";
    const panelBg = isDarkMode ? "#2a2a2a" : "#ffffff";
    const railBg = isDarkMode ? "#3a3a3a" : "#f9fafb";
    const borderTone = isDarkMode ? "border-gray-600" : "border-gray-300";
    const textMain = isDarkMode ? "text-white" : "text-black";
    const textMuted = isDarkMode ? "text-gray-400" : "text-gray-600";
    const inputText = isDarkMode
        ? "text-white placeholder:text-gray-400"
        : "text-black placeholder:text-gray-500";

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPin, setSelectedPin] = useState<Business | null>(null);
    const [userLocation, setUserLocation] = useState<{
        lat: number;
        lng: number;
    } | null>(null);
    const [businessesWithCoords, setBusinessesWithCoords] = useState<
        (Business & { lat?: number; lng?: number })[]
    >([]);
    const [showUserInfo, setShowUserInfo] = useState(false);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: "AIzaSyBEJP1GmEezTaIfMFZ-eT36PkiF3s9UgQg",
    });

    // Get user location
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const location = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                    };
                    setUserLocation(location);
                },
                (err) => console.warn("📍 Geolocation failed:", err),
            );
        } else {
            console.warn("📍 Geolocation not supported by browser");
        }
    }, []);

    // Detect screen size for responsive padding
    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 768);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // --- Fetch businesses from backend ---
    useEffect(() => {
        if (!isLoaded) {
            return;
        }

        const fetchBusinesses = async () => {
            try {
                const response = await fetch("/api/businesses");
                const data: Business[] = await response.json();

                const geocoder = new (window as any).google.maps.Geocoder();

                const results: (Business & { lat?: number; lng?: number })[] =
                    [];

                await Promise.all(
                    data.map(async (b) => {
                        const lat = b.latitude ? Number(b.latitude) : undefined;
                        const lng = b.longitude
                            ? Number(b.longitude)
                            : undefined;

                        if (lat != null && lng != null) {
                            results.push({ ...b, lat, lng });
                            return;
                        }

                        if (!b.address) {
                            results.push(b);
                            return;
                        }

                        const res: any = await new Promise((resolve) => {
                            geocoder.geocode(
                                { address: b.address },
                                (geoResults: any, status: any) => {
                                    if (status === "OK" && geoResults[0]) {
                                        const loc =
                                            geoResults[0].geometry.location;
                                        resolve({
                                            lat: loc.lat(),
                                            lng: loc.lng(),
                                        });
                                    } else {
                                        console.warn(
                                            `❌ Geocode failed for ${b.businessName}:`,
                                            status,
                                        );
                                        resolve(null);
                                    }
                                },
                            );
                        });

                        if (res) {
                            results.push({ ...b, lat: res.lat, lng: res.lng });
                        } else {
                            results.push(b);
                        }
                    }),
                );

                setBusinessesWithCoords(results);
            } catch (err) {}
        };

        fetchBusinesses();
    }, [isLoaded]);

    // Filter businesses based on search term for both cards and map pins
    const filteredBusinesses = (
        searchTerm
            ? businessesWithCoords.filter((b) => {
                  const q = searchTerm.toLowerCase();
                  const name = b.businessName?.toLowerCase() || "";
                  const category = b.businessCategory?.toLowerCase() || "";
                  const address = b.address?.toLowerCase() || "";
                  const description = b.description?.toLowerCase() || "";

                  return (
                      name.includes(q) ||
                      category.includes(q) ||
                      address.includes(q) ||
                      description.includes(q)
                  );
              })
            : businessesWithCoords
    ).slice(0, 50);

    // Compute nearest 5 businesses robustly (only for non-search mode)
    const nearestUENs = new Set<string>();
    if (userLocation && businessesWithCoords.length > 0 && !searchTerm) {
        const withCoords = businessesWithCoords.filter(
            (b) => b.lat !== undefined && b.lng !== undefined,
        );

        const distances = withCoords.map((b) => ({
            uen: b.uen,
            distance: haversineDistance(
                userLocation.lat,
                userLocation.lng,
                b.lat!,
                b.lng!,
            ),
        }));
        distances.sort((a, b) => a.distance - b.distance);
        distances.slice(0, 5).forEach((b) => nearestUENs.add(b.uen));
    }

    const handleBusinessClick = (business: Business) => {
        setSelectedBusiness(business);
        navigate(`/business/${business.uen}`);
    };

    const handleLogout = () => {
        if (confirm("Are you sure you want to log out?")) {
            logout();
            navigate("/");
        }
    };

    const handleShowOnMap = (b: Business & { lat?: number; lng?: number }) => {
        setSelectedPin(b);
        if (b.lat && b.lng && mapRef.current) {
            mapRef.current.panTo({ lat: b.lat, lng: b.lng });
            mapRef.current.setZoom(17);
        }
    };

    // Clear selected pin when search changes
    useEffect(() => {
        if (searchTerm) {
            setSelectedPin(null);
        }
    }, [searchTerm]);

    if (loadError) {
        return <div className="text-red-500">Map cannot load</div>;
    }

    if (!isLoaded) {
        return <div>Loading map...</div>;
    }

    return (
        <div
            className="h-screen w-full flex flex-col"
            style={{ backgroundColor: pageBg }}
        >
            {/* --- MAP SECTION --- */}
            <div className="relative flex-1 flex justify-center items-center p-4">
                <div
                    className={`w-full h-full rounded-lg shadow-lg border ${borderTone}`}
                    style={{ overflow: "hidden" }}
                >
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        zoom={userLocation ? 16 : 14}
                        center={userLocation ?? defaultCenter}
                        onLoad={(map) => {
                            mapRef.current = map;
                        }}
                        options={{
                            styles: undefined,
                            streetViewControl: false,
                            mapTypeControl: false,
                            fullscreenControl: true,
                            fullscreenControlOptions: {
                                position: google.maps.ControlPosition.RIGHT_TOP,
                            },
                            zoomControlOptions: {
                                position: google.maps.ControlPosition.RIGHT_TOP,
                            },
                        }}
                    >
                        {/* LEGEND CARD INSIDE MAP */}
                        <div
                            key={isDarkMode ? "dark" : "light"}
                            className={`absolute z-10 p-3 rounded-lg shadow-lg`}
                            style={{
                                backgroundColor: panelBg,
                                top: "55px",
                                left: "10px",
                            }}
                        >
                            <div className="flex flex-col gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <img
                                        src="http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                                        alt="User Location"
                                        className="w-4 h-4"
                                    />
                                    <span className={textMain}>
                                        Your location
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <img
                                        src="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                                        alt="Nearest Business"
                                        className="w-4 h-4"
                                    />
                                    <span className={textMain}>
                                        Nearest businesses
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <img
                                        src="http://maps.google.com/mapfiles/ms/icons/pink-dot.png"
                                        alt="Selected Business"
                                        className="w-4 h-4"
                                    />
                                    <span className={textMain}>
                                        Selected business
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Center on User Button */}
                        {userLocation && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "55px",
                                    right: "10px",
                                    zIndex: 10,
                                }}
                            >
                                <button
                                    onClick={() => {
                                        if (mapRef.current && userLocation) {
                                            mapRef.current.panTo(userLocation);
                                            mapRef.current.setZoom(16);
                                        }
                                    }}
                                    className="p-2 rounded-full bg-white shadow-lg hover:bg-gray-100"
                                    title="Go to my location"
                                >
                                    <img
                                        src="http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                                        alt="My Location"
                                        className="w-6 h-6"
                                    />
                                </button>
                            </div>
                        )}

                        {/* User marker (green) */}
                        {userLocation && (
                            <>
                                <Marker
                                    position={userLocation}
                                    icon={{
                                        url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
                                    }}
                                    onClick={() => {
                                        setShowUserInfo(true);
                                    }}
                                />
                                {showUserInfo && (
                                    <InfoWindow
                                        position={userLocation}
                                        onCloseClick={() =>
                                            setShowUserInfo(false)
                                        }
                                    >
                                        <div className="text-sm font-medium text-gray-800">
                                            You are here
                                        </div>
                                    </InfoWindow>
                                )}
                            </>
                        )}

                        {/* Business pins - ONLY SHOW FILTERED BUSINESSES */}
                        {filteredBusinesses.map((b) => {
                            if (b.lat === undefined || b.lng === undefined) {
                                return null;
                            }

                            const isSelected =
                                selectedPin && selectedPin.uen === b.uen;
                            const isNearest =
                                nearestUENs.has(b.uen) && !searchTerm;

                            const baseColor = isNearest
                                ? "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                                : "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
                            const iconUrl = isSelected
                                ? "http://maps.google.com/mapfiles/ms/icons/pink-dot.png"
                                : baseColor;

                            return (
                                <Marker
                                    key={b.uen}
                                    position={{ lat: b.lat, lng: b.lng }}
                                    onClick={() => {
                                        setSelectedPin(b);
                                    }}
                                    icon={{ url: iconUrl }}
                                />
                            );
                        })}
                    </GoogleMap>

                    {/* Selected-pin mini card */}
                    {selectedPin && (
                        <div className="absolute bottom-6 left-6 z-10 max-w-sm">
                            <Card
                                className={`p-4 ${borderTone}`}
                                style={{ backgroundColor: panelBg }}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <Store className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3
                                                className={`text-lg font-semibold ${textMain}`}
                                            >
                                                {selectedPin.businessName}
                                            </h3>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className={`${borderTone} ${
                                                    isDarkMode
                                                        ? "text-white hover:bg-neutral-800"
                                                        : "text-gray-900 hover:bg-gray-100"
                                                }`}
                                                onClick={() => {
                                                    setSelectedPin(null);
                                                }}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div
                                            className={`mt-1 text-sm ${textMuted}`}
                                        >
                                            {selectedPin.businessCategory}
                                            {selectedPin.priceRange
                                                ? ` · ${selectedPin.priceRange}`
                                                : ""}
                                        </div>
                                        {selectedPin.address && (
                                            <div
                                                className={`mt-1 text-xs ${textMuted}`}
                                            >
                                                {selectedPin.address}
                                            </div>
                                        )}

                                        {userLocation &&
                                            selectedPin.lat &&
                                            selectedPin.lng && (
                                                <div
                                                    className={`mt-1 text-xs ${textMuted}`}
                                                >
                                                    {haversineDistance(
                                                        userLocation.lat,
                                                        userLocation.lng,
                                                        selectedPin.lat,
                                                        selectedPin.lng,
                                                    ).toFixed(2)}{" "}
                                                    km away
                                                </div>
                                            )}

                                        <div className="mt-3">
                                            <Button
                                                onClick={() =>
                                                    handleBusinessClick(
                                                        selectedPin,
                                                    )
                                                }
                                                className="bg-primary hover:bg-primary/90 text-white"
                                            >
                                                View details
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            {/* LOWER PANEL */}
            <div
                className={`shrink-0 border-t ${borderTone}`}
                style={{ backgroundColor: railBg, height: "52vh" }}
            >
                <div className="max-w-none mx-auto h-full flex flex-col gap-3 px-4 pt-4 pb-4">
                    <div>
                        <BusinessSearchDropdown
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="Search businesses…"
                            limit={3}
                        />
                        <div className={`mt-2 text-xs ${textMuted}`}>
                            {searchTerm.trim()
                                ? `Found ${filteredBusinesses.length} result${filteredBusinesses.length !== 1 ? "s" : ""}`
                                : `${safeBusinesses.length} businesses nearby`}
                        </div>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {filteredBusinesses.map((b, index) => (
                                <Card
                                    key={b.uen || `business-${index}`}
                                    className={`p-4 hover:shadow ${borderTone}`}
                                    style={{ backgroundColor: panelBg }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-primary/10 rounded-md">
                                            <Store className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between gap-3">
                                                <h3
                                                    className={`text-base font-semibold ${textMain}`}
                                                >
                                                    {b.businessName}
                                                </h3>
                                                {b.businessCategory && (
                                                    <Badge variant="secondary">
                                                        {b.businessCategory}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div
                                                className={`mt-1 text-sm ${textMuted}`}
                                            >
                                                {(b.priceRange
                                                    ? `${b.priceRange} · `
                                                    : "") + (b.address ?? "")}
                                            </div>
                                            <div className="mt-3 flex items-center gap-2">
                                                <Button
                                                    onClick={() =>
                                                        handleBusinessClick(b)
                                                    }
                                                    className="bg-primary hover:bg-primary/90 text-white"
                                                >
                                                    View details
                                                </Button>
                                                <Button
                                                    onClick={() =>
                                                        handleShowOnMap(b)
                                                    }
                                                    className="bg-primary hover:bg-primary/90 text-white"
                                                >
                                                    Show on map
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            {filteredBusinesses.length === 0 && (
                                <div
                                    className={`text-sm py-8 text-center ${textMuted}`}
                                >
                                    No results.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper: compute distance
function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
