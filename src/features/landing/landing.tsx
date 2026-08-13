export function LandingPage() {
  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center p-6">
      <main className="relative z-10 w-full max-w-md space-y-6 text-center">
        <p className="text-4xl font-bold tracking-tight">LocaLoco</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          We&rsquo;re giving LocaLoco a refresh.
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed font-light">
          The service is temporarily unavailable while we work on it. Please check back in a little
          while &mdash; we&rsquo;ll be back soon.
        </p>
        <output className="text-muted-foreground block text-sm">
          <span className="border-border inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
            <span
              aria-hidden="true"
              className="bg-primary inline-block size-1.5 shrink-0 rounded-full"
            />
            Service unavailable &middot; please retry later
          </span>
        </output>
      </main>
    </div>
  );
}
