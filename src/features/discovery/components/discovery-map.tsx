import type { Listing } from "#shared/contracts/listings";
import type { MapBounds } from "../hooks/use-listings";

import { APIProvider, InfoWindow, Map, Marker } from "@vis.gl/react-google-maps";
import { MapPinOffIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import React, { useCallback, useState } from "react";

import { Badge } from "#client/components/ui/badge";
import { Button } from "#client/components/ui/button";
import { env } from "#client/env";

export interface DiscoveryMapProps {
  items: Listing[];
  activeBounds: MapBounds | null;
  onBoundsChange: (bounds: MapBounds | null) => void;
  selectedId: string | null;
  onSelectListing: (id: string | null) => void;
}

const SINGAPORE_CENTER = { lat: 1.3521, lng: 103.8198 };
const DEFAULT_ZOOM = 12;

function MapDegradedState({ message }: { message: string }) {
  return (
    <section
      aria-label="Map status"
      className="border-border bg-muted/30 flex h-full min-h-[350px] w-full flex-col items-center justify-center rounded-lg border p-6 text-center"
    >
      <MapPinOffIcon aria-hidden="true" className="text-muted-foreground mb-3 size-10" />
      <h2 className="text-base font-semibold">Map unavailable</h2>
      <p className="text-muted-foreground mt-1 max-w-xs text-sm">{message}</p>
    </section>
  );
}

class MapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <MapDegradedState message="The interactive map could not be loaded. You can still search and browse all listings in the directory." />
      );
    }
    return this.props.children;
  }
}

function InnerMap({
  items,
  activeBounds,
  onBoundsChange,
  selectedId,
  onSelectListing,
}: DiscoveryMapProps) {
  const [currentCameraBounds, setCurrentCameraBounds] = useState<MapBounds | null>(null);
  const [hasMovedCamera, setHasMovedCamera] = useState(false);

  const handleCameraChange = useCallback(
    (ev: {
      detail: { bounds?: { north?: number; south?: number; east?: number; west?: number } };
    }) => {
      const b = ev.detail.bounds;
      if (
        b &&
        typeof b.north === "number" &&
        typeof b.south === "number" &&
        typeof b.east === "number" &&
        typeof b.west === "number"
      ) {
        setCurrentCameraBounds({
          north: b.north,
          south: b.south,
          east: b.east,
          west: b.west,
        });
        setHasMovedCamera(true);
      }
    },
    []
  );

  const handleSearchThisArea = useCallback(() => {
    if (currentCameraBounds) {
      onBoundsChange(currentCameraBounds);
      setHasMovedCamera(false);
    }
  }, [currentCameraBounds, onBoundsChange]);

  const handleResetBounds = useCallback(() => {
    onBoundsChange(null);
    setHasMovedCamera(false);
  }, [onBoundsChange]);

  const selectedListing = items.find(item => item.id === selectedId);

  // Filter listings with valid coordinates
  const markers = items.filter(
    (item): item is Listing & { latitude: number; longitude: number } =>
      typeof item.latitude === "number" &&
      typeof item.longitude === "number" &&
      Number.isFinite(item.latitude) &&
      Number.isFinite(item.longitude)
  );

  return (
    <div className="border-border relative h-full min-h-[400px] w-full overflow-hidden rounded-lg border">
      <Map
        defaultCenter={SINGAPORE_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        onCameraChanged={handleCameraChange}
        gestureHandling="greedy"
        disableDefaultUI={false}
        className="h-full w-full"
      >
        {markers.map(item => (
          <Marker
            key={item.id}
            position={{ lat: item.latitude, lng: item.longitude }}
            title={item.name}
            onClick={() => {
              onSelectListing(item.id === selectedId ? null : item.id);
            }}
          />
        ))}

        {selectedListing &&
          typeof selectedListing.latitude === "number" &&
          typeof selectedListing.longitude === "number" && (
            <InfoWindow
              position={{
                lat: selectedListing.latitude,
                lng: selectedListing.longitude,
              }}
              onCloseClick={() => {
                onSelectListing(null);
              }}
            >
              <div className="text-foreground max-w-[200px] p-1">
                <p className="text-sm font-semibold">{selectedListing.name}</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  {selectedListing.category}
                </Badge>
                <p className="text-muted-foreground mt-1 text-xs">{selectedListing.address}</p>
              </div>
            </InfoWindow>
          )}
      </Map>

      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
        {hasMovedCamera && (
          <Button size="sm" variant="default" className="shadow-md" onClick={handleSearchThisArea}>
            <SearchIcon aria-hidden="true" className="mr-1.5 size-3.5" />
            Search this area
          </Button>
        )}
        {activeBounds && (
          <Button size="sm" variant="secondary" className="shadow-md" onClick={handleResetBounds}>
            <RotateCcwIcon aria-hidden="true" className="mr-1.5 size-3.5" />
            Reset map filter
          </Button>
        )}
      </div>
    </div>
  );
}

export function DiscoveryMap(props: DiscoveryMapProps) {
  const [loadError, setLoadError] = useState(false);
  const apiKey = env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey || loadError) {
    return (
      <MapDegradedState
        message={
          apiKey
            ? "The interactive map could not be loaded. You can still search and browse all listings in the directory."
            : "Google Maps API key is not configured. You can still search and browse all listings in the directory."
        }
      />
    );
  }

  return (
    <MapErrorBoundary>
      <APIProvider
        apiKey={apiKey}
        onError={() => {
          setLoadError(true);
        }}
      >
        <InnerMap {...props} />
      </APIProvider>
    </MapErrorBoundary>
  );
}
