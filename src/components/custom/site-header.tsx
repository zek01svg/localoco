import { Link } from "@tanstack/react-router";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "#client/components/ui/button";
import { useSession } from "#client/features/auth";

function Wordmark() {
  return (
    <Link
      to="/"
      className="font-display text-xl tracking-tight whitespace-nowrap"
      aria-label="LocaLoco home"
    >
      Loca<span className="text-primary">Loco</span>
    </Link>
  );
}

const coreLinks = [
  { label: "Discover", href: "/listings" },
  { label: "Forum", href: "/forum" },
  { label: "Add your business", href: "/businesses/new" },
];

function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => {
        setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
      }}
    >
      {/* Icon follows the html.dark class next-themes manages — no state needed. */}
      <SunIcon aria-hidden="true" className="hidden dark:block" />
      <MoonIcon aria-hidden="true" className="dark:hidden" />
    </Button>
  );
}

function AuthNav() {
  const { user, isAuthenticated, signOut } = useSession();

  if (isAuthenticated && user) {
    return (
      <li className="flex items-center gap-3">
        <Link
          to="/profile"
          className="hover:text-primary flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap"
        >
          <span className="max-w-[12ch] truncate">{user.name}</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            void signOut();
          }}
          className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
        >
          Sign out
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3">
      <Link
        to="/login"
        className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
      >
        Sign in
      </Link>
      <Link
        to="/signup"
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
      >
        Sign up
      </Link>
    </li>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40">
      {/* Shopfront valance: the brand ribbon every page hangs under. */}
      <div aria-hidden="true">
        <div className="awning-band awning-band-striped" />
        <div className="awning-scallops" />
      </div>
      <div className="bg-background/95 border-border/60 supports-[backdrop-filter]:bg-background/80 border-b backdrop-blur">
        <nav
          aria-label="Primary"
          className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6"
        >
          <Wordmark />
          <ul className="flex items-center gap-x-5 gap-y-1 text-sm">
            {coreLinks.map(link => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  activeProps={{ className: "text-foreground font-semibold" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="ml-auto flex items-center gap-3">
            <li>
              <ThemeToggle />
            </li>
            <AuthNav />
          </ul>
        </nav>
      </div>
    </header>
  );
}
