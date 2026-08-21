export function SiteFooter() {
  return (
    <footer className="border-border/60 border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-display text-lg tracking-tight">
          Loca<span className="text-primary">Loco</span>
        </p>
        <p className="text-muted-foreground text-sm">
          Made for Singapore&rsquo;s neighbourhoods. &copy; 2026 LocaLoco.
        </p>
      </div>
    </footer>
  );
}
