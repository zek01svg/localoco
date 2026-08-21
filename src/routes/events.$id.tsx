import { createFileRoute } from "@tanstack/react-router";

import { EventDetailPage } from "#client/features/events";

function EventIdRoute() {
  const { id } = Route.useParams();
  return <EventDetailPage eventId={id} />;
}

export const Route = createFileRoute("/events/$id")({
  component: EventIdRoute,
});
