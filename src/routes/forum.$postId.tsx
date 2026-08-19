import { createFileRoute } from "@tanstack/react-router";

import { ForumPostPage } from "#client/features/forum";

function ForumPostIdPage() {
  const { postId } = Route.useParams();
  return <ForumPostPage postId={postId} />;
}

export const Route = createFileRoute("/forum/$postId")({
  component: ForumPostIdPage,
});
