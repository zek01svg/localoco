import { Megaphone } from "lucide-react";

import { useBusinessAnnouncementsQuery } from "../hooks/use-announcements";
import { AnnouncementCard } from "./announcement-card";

interface ListingAnnouncementsSectionProps {
  businessId: string;
}

export function ListingAnnouncementsSection({ businessId }: ListingAnnouncementsSectionProps) {
  const announcementsQuery = useBusinessAnnouncementsQuery(businessId);
  const announcements = announcementsQuery.data?.items ?? [];

  if (announcements.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="announcements-heading" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Megaphone className="text-primary size-5" />
        <h2 id="announcements-heading" className="text-xl font-semibold">
          Announcements & Updates
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {announcements.map(item => (
          <AnnouncementCard key={item.id} announcement={item} />
        ))}
      </div>
    </section>
  );
}
