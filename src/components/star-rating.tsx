import { Star } from "lucide-react";

import { cn } from "#client/lib/utils";

interface StarRatingProps {
  rating: number | null;
  totalCount?: number;
  showCount?: boolean;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

export function StarRating({
  rating,
  totalCount,
  showCount = false,
  showScore = false,
  size = "md",
  className,
}: StarRatingProps) {
  if (rating === null) {
    return (
      <div
        className={cn("text-muted-foreground inline-flex items-center gap-1.5 text-sm", className)}
      >
        <span className="text-xs">No reviews yet</span>
      </div>
    );
  }

  const rounded = Math.round(rating * 10) / 10;
  const starSize = sizeMap[size];

  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={`${rounded} out of 5 stars${totalCount === undefined ? "" : ` from ${totalCount} reviews`}`}
    >
      <div className="flex items-center gap-0.5 text-amber-500" aria-hidden="true">
        {[1, 2, 3, 4, 5].map(star => {
          const filled = star <= Math.round(rating);
          return (
            <Star
              key={star}
              className={cn(
                starSize,
                filled ? "fill-amber-500 text-amber-500" : "fill-muted text-muted-foreground/30"
              )}
            />
          );
        })}
      </div>
      {showScore ? (
        <span className="text-foreground text-sm font-medium">{rounded.toFixed(1)}</span>
      ) : null}
      {showCount && totalCount !== undefined ? (
        <span className="text-muted-foreground text-xs">({totalCount})</span>
      ) : null}
    </div>
  );
}
