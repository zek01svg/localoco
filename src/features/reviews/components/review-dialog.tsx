import type { ReviewItem } from "#shared/contracts/reviews";

import { useEffect, useState } from "react";

import { StarRatingInput } from "#client/components/star-rating-input";
import { Button } from "#client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#client/components/ui/dialog";
import { Textarea } from "#client/components/ui/textarea";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewToEdit?: ReviewItem | null;
  onSubmit: (data: { rating: number; content: string }) => Promise<void>;
  isPending: boolean;
}

export function ReviewDialog({
  open,
  onOpenChange,
  reviewToEdit,
  onSubmit,
  isPending,
}: ReviewDialogProps) {
  const [rating, setRating] = useState<number>(reviewToEdit?.rating ?? 5);
  const [content, setContent] = useState<string>(reviewToEdit?.content ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRating(reviewToEdit?.rating ?? 5);
      setContent(reviewToEdit?.content ?? "");
      setError(null);
    }
  }, [open, reviewToEdit]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5 stars");
      return;
    }
    if (!content.trim()) {
      setError("Please write some feedback for your review");
      return;
    }
    if (content.length > 2000) {
      setError("Review content cannot exceed 2000 characters");
      return;
    }

    setError(null);
    try {
      await onSubmit({ rating, content: content.trim() });
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save review");
    }
  };

  const isEditing = Boolean(reviewToEdit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={e => {
            void handleSubmit(e);
          }}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit your review" : "Write a review"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update your rating and feedback for this business."
                : "Share your authentic experience to help the community."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <span className="text-foreground text-sm font-medium">Your Rating</span>
            <StarRatingInput value={rating} onChange={setRating} disabled={isPending} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="review-content" className="text-foreground text-sm font-medium">
              Review Details
            </label>
            <Textarea
              id="review-content"
              value={content}
              onChange={e => {
                setContent(e.target.value);
              }}
              placeholder="What did you think of the service, quality, and atmosphere?"
              rows={4}
              disabled={isPending}
              maxLength={2000}
              className="resize-none"
            />
            <div className="text-muted-foreground flex justify-end text-xs">
              {content.length}/2000
            </div>
          </div>

          {error ? (
            <p className="text-destructive text-sm font-medium" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || rating === 0 || !content.trim()}>
              {isPending
                ? isEditing
                  ? "Updating..."
                  : "Publishing..."
                : isEditing
                  ? "Update Review"
                  : "Publish Review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
