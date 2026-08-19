import {
  BookmarkIcon,
  HandHeartIcon,
  HeartIcon,
  MapIcon,
  MapPinIcon,
  StoreIcon,
  UsersIcon,
} from "lucide-react";

import { useSession } from "#client/features/auth";

const navLinks = [
  { label: "Why LocaLoco", href: "#why" },
  { label: "How it works", href: "#how" },
  { label: "Browse businesses", href: "/listings" },
];

const features = [
  {
    icon: MapPinIcon,
    title: "Find Nearby",
    description: "Discover local businesses on an interactive map.",
  },
  {
    icon: HeartIcon,
    title: "Save Favorites",
    description: "Bookmark spots and never forget your favorites.",
  },
  {
    icon: StoreIcon,
    title: "Support Local",
    description: "Help local businesses thrive in your area.",
  },
  {
    icon: UsersIcon,
    title: "Community",
    description: "Connect with locals who share your interests.",
  },
];

const steps = [
  {
    icon: MapIcon,
    title: "Open the map",
    description: "See all local businesses in your area at a glance.",
  },
  {
    icon: BookmarkIcon,
    title: "Explore & discover",
    description: "Browse businesses, read reviews, and find hidden gems.",
  },
  {
    icon: HandHeartIcon,
    title: "Visit & support",
    description: "Support your local community and share your experiences.",
  },
];

function LandingAuthNav() {
  const { user, isAuthenticated, isVerified, signOut } = useSession();

  if (isAuthenticated && user) {
    return (
      <li className="flex items-center gap-3">
        <a
          href="/profile"
          className="text-foreground flex items-center gap-1.5 font-medium hover:underline"
        >
          {user.name}
          {isVerified ? null : (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-normal text-amber-600 dark:text-amber-400">
              Unverified
            </span>
          )}
        </a>
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
      <a
        href="/login"
        className="text-muted-foreground hover:text-foreground font-medium transition-colors"
      >
        Sign in
      </a>
      <a
        href="/signup"
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-4 py-1.5 font-medium transition-colors"
      >
        Sign up
      </a>
    </li>
  );
}

function LandingHeader() {
  return (
    <header className="border-border/60 border-b">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4"
      >
        <a href="/" className="text-primary text-lg font-bold tracking-tight">
          LocaLoco
        </a>
        <ul className="flex items-center gap-6 text-sm">
          {navLinks.map(link => (
            <li key={link.href}>
              <a
                className="text-muted-foreground hover:text-foreground transition-colors"
                href={link.href}
              >
                {link.label}
              </a>
            </li>
          ))}
          <LandingAuthNav />
        </ul>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="bg-accent/40 px-6 py-24 text-center md:py-32">
      <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-balance md:text-6xl">
        Find local gems <span className="text-primary">right around the corner</span>
      </h1>
      <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-relaxed md:text-xl">
        Connect with independent shops, cozy cafés, and hidden markets — all in one beautiful,
        map-driven experience.
      </p>
      <a
        href="/listings"
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-10 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold transition-colors"
      >
        Let&rsquo;s go!
      </a>
    </section>
  );
}

function WhySection() {
  return (
    <section id="why" className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Why LocaLoco?</h2>
          <p className="text-muted-foreground mt-3 text-lg">
            Everything you need to explore and support your community
          </p>
        </div>
        <ul className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(feature => (
            <li key={feature.title} className="flex flex-col items-center gap-3 text-center">
              <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
                <feature.icon aria-hidden="true" className="size-6" />
              </span>
              <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowSection() {
  return (
    <section id="how" className="bg-accent/40 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
        <ol className="mt-14 space-y-10">
          {steps.map((step, index) => (
            <li key={step.title} className="flex items-start gap-5">
              <span
                aria-hidden="true"
                className="border-primary text-primary flex size-10 shrink-0 items-center justify-center rounded-full border font-semibold"
              >
                {index + 1}
              </span>
              <div className="pt-1">
                <step.icon aria-hidden="true" className="text-primary mb-2 size-5" />
                <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
                <p className="text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-border/60 border-t px-6 py-8 text-center">
      <p className="text-muted-foreground text-sm">&copy; 2026 LocaLoco. All rights reserved.</p>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <LandingHeader />
      <main className="flex-1">
        <Hero />
        <WhySection />
        <HowSection />
      </main>
      <LandingFooter />
    </div>
  );
}
