import { createFileRoute } from "@tanstack/react-router";

import { AnnouncementDetailPage } from "#client/features/announcements";

function AnnouncementIdRoute() {
  const { id } = Route.useParams();
  return <AnnouncementDetailPage announcementId={id} />;
}

export const Route = createFileRoute("/announcements/$id")({
  component: AnnouncementIdRoute,
});
