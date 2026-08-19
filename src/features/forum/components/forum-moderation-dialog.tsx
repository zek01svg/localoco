import { useEffect, useState } from "react";

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

interface ForumModerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onSubmit: (reason: string) => Promise<void>;
  isPending: boolean;
}

export function ForumModerationDialog({
  open,
  onOpenChange,
  title = "Moderate Content",
  description = "Provide a moderation reason. This action will hide the content from public views and create an immutable audit record.",
  onSubmit,
  isPending,
}: ForumModerationDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("A moderation reason is required");
      return;
    }
    if (trimmed.length > 1000) {
      setError("Reason cannot exceed 1000 characters");
      return;
    }

    setError(null);
    try {
      await onSubmit(trimmed);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to moderate content");
    }
  };

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
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <label htmlFor="moderation-reason" className="text-foreground text-sm font-medium">
              Moderation Reason
            </label>
            <Textarea
              id="moderation-reason"
              value={reason}
              onChange={e => {
                setReason(e.target.value);
              }}
              placeholder="e.g. Violates community guidelines on commercial spam or harassment."
              rows={4}
              disabled={isPending}
              maxLength={1000}
              className="resize-none"
              required
            />
            <div className="text-muted-foreground flex justify-end text-xs">
              {reason.length}/1000
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
            <Button type="submit" variant="destructive" disabled={isPending || !reason.trim()}>
              {isPending ? "Moderating..." : "Confirm Moderation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
