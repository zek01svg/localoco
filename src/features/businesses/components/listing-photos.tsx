import { useId, useRef, useState } from "react";

import { Button } from "#client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#client/components/ui/card";
import { apiUrl } from "#client/lib/api";
import { MAX_PHOTOS_PER_BUSINESS, MAX_PHOTO_BYTES, PHOTO_TYPES } from "#shared/contracts/media";

import {
  useDeleteListingPhotoMutation,
  useListingPhotosQuery,
  useUploadListingPhotoMutation,
} from "../hooks/photo-queries";

export function ListingPhotosSection({ businessId }: { businessId: string }) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const photosQuery = useListingPhotosQuery(businessId);
  const uploadMutation = useUploadListingPhotoMutation(businessId);
  const deleteMutation = useDeleteListingPhotoMutation(businessId);

  const photos = photosQuery.data?.items ?? [];
  const atLimit = photos.length >= MAX_PHOTOS_PER_BUSINESS;

  const pickPhoto = (file: File | undefined) => {
    setPickError(null);
    if (!file) {
      return;
    }
    if (file.size === 0) {
      setPickError("That file is empty. Choose a photo.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPickError("That photo is larger than 8 MB. Choose a smaller one.");
      return;
    }
    if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) {
      setPickError("Only JPEG, PNG, and WebP photos are supported.");
      return;
    }
    uploadMutation.mutate(file, {
      onSettled: () => {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Listing photos</CardTitle>
        <CardDescription>
          {photos.length} of {MAX_PHOTOS_PER_BUSINESS} photos · JPEG, PNG, or WebP, up to 8 MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((photo, index) =>
            photo.status === "active" ? (
              <div
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-md"
              >
                <img
                  src={`${apiUrl}/media/${photo.id}`}
                  alt={`Listing visual ${index + 1} of ${photos.length}`}
                  className="h-full w-full object-cover"
                />
                <Button
                  type="button"
                  variant={confirmingId === photo.id ? "destructive" : "outline"}
                  size="sm"
                  className="absolute top-1 right-1"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirmingId !== photo.id) {
                      setConfirmingId(photo.id);
                      return;
                    }
                    setConfirmingId(null);
                    deleteMutation.mutate(photo.id);
                  }}
                >
                  {confirmingId === photo.id ? "Confirm?" : "Delete"}
                </Button>
              </div>
            ) : (
              <div
                key={photo.id}
                className="bg-muted text-muted-foreground flex aspect-square items-center justify-center rounded-md text-xs"
              >
                Uploading…
              </div>
            )
          )}
          {atLimit ? null : (
            <label
              htmlFor={inputId}
              className="border-input hover:bg-accent flex aspect-square cursor-pointer items-center justify-center rounded-md border border-dashed text-sm"
            >
              Add photo
            </label>
          )}
        </div>

        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          className="sr-only"
          disabled={uploadMutation.isPending || atLimit}
          onChange={e => {
            pickPhoto(e.target.files?.[0]);
          }}
        />

        {uploadMutation.isPending ? (
          <p className="text-muted-foreground text-sm">Uploading…</p>
        ) : null}
        {pickError ? <p className="text-destructive text-sm">{pickError}</p> : null}
        {uploadMutation.error ? (
          <p className="text-destructive text-sm">{uploadMutation.error.message}</p>
        ) : null}
        {deleteMutation.error ? (
          <p className="text-destructive text-sm">{deleteMutation.error.message}</p>
        ) : null}
        {atLimit ? (
          <p className="text-muted-foreground text-sm">
            This listing has the maximum of {MAX_PHOTOS_PER_BUSINESS} photos. Delete one before
            adding another.
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Photos are deleted permanently and cannot be recovered.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
