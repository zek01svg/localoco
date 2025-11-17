import React, { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Business } from "../types/business";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

interface MapPlaceholderProps {
    business: Business;
}

export function MapPlaceholder({ business }: MapPlaceholderProps) {
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const address = business.address || "Marina Bay Sands, Singapore";

    useEffect(() => {
        const fetchCoordinates = async () => {
            try {
                const response = await fetch(
                    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                        address,
                    )}&key=AIzaSyBEJP1GmEezTaIfMFZ-eT36PkiF3s9UgQg`,
                );
                const data = await response.json();

                if (data.status === "OK" && data.results.length > 0) {
                    const location = data.results[0].geometry.location;
                    setCoords({ lat: location.lat, lng: location.lng });
                } else {
                    setError("Unable to find coordinates for this address.");
                }
            } catch (err) {
                setError("Failed to fetch map data.");
            } finally {
                setLoading(false);
            }
        };

        fetchCoordinates();
    }, [address]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Location & Directions
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Map or loading/error message */}
                    {loading ? (
                        <div className="h-80 flex items-center justify-center text-muted-foreground">
                            Loading map...
                        </div>
                    ) : error ? (
                        <div className="h-80 flex items-center justify-center text-red-500 text-sm">
                            {error}
                        </div>
                    ) : (
                        coords && (
                            <div className="rounded-lg overflow-hidden shadow-sm">
                                <iframe
                                    title="Business Location"
                                    width="100%"
                                    height="300"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    // Embed map with pin marker and business name label
                                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBEJP1GmEezTaIfMFZ-eT36PkiF3s9UgQg&q=${encodeURIComponent(
                                        business.name,
                                    )}+@${coords.lat},${coords.lng}&zoom=15`}
                                />
                            </div>
                        )
                    )}

                    {/* Address */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Address:</p>
                        <p className="text-sm text-muted-foreground">
                            {address}
                        </p>
                    </div>

                    {/* Get Directions */}
                    <Button
                        className="w-full text-foreground"
                        variant="outline"
                        onClick={() =>
                            window.open(
                                `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`,
                                "_blank",
                            )
                        }
                    >
                        <Navigation className="w-4 h-4 mr-2" />
                        Get Directions
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
