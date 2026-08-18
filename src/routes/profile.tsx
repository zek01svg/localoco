import { createFileRoute } from "@tanstack/react-router";

import { PersonalProfilePage } from "#client/features/profiles";

export const Route = createFileRoute("/profile")({
  component: PersonalProfilePage,
});
