import { createFileRoute } from "@tanstack/react-router";

import { PublicProfilePage } from "#client/features/profiles";

function UsersIdPage() {
  const { id } = Route.useParams();
  return <PublicProfilePage userId={id} />;
}

export const Route = createFileRoute("/users/$id")({
  component: UsersIdPage,
});
