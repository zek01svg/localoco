import { useRouter } from "@tanstack/react-router";

export function ErrorPage() {
  const router = useRouter();

  return (
    <div className="bg-background selection:bg-primary/20 relative flex min-h-screen flex-col items-center justify-center p-6">
      <main
        role="alert"
        className="animate-in fade-in relative z-10 w-full max-w-md space-y-6 text-center duration-700"
      >
        <p className="text-muted-foreground text-lg leading-relaxed font-light md:text-xl">
          Something went wrong
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">This page couldn&rsquo;t load</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          An unexpected error interrupted the request. Try again, or head back to the home page.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              void router.invalidate();
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 py-2.5 text-sm font-semibold transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Back to home
          </a>
        </div>
      </main>
    </div>
  );
}
