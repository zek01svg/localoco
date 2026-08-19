import type { AnnouncementItem, CreateAnnouncement } from "#shared/contracts/announcements";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";

import { Button } from "#client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#client/components/ui/dialog";
import { Input } from "#client/components/ui/input";
import { Label } from "#client/components/ui/label";
import { Textarea } from "#client/components/ui/textarea";

interface AnnouncementComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: AnnouncementItem | null;
  onSubmit: (values: CreateAnnouncement) => Promise<void>;
  isPending: boolean;
}

export function AnnouncementComposerDialog({
  open,
  onOpenChange,
  announcement,
  onSubmit,
  isPending,
}: AnnouncementComposerDialogProps) {
  const isEditing = Boolean(announcement);
  const [dateError, setDateError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      title: announcement?.title ?? "",
      content: announcement?.content ?? "",
      imageUrl: announcement?.imageUrl ?? "",
      linkUrl: announcement?.linkUrl ?? "",
      startsAt: announcement?.startsAt
        ? new Date(announcement.startsAt).toISOString().split("T")[0]
        : "",
      endsAt: announcement?.endsAt ? new Date(announcement.endsAt).toISOString().split("T")[0] : "",
    },
    onSubmit: async ({ value }) => {
      setDateError(null);
      if (value.startsAt && value.endsAt) {
        if (new Date(value.endsAt) < new Date(value.startsAt)) {
          setDateError("End date cannot precede start date");
          return;
        }
      }

      await onSubmit({
        title: value.title.trim(),
        content: value.content.trim(),
        imageUrl: value.imageUrl.trim() ? value.imageUrl.trim() : null,
        linkUrl: value.linkUrl.trim() ? value.linkUrl.trim() : null,
        startsAt: value.startsAt ? new Date(value.startsAt) : null,
        endsAt: value.endsAt ? new Date(value.endsAt) : null,
      });

      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Announcement" : "Post an Announcement"}</DialogTitle>
          <DialogDescription>
            Publish public updates, seasonal promotions, or announcements for your business.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={e => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="title"
            validators={{
              onChange: ({ value }) =>
                value.trim().length === 0
                  ? "Title is required"
                  : value.length > 200
                    ? "Title cannot exceed 200 characters"
                    : undefined,
            }}
          >
            {field => (
              <div className="space-y-1">
                <Label htmlFor="announcement-title">Title</Label>
                <Input
                  id="announcement-title"
                  placeholder="e.g. 20% Off Weekend Special"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => {
                    field.handleChange(e.target.value);
                  }}
                  disabled={isPending}
                />
                {field.state.meta.errors.length > 0 ? (
                  <p className="text-destructive text-xs">{field.state.meta.errors.join(", ")}</p>
                ) : null}
              </div>
            )}
          </form.Field>

          <form.Field
            name="content"
            validators={{
              onChange: ({ value }) =>
                value.trim().length === 0
                  ? "Content is required"
                  : value.length > 4000
                    ? "Content cannot exceed 4000 characters"
                    : undefined,
            }}
          >
            {field => (
              <div className="space-y-1">
                <Label htmlFor="announcement-content">Content</Label>
                <Textarea
                  id="announcement-content"
                  placeholder="Share what's happening at your business..."
                  rows={4}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => {
                    field.handleChange(e.target.value);
                  }}
                  disabled={isPending}
                />
                {field.state.meta.errors.length > 0 ? (
                  <p className="text-destructive text-xs">{field.state.meta.errors.join(", ")}</p>
                ) : null}
              </div>
            )}
          </form.Field>

          <form.Field
            name="imageUrl"
            validators={{
              onChange: ({ value }) =>
                value.trim() && !value.startsWith("https://")
                  ? "Image URL must start with https://"
                  : undefined,
            }}
          >
            {field => (
              <div className="space-y-1">
                <Label htmlFor="announcement-image-url">Image URL (Optional)</Label>
                <Input
                  id="announcement-image-url"
                  placeholder="https://example.com/photo.jpg"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => {
                    field.handleChange(e.target.value);
                  }}
                  disabled={isPending}
                />
                {field.state.meta.errors.length > 0 ? (
                  <p className="text-destructive text-xs">{field.state.meta.errors.join(", ")}</p>
                ) : null}
              </div>
            )}
          </form.Field>

          <form.Field
            name="linkUrl"
            validators={{
              onChange: ({ value }) =>
                value.trim() && !value.startsWith("https://")
                  ? "Link URL must start with https://"
                  : undefined,
            }}
          >
            {field => (
              <div className="space-y-1">
                <Label htmlFor="announcement-link-url">External Link (Optional)</Label>
                <Input
                  id="announcement-link-url"
                  placeholder="https://example.com/menu"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={e => {
                    field.handleChange(e.target.value);
                  }}
                  disabled={isPending}
                />
                {field.state.meta.errors.length > 0 ? (
                  <p className="text-destructive text-xs">{field.state.meta.errors.join(", ")}</p>
                ) : null}
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <form.Field name="startsAt">
              {field => (
                <div className="space-y-1">
                  <Label htmlFor="announcement-starts-at">Start Date (Optional)</Label>
                  <Input
                    id="announcement-starts-at"
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={e => {
                      field.handleChange(e.target.value);
                    }}
                    disabled={isPending}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="endsAt">
              {field => (
                <div className="space-y-1">
                  <Label htmlFor="announcement-ends-at">End Date (Optional)</Label>
                  <Input
                    id="announcement-ends-at"
                    type="date"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={e => {
                      field.handleChange(e.target.value);
                    }}
                    disabled={isPending}
                  />
                </div>
              )}
            </form.Field>
          </div>

          {dateError && <p className="text-destructive text-xs">{dateError}</p>}

          <DialogFooter className="pt-2">
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEditing ? "Update announcement" : "Publish announcement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
