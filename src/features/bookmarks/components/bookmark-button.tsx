import { LoaderCircleIcon } from "lucide-react";

import { TissuePacketIcon } from "#client/components/custom/tissue-packet-icon";
import { Button } from "#client/components/ui/button";
import { useSession } from "#client/features/auth";

import {
  useAddBookmarkMutation,
  useBookmarkStatusQuery,
  useRemoveBookmarkMutation,
} from "../hooks/use-bookmarks";

interface BookmarkButtonProps {
  businessId: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showText?: boolean;
}

export function BookmarkButton({
  businessId,
  variant = "outline",
  size = "icon",
  className,
  showText = false,
}: BookmarkButtonProps) {
  const { isAuthenticated, isVerified } = useSession();
  const statusQuery = useBookmarkStatusQuery(businessId, isAuthenticated);
  const addMutation = useAddBookmarkMutation();
  const removeMutation = useRemoveBookmarkMutation();

  const isBookmarked = Boolean(statusQuery.data?.bookmarked);
  const isPending = statusQuery.isPending || addMutation.isPending || removeMutation.isPending;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isAuthenticated || !isVerified) {
      return;
    }

    if (isBookmarked) {
      void removeMutation.mutateAsync(businessId);
    } else {
      void addMutation.mutateAsync(businessId);
    }
  };

  const label = isBookmarked ? "Remove bookmark" : "Save bookmark";

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={isPending || !isAuthenticated || !isVerified}
      aria-label={label}
      aria-pressed={isBookmarked}
      onClick={handleToggle}
    >
      {isPending ? (
        <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <TissuePacketIcon
          className={`size-4 transition-colors ${
            isBookmarked ? "fill-primary/20 text-primary" : "text-muted-foreground"
          }`}
        />
      )}
      {showText && <span>{isBookmarked ? "Saved" : "Save"}</span>}
    </Button>
  );
}
