import type { AnnouncementItem, CreateAnnouncement } from "#shared/contracts/announcements";
import type { ListingStatus } from "#shared/contracts/listings";

import { Megaphone, Plus } from "lucide-react";
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
  useBusinessAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useUpdateAnnouncementMutation,
} from "../hooks/use-announcements";
import { AnnouncementCard } from "./announcement-card";
import { AnnouncementComposerDialog } from "./announcement-composer-dialog";

interface BusinessAnnouncementsSectionProps {
  businessId: string;
  listingStatus: ListingStatus;
}

export function BusinessAnnouncementsSection({
  businessId,
  listingStatus,
}: BusinessAnnouncementsSectionProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);

  const announcementsQuery = useBusinessAnnouncementsQuery(businessId);
  const createMutation = useCreateAnnouncementMutation(businessId);
  const updateMutation = useUpdateAnnouncementMutation(businessId, editingAnnouncement?.id ?? "");
  const deleteMutation = useDeleteAnnouncementMutation(businessId);

  const isPublished = listingStatus === "published";

  const handleCreateOrUpdate = async (values: CreateAnnouncement) => {
    if (editingAnnouncement) {
      await updateMutation.mutateAsync(values);
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleEdit = (item: AnnouncementItem) => {
    setEditingAnnouncement(item);
    setComposerOpen(true);
  };

  const handleDelete = (item: AnnouncementItem) => {
    deleteMutation.mutate(item.id);
  };

  const announcements = announcementsQuery.data?.items ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-bold">Public Announcements</CardTitle>
          <CardDescription>
            Keep your customers informed with news, promotions, and special notices.
          </CardDescription>
        </div>
        <Button
          onClick={() => {
            setEditingAnnouncement(null);
            setComposerOpen(true);
          }}
          disabled={!isPublished}
          size="sm"
        >
          <Plus className="mr-1.5 size-4" />
          Post announcement
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isPublished && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Publication required</p>
            <p className="text-amber-800/90 dark:text-amber-300/90">
              Only published listings can post announcements. Once your listing passes review and is
              live, you can publish updates here.
            </p>
          </div>
        )}

        {announcementsQuery.isPending && (
          <p className="text-muted-foreground text-sm">Loading announcements...</p>
        )}

        {announcementsQuery.isSuccess && announcements.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <Megaphone className="text-muted-foreground mb-2 size-8" />
            <p className="text-sm font-medium">No announcements posted yet</p>
            <p className="text-muted-foreground text-xs">
              {isPublished
                ? "Click 'Post announcement' above to share an update with visitors."
                : "Announcements will become available once your listing is published."}
            </p>
          </div>
        )}

        {announcements.length > 0 && (
          <div className="space-y-3">
            {announcements.map(item => (
              <AnnouncementCard
                key={item.id}
                announcement={item}
                isOwner
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        <AnnouncementComposerDialog
          key={editingAnnouncement?.id ?? "composer-new"}
          open={composerOpen}
          onOpenChange={open => {
            setComposerOpen(open);
            if (!open) setEditingAnnouncement(null);
          }}
          announcement={editingAnnouncement}
          onSubmit={handleCreateOrUpdate}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}
