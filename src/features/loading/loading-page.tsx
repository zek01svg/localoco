import { Spinner } from "#client/components/ui/spinner";

export function LoadingPage() {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      <Spinner className="text-primary size-8" />
    </main>
  );
}
