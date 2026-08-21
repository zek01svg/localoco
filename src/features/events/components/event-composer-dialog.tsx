import type { CreateEvent, EventItem } from "#shared/contracts/events";

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

interface EventComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: EventItem | null;
  onSubmit: (values: CreateEvent) => Promise<void>;
  isPending: boolean;
}

function toDateTimeLocal(date?: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function EventComposerDialog({
  open,
  onOpenChange,
  event,
  onSubmit,
  isPending,
}: EventComposerDialogProps) {
  const isEditing = Boolean(event);
  const [dateError, setDateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      title: event?.title ?? "",
      description: event?.description ?? "",
      imageUrl: event?.imageUrl ?? "",
      linkUrl: event?.linkUrl ?? "",
      startsAt: toDateTimeLocal(event?.startsAt),
      endsAt: toDateTimeLocal(event?.endsAt),
    },
    onSubmit: async ({ value }) => {
      setDateError(null);
      setSubmitError(null);
      if (!value.startsAt) {
        setDateError("Start date and time are required");
        return;
      }
      if (!value.endsAt) {
        setDateError("End date and time are required");
        return;
      }
      if (new Date(value.endsAt) < new Date(value.startsAt)) {
        setDateError("End date must not precede start date");
        return;
      }

      try {
        await onSubmit({
          title: value.title.trim(),
          description: value.description.trim(),
          imageUrl: value.imageUrl.trim() || null,
          linkUrl: value.linkUrl.trim() || null,
          startsAt: new Date(value.startsAt),
          endsAt: new Date(value.endsAt),
        });

        onOpenChange(false);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Failed to save event");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Event" : "Post an Event"}</DialogTitle>
          <DialogDescription>
            Publish a time-bounded activity, workshop, or special session for your business.
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
                <Label htmlFor="event-title">Title</Label>
                <Input
                  id="event-title"
                  placeholder="e.g. Sourdough Baking Workshop"
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
            name="description"
            validators={{
              onChange: ({ value }) =>
                value.trim().length === 0
                  ? "Description is required"
                  : value.length > 4000
                    ? "Description cannot exceed 4000 characters"
                    : undefined,
            }}
          >
            {field => (
              <div className="space-y-1">
                <Label htmlFor="event-description">Description</Label>
                <Textarea
                  id="event-description"
                  placeholder="Describe the activity, schedule, requirements..."
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <form.Field
              name="startsAt"
              validators={{
                onChange: ({ value }) => (value ? undefined : "Start date is required"),
              }}
            >
              {field => (
                <div className="space-y-1">
                  <Label htmlFor="event-starts-at">Starts At</Label>
                  <Input
                    id="event-starts-at"
                    type="datetime-local"
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
              name="endsAt"
              validators={{
                onChange: ({ value }) => (value ? undefined : "End date is required"),
              }}
            >
              {field => (
                <div className="space-y-1">
                  <Label htmlFor="event-ends-at">Ends At</Label>
                  <Input
                    id="event-ends-at"
                    type="datetime-local"
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
          </div>

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
                <Label htmlFor="event-image-url">Image URL (Optional)</Label>
                <Input
                  id="event-image-url"
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
                <Label htmlFor="event-link-url">External / RSVP Link (Optional)</Label>
                <Input
                  id="event-link-url"
                  placeholder="https://example.com/tickets"
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

          {dateError && <p className="text-destructive text-xs">{dateError}</p>}
          {submitError && <p className="text-destructive text-xs">{submitError}</p>}

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
              {isPending ? "Saving..." : isEditing ? "Update event" : "Publish event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
