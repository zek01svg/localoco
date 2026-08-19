import { createFileRoute } from "@tanstack/react-router";

import { DiscoveryPage } from "#client/features/discovery";

export const Route = createFileRoute("/listings/")({
  component: DiscoveryPage,
});
