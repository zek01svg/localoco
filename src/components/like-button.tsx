import { HeartIcon, LoaderCircleIcon } from "lucide-react";

import { Button } from "#client/components/ui/button";

interface LikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  onToggle: () => void;
  isPending?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function LikeButton({
  isLiked,
  likeCount,
  onToggle,
  isPending = false,
  disabled = false,
  className = "",
  ariaLabel,
}: LikeButtonProps) {
  const label = ariaLabel ?? (isLiked ? `Unlike (${likeCount})` : `Like (${likeCount})`);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onToggle();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`inline-flex items-center gap-1.5 text-xs ${className}`}
      disabled={disabled || isPending}
      aria-label={label}
      aria-pressed={isLiked}
      onClick={handleClick}
    >
      {isPending ? (
        <LoaderCircleIcon aria-hidden="true" className="size-3.5 animate-spin" />
      ) : (
        <HeartIcon
          aria-hidden="true"
          className={`size-3.5 transition-colors ${
            isLiked ? "fill-primary text-primary" : "text-muted-foreground"
          }`}
        />
      )}
      <span
        className={`tabular-nums ${isLiked ? "text-primary font-medium" : "text-muted-foreground"}`}
      >
        {likeCount}
      </span>
    </Button>
  );
}
