import type { ReactNode } from "react";

import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from "#client/components/ui/empty";

export type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Empty>
      <EmptyContent>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
        {action}
      </EmptyContent>
    </Empty>
  );
}
