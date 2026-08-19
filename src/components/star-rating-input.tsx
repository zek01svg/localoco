import { Star } from "lucide-react";
import { useState } from "react";

import { cn } from "#client/lib/utils";

interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  className?: string;
}

interface StarItemProps {
  star: number;
  value: number;
  activeRating: number;
  disabled: boolean;
  onChange: (rating: number) => void;
  onHover: (rating: number | null) => void;
}

function handleArrowNav(e: React.KeyboardEvent, star: number, onChange: (rating: number) => void) {
  if (e.key === "ArrowRight" || e.key === "ArrowUp") {
    e.preventDefault();
    onChange(Math.min(5, star + 1));
  } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
    e.preventDefault();
    onChange(Math.max(1, star - 1));
  }
}

function StarItem({ star, value, activeRating, disabled, onChange, onHover }: StarItemProps) {
  const isFilled = star <= activeRating;
  const isSelected = star === value;

  return (
    <label
      className={cn(
        "focus-within:ring-ring relative rounded-md p-1 transition-all focus-within:ring-2 focus-within:outline-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-110"
      )}
    >
      <input
        type="radio"
        name="star-rating"
        value={star}
        checked={isSelected}
        disabled={disabled}
        onChange={() => {
          if (!disabled) onChange(star);
        }}
        onMouseEnter={() => {
          if (!disabled) onHover(star);
        }}
        onMouseLeave={() => {
          if (!disabled) onHover(null);
        }}
        onKeyDown={e => {
          if (!disabled) handleArrowNav(e, star, onChange);
        }}
        aria-label={`${star} star${star > 1 ? "s" : ""}`}
        className="sr-only"
      />
      <Star
        className={cn(
          "size-6 transition-colors",
          isFilled
            ? "fill-amber-500 text-amber-500"
            : "fill-muted text-muted-foreground/30 hover:text-amber-400"
        )}
      />
    </label>
  );
}

export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  className,
}: StarRatingInputProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const activeRating = hoverRating ?? value;

  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label="Rating score from 1 to 5 stars"
    >
      {[1, 2, 3, 4, 5].map(star => (
        <StarItem
          key={star}
          star={star}
          value={value}
          activeRating={activeRating}
          disabled={disabled}
          onChange={onChange}
          onHover={setHoverRating}
        />
      ))}
      {value > 0 ? (
        <span className="text-muted-foreground ml-2 text-sm font-medium">{value} of 5</span>
      ) : null}
    </div>
  );
}
