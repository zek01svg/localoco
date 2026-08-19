import type { PublicListingPhoto } from "#shared/contracts/listings";

import { ChevronLeftIcon, ChevronRightIcon, ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "#client/components/ui/button";

interface ListingPhotoGalleryProps {
  photos: PublicListingPhoto[];
  listingName: string;
}

export function ListingPhotoGallery({ photos, listingName }: ListingPhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const photoIds = photos.map(p => p.id).join(",");
  useEffect(() => {
    setSelectedIndex(prev => (prev < photos.length ? prev : 0));
  }, [photoIds, photos.length]);

  if (photos.length === 0) {
    return (
      <div
        aria-label="No photos available"
        className="bg-muted/40 border-border flex h-48 w-full flex-col items-center justify-center rounded-xl border p-6 text-center sm:h-64"
      >
        <ImageIcon aria-hidden="true" className="text-muted-foreground size-10 stroke-1" />
        <p className="text-muted-foreground mt-2 text-sm">
          No photos uploaded for this listing yet
        </p>
      </div>
    );
  }

  const currentPhoto = photos[selectedIndex] ?? photos[0];

  const handlePrev = () => {
    setSelectedIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  return (
    <section aria-label="Business photos gallery" className="flex flex-col gap-3">
      {/* Main Hero Photo */}
      <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-xl border sm:aspect-21/9">
        <img
          src={currentPhoto.url}
          alt={`${listingName} (${selectedIndex + 1} of ${photos.length})`}
          className="size-full object-cover"
        />

        {photos.length > 1 && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="bg-background/80 hover:bg-background absolute top-1/2 left-3 -translate-y-1/2 shadow-md backdrop-blur-sm"
              onClick={handlePrev}
              aria-label="Previous photo"
            >
              <ChevronLeftIcon className="size-5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="bg-background/80 hover:bg-background absolute top-1/2 right-3 -translate-y-1/2 shadow-md backdrop-blur-sm"
              onClick={handleNext}
              aria-label="Next photo"
            >
              <ChevronRightIcon className="size-5" />
            </Button>

            <div className="bg-background/80 text-foreground pointer-events-none absolute right-3 bottom-3 rounded-md px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
              {selectedIndex + 1} / {photos.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {photos.length > 1 && (
        <div aria-label="Photo thumbnails" className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={photo.id}
                type="button"
                aria-current={isSelected ? "true" : undefined}
                aria-label={`View photo ${index + 1} of ${photos.length}`}
                onClick={() => {
                  setSelectedIndex(index);
                }}
                className={`relative aspect-video h-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:h-20 ${
                  isSelected
                    ? "border-primary ring-primary ring-2"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={photo.url} alt="" aria-hidden="true" className="size-full object-cover" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
