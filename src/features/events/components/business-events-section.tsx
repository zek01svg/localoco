import type { CreateEvent, EventItem } from "#shared/contracts/events";
import type { ListingStatus } from "#shared/contracts/listings";

import { Calendar, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "#client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#client/components/ui/card";

import {
  useBusinessEventsQuery,
  useCreateEventMutation,
  useDeleteEventMutation,
  useUpdateEventMutation,
} from "../hooks/use-events";
import { EventCard } from "./event-card";
import { EventComposerDialog } from "./event-composer-dialog";

interface BusinessEventsSectionProps {
  businessId: string;
  listingStatus: ListingStatus;
}

export function BusinessEventsSection({ businessId, listingStatus }: BusinessEventsSectionProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  const eventsQuery = useBusinessEventsQuery(businessId);
  const createMutation = useCreateEventMutation(businessId);
  const updateMutation = useUpdateEventMutation(businessId, editingEvent?.id ?? "");
  const deleteMutation = useDeleteEventMutation(businessId);

  const isPublished = listingStatus === "published";

  const handleCreateOrUpdate = async (values: CreateEvent) => {
    if (editingEvent) {
      await updateMutation.mutateAsync(values);
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleEdit = (item: EventItem) => {
    setEditingEvent(item);
    setComposerOpen(true);
  };

  const handleDelete = (item: EventItem) => {
    deleteMutation.mutate(item.id);
  };

  const events = eventsQuery.data?.items ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-bold">Public Events</CardTitle>
          <CardDescription>
            Publish time-bounded activities, workshops, tastings, and meetups for your business.
          </CardDescription>
        </div>
        <Button
          onClick={() => {
            setEditingEvent(null);
            setComposerOpen(true);
          }}
          disabled={!isPublished}
          size="sm"
        >
          <Plus className="mr-1.5 size-4" />
          Post event
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isPublished && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Publication required</p>
            <p className="text-amber-800/90 dark:text-amber-300/90">
              Only published listings can post events. Once your listing passes review and is live,
              you can publish events here.
            </p>
          </div>
        )}

        {eventsQuery.isPending && (
          <p className="text-muted-foreground text-sm">Loading events...</p>
        )}

        {eventsQuery.isError && (
          <div className="border-destructive/20 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
            <p className="font-semibold">Could not load events</p>
            <p className="text-xs">
              {eventsQuery.error.message || "An unexpected error occurred."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void eventsQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        {eventsQuery.isSuccess && events.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <Calendar className="text-muted-foreground mb-2 size-8" />
            <p className="text-sm font-medium">No events scheduled yet</p>
            <p className="text-muted-foreground text-xs">
              {isPublished
                ? "Click 'Post event' above to schedule an upcoming activity."
                : "Events will become available once your listing is published."}
            </p>
          </div>
        )}

        {events.length > 0 && (
          <div className="space-y-3">
            {events.map(item => (
              <EventCard
                key={item.id}
                event={item}
                isOwner
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <EventComposerDialog
          key={editingEvent?.id ?? "composer-new"}
          open={composerOpen}
          onOpenChange={open => {
            setComposerOpen(open);
            if (!open) setEditingEvent(null);
          }}
          event={editingEvent}
          onSubmit={handleCreateOrUpdate}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}
