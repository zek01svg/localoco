import { Link } from "@tanstack/react-router";
import { BookmarkIcon, MapPinIcon, StoreIcon, UsersIcon } from "lucide-react";

import { TissuePacketIcon } from "#client/components/custom/tissue-packet-icon";

const features = [
  {
    icon: MapPinIcon,
    title: "Find what's near",
    description: "Every listing sits on the map, so you can see what's open around you right now.",
  },
  {
    icon: BookmarkIcon,
    title: "Chope your spots",
    description: "Bookmark the places you love and get back to them in one tap.",
  },
  {
    icon: StoreIcon,
    title: "Back the independents",
    description: "Reviews and recommendations help neighbourhood businesses thrive.",
  },
  {
    icon: UsersIcon,
    title: "Talk shop",
    description: "Swap orders, tips, and finds with locals in the community forum.",
  },
];

const steps = [
  {
    title: "Open the directory",
    description: "Search by name, category, or neighbourhood — or just browse the map.",
  },
  {
    title: "Pick your spot",
    description: "Check opening hours, reviews, and announcements before you head down.",
  },
  {
    title: "Visit & share",
    description: "Support the shop, then leave a review or start a forum post.",
  },
];

function Hero() {
  return (
    <section className="border-border/60 border-b">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-8 pb-20 sm:px-6 md:pt-10 md:pb-28 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="font-display mt-5 text-4xl leading-[1.08] tracking-tight text-balance md:text-6xl">
            Find <span className="text-primary inline-block whitespace-nowrap">local gems</span>{" "}
            before the queue does.
          </h1>
          <p className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed">
            Kopitiams, provision shops, independent bookshops — the places that make your
            neighbourhood yours, mapped and reviewed by the people who live here.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/listings"
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-full px-8 py-3.5 text-base font-semibold transition-colors"
            >
              Let&rsquo;s go!
            </Link>
            <Link
              to="/forum"
              className="border-border hover:bg-muted/80 inline-flex items-center rounded-full border px-6 py-3.5 text-base font-semibold transition-colors"
            >
              Join the forum
            </Link>
          </div>
          <p className="text-muted-foreground mt-6 text-sm">
            <a href="#why" className="underline-offset-4 hover:underline">
              Why LocaLoco
            </a>
            <span aria-hidden="true"> · </span>
            <a href="#how" className="underline-offset-4 hover:underline">
              How it works
            </a>
          </p>
        </div>
        <StorefrontScene />
      </div>
    </section>
  );
}

/* Decorative shopfront built entirely from CSS — charcoal in both themes by
   design; it is an illustration, not themed UI. */
function StorefrontScene() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-sm select-none">
      <div className="rounded-xl border border-black/10 bg-[#2a2926] text-[#f2ede4] shadow-2xl dark:border-white/10">
        <div className="awning-hero">
          <div className="awning-band awning-band-striped h-7" />
          <div className="awning-scallops" />
        </div>
        <div className="flex flex-col items-center px-8 pt-9 pb-0">
          <div className="border-primary/60 rounded-md border-2 px-7 py-3.5 text-center">
            <p className="font-display text-primary text-3xl tracking-wide [text-shadow:0_0_18px_rgba(255,161,163,0.35)]">
              Kopi &amp; Toast
            </p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.3em] uppercase opacity-60">
              Heritage · Singapore
            </p>
          </div>
          <div className="mt-6 h-24 w-full rounded-t-md border border-white/10 [background:repeating-linear-gradient(180deg,rgba(255,255,255,0.07)_0_5px,transparent_5px_11px)]" />
          <div className="relative w-full">
            <TissuePacketIcon className="text-primary/80 absolute -top-8 left-6 size-6 -rotate-6" />
            <div className="h-2 w-full rounded-t bg-white/10" />
          </div>
          <div className="h-3 w-full [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.08)_0_28px,transparent_28px_56px)]" />
        </div>
      </div>
      <div className="plaque-flicker absolute -top-3 -right-3 rotate-3 rounded-md border-2 border-[#52b788] bg-[#232220] px-3 py-1.5 font-mono text-sm tracking-[0.25em] text-[#52b788] [box-shadow:0_0_16px_rgba(82,183,136,0.3)]">
        OPEN
      </div>
    </div>
  );
}

function WhySection() {
  return (
    <section id="why" className="scroll-mt-24 px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-6xl">
        <p className="text-muted-foreground font-mono text-xs tracking-[0.3em] uppercase">
          Why LocaLoco
        </p>
        <h2 className="font-display mt-3 text-3xl tracking-tight md:text-4xl">Why LocaLoco?</h2>
        <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(feature => (
            <li key={feature.title} className="flex flex-col gap-3">
              <span className="bg-primary/15 text-primary flex size-10 items-center justify-center rounded-md">
                <feature.icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className="font-display text-lg tracking-tight">{feature.title}</h3>
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
    <section id="how" className="scroll-mt-24 px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-3xl">
        <p className="text-muted-foreground font-mono text-xs tracking-[0.3em] uppercase">
          How it works
        </p>
        <h2 className="font-display mt-3 text-3xl tracking-tight md:text-4xl">
          Three steps to your new regular
        </h2>
        <ol className="border-border bg-card mx-auto mt-12 max-w-md rounded-lg border border-dashed p-6 sm:p-8">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="not-first:border-border flex items-start gap-4 py-4 not-first:border-b not-first:border-dashed"
            >
              <span aria-hidden="true" className="text-primary pt-0.5 font-mono text-sm">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-semibold tracking-tight">{step.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
          <li
            aria-hidden="true"
            className="text-muted-foreground pt-5 text-center font-mono text-xs tracking-[0.2em] uppercase"
          >
            *** see you at the kopitiam ***
          </li>
        </ol>
      </div>
    </section>
  );
}

export function LandingPage() {
  return (
    <main>
      <Hero />
      <WhySection />
      <HowSection />
    </main>
  );
}
