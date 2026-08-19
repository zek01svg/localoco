import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { ExternalLinkIcon, MapPinIcon } from "lucide-react";
import { useState } from "react";

import { env } from "#client/env";

interface ListingMapViewProps {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export function ListingMapView({ name, address, latitude, longitude }: ListingMapViewProps) {
  const [loadError, setLoadError] = useState(false);
  const apiKey = env.VITE_GOOGLE_MAPS_API_KEY;
  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude !== null &&
    longitude !== null;

  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Singapore`)}`;

  if (!hasCoordinates) {
    return (
      <section aria-labelledby="map-preview-heading" className="flex flex-col gap-3">
        <h2 id="map-preview-heading" className="flex items-center gap-2 text-lg font-semibold">
          <MapPinIcon aria-hidden="true" className="text-muted-foreground size-5" />
          Location Map
        </h2>
        <div className="bg-muted/40 border-border flex h-48 w-full flex-col items-center justify-center rounded-lg border p-4 text-center">
          <p className="text-muted-foreground text-sm">
            Map coordinates not available for this listing
          </p>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary mt-2 inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
          >
            Search on Google Maps
            <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </section>
    );
  }

  const center = { lat: latitude, lng: longitude };

  return (
    <section aria-labelledby="map-preview-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="map-preview-heading" className="flex items-center gap-2 text-lg font-semibold">
          <MapPinIcon aria-hidden="true" className="text-muted-foreground size-5" />
          Location Map
        </h2>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
        >
          Open in Maps
          <ExternalLinkIcon aria-hidden="true" className="size-3" />
        </a>
      </div>

      <div className="border-border relative h-64 w-full overflow-hidden rounded-lg border">
        {!apiKey || loadError ? (
          <div className="bg-muted/40 flex size-full flex-col items-center justify-center p-4 text-center">
            <p className="text-muted-foreground text-sm">
              Coordinates: {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </p>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary mt-2 inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
            >
              View on Google Maps
              <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
            </a>
          </div>
        ) : (
          <APIProvider
            apiKey={apiKey}
            onError={() => {
              setLoadError(true);
            }}
          >
            <Map
              defaultCenter={center}
              defaultZoom={15}
              gestureHandling="cooperative"
              disableDefaultUI={false}
              className="size-full"
            >
              <Marker position={center} title={name} />
            </Map>
          </APIProvider>
        )}
      </div>
    </section>
  );
}
