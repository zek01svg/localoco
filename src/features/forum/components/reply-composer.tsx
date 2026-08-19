import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "#client/components/ui/button";
import { Textarea } from "#client/components/ui/textarea";
import { useSession } from "#client/features/auth";

interface ReplyComposerProps {
  onReply?: (body: string) => Promise<void>;
  isPending?: boolean;
}

export function ReplyComposer({ onReply, isPending = false }: ReplyComposerProps) {
  const { isAuthenticated, isVerified } = useSession();
  const [body, setBody] = useState("");

  const canSubmit = Boolean(body.trim()) && !isPending;

  const handleSubmit = async () => {
    if (!canSubmit || !onReply) return;
    await onReply(body.trim());
    setBody("");
  };

  if (!isAuthenticated) {
    return (
      <p className="bg-muted/50 rounded-md border p-3 text-sm">
        <Link to="/login" className="text-foreground underline">
          Sign in to join the discussion.
        </Link>
      </p>
    );
  }

  if (!isVerified) {
    return <p className="bg-muted/50 rounded-md border p-3 text-sm">Verify your email to reply.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        aria-label="Reply body"
        placeholder="Write a reply…"
        value={body}
        rows={3}
        maxLength={4000}
        onChange={e => {
          setBody(e.target.value);
        }}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={!canSubmit}
          onClick={() => {
            void handleSubmit();
          }}
        >
          {isPending ? "Posting…" : "Post reply"}
        </Button>
      </div>
    </div>
  );
}
