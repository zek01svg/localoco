import { EmptyState } from "#client/features/empty/empty-state";

export function NotFoundPage() {
  return (
    <div className="bg-background selection:bg-primary/20 relative flex min-h-screen flex-col items-center justify-center p-6">
      <main className="animate-in fade-in relative z-10 w-full max-w-md space-y-8 text-center duration-700">
        <p
          aria-hidden="true"
          className="font-display text-primary text-6xl tracking-tight md:text-7xl"
        >
          404
        </p>
        <h1 className="font-display -mt-4 text-2xl tracking-tight">Page not found</h1>
        <EmptyState
          title="Nothing here yet"
          description="This page doesn&rsquo;t exist or isn&rsquo;t part of the app yet."
          action={
            <a
              href="/"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 py-2.5 text-sm font-semibold transition-colors"
            >
              Back to home
            </a>
          }
        />
      </main>
    </div>
  );
}
