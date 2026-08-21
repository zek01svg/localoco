import { Calendar } from "lucide-react";

import { useBusinessEventsQuery } from "../hooks/use-events";
import { EventCard } from "./event-card";

interface ListingEventsSectionProps {
  businessId: string;
}

export function ListingEventsSection({ businessId }: ListingEventsSectionProps) {
  const eventsQuery = useBusinessEventsQuery(businessId);
  const events = eventsQuery.data?.items ?? [];

  if (events.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="events-heading" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Calendar className="text-primary size-5" />
        <h2 id="events-heading" className="text-xl font-semibold">
          Upcoming Events & Activities
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {events.map(item => (
          <EventCard key={item.id} event={item} />
        ))}
      </div>
    </section>
  );
}
