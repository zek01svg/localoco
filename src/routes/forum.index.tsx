import { createFileRoute } from "@tanstack/react-router";

import { ForumFeedPage } from "#client/features/forum";

function ForumIndexPage() {
  return <ForumFeedPage />;
}

export const Route = createFileRoute("/forum/")({
  component: ForumIndexPage,
});
