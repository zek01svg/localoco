import { Spinner } from "#client/components/ui/spinner";

export function LoadingPage() {
  return (
    <main className="flex min-h-[50vh] items-center justify-center p-6">
      <Spinner className="text-primary size-8" />
    </main>
  );
}
