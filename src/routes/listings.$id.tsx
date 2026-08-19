import { createFileRoute } from "@tanstack/react-router";

import { ListingDetailPage } from "#client/features/listings";

function ListingIdRoute() {
  const { id } = Route.useParams();
  return <ListingDetailPage listingId={id} />;
}

export const Route = createFileRoute("/listings/$id")({
  component: ListingIdRoute,
});
