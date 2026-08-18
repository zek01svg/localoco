import { createFileRoute } from "@tanstack/react-router";

import { CreateBusinessPage } from "#client/features/businesses";

export const Route = createFileRoute("/businesses/new")({
  component: CreateBusinessPage,
});
