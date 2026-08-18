import { createFileRoute } from "@tanstack/react-router";

import { BusinessListingPage } from "#client/features/businesses";

function BusinessesIdPage() {
  const { id } = Route.useParams();
  return <BusinessListingPage businessId={id} />;
}

export const Route = createFileRoute("/businesses/$id")({
  component: BusinessesIdPage,
});
