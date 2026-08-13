export function NotFoundPage() {
  return (
    <div className="bg-background selection:bg-primary/20 relative flex min-h-screen flex-col items-center justify-center p-6">
      <main className="animate-in fade-in relative z-10 w-full max-w-md space-y-8 text-center duration-700">
        <p className="text-muted-foreground text-lg leading-relaxed font-light md:text-xl">
          404 Not Found
        </p>
      </main>
    </div>
  );
}
