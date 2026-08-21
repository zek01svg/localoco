---
name: "LocaLoco — Five-foot Way"
description: "Singapore neighbourhood business discovery — charcoal storefront at dusk with salmon signage"
colors:
  primary: "#ffa1a3"
  primaryForeground: "#2b1d1e"
  background: "#232220"
  foreground: "#f2ede4"
  backgroundLight: "#f7f2ea"
  foregroundLight: "#26231f"
  card: "#2a2926"
  cardForeground: "#f2ede4"
  muted: "#32312c"
  mutedForeground: "#a39d8f"
  border: "rgba(242, 237, 228, 0.14)"
  borderLight: "rgba(38, 35, 31, 0.15)"
  input: "#302f2b"
  inputLight: "#efe8db"
  success: "#52b788"
  successForeground: "#14261c"
  successLight: "#2e7d54"
  warning: "#dfa945"
  warningForeground: "#2a2010"
  warningLight: "#96660f"
  destructive: "#ff8585"
  destructiveForeground: "#2b1d1e"
  accent: "#38362f"
  accentLight: "#ffe9ea"
typography:
  display-hero:
    fontFamily: "Young Serif"
    fontSize: 3.75rem
    lineHeight: 1.05
    letterSpacing: -0.02em
  display-section:
    fontFamily: "Young Serif"
    fontSize: 2.25rem
    lineHeight: 1.1
    letterSpacing: -0.01em
  body-base:
    fontFamily: "Overpass Variable"
    fontSize: 1rem
    lineHeight: 1.6
  body-sm:
    fontFamily: "Overpass Variable"
    fontSize: 0.875rem
    lineHeight: 1.5
  label-caps:
    fontFamily: "Spline Sans Mono"
    fontSize: 0.75rem
    letterSpacing: 0.3em
  mono-data:
    fontFamily: "Spline Sans Mono"
    fontSize: 0.8125rem
    lineHeight: 1.4
rounded:
  sm: 4px
  md: 8px
  lg: 8px
  xl: 12px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primaryForeground}"
    rounded: "{rounded.md}"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primaryForeground}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.cardForeground}"
    rounded: "{rounded.md}"
  badge-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.successForeground}"
  badge-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.warningForeground}"
  input:
    backgroundColor: "{colors.input}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
  page-light:
    backgroundColor: "{colors.backgroundLight}"
    textColor: "{colors.foregroundLight}"
  surface-muted:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.mutedForeground}"
  border-default:
    backgroundColor: "{colors.border}"
  border-light:
    backgroundColor: "{colors.borderLight}"
  input-light:
    backgroundColor: "{colors.inputLight}"
    textColor: "{colors.foregroundLight}"
  banner-success-light:
    backgroundColor: "{colors.successLight}"
    textColor: "{colors.successForeground}"
  banner-warning-light:
    backgroundColor: "{colors.warningLight}"
    textColor: "{colors.warningForeground}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructiveForeground}"
  surface-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.foreground}"
  surface-accent-light:
    backgroundColor: "{colors.accentLight}"
    textColor: "{colors.foregroundLight}"
---

## Overview

Five-foot Way at dusk. The system is built from Singapore's shophouse vernacular — the covered five-foot way, the scalloped canvas awning valance, the hand-painted signboard, the tissue-packet chope on a hawker table. Charcoal (`#232220`) is the default ink — warm, not near-black — with salmon (`#ffa1a3`) as the single signage accent. Both colours are retained from the legacy palette; everything else was reset.

Dark is the identity. Light (warm paper `#f7f2ea`, kopitiam menu-paper) is fully supported via `next-themes` with `defaultTheme="dark"` and a CSS-driven toggle, but the hero storefront is charcoal in both modes by design. The signature is not a component but an atmosphere: a charcoal shopfront scene with a flickering OPEN plaque, a scalloped awning that runs as a persistent ribbon, and a tissue-packet glyph for bookmarks.

An agent that reads this file will produce charcoal-first pages with Young Serif display headings, Overpass body copy, Spline Sans Mono data, salmon pills and signage, and a repeating awning valance as the only decorative motif.

## Colors

The palette is deliberately narrow: charcoal + salmon carry the brand, bone carries the type, and two semantic hues carry state.

- **Primary (#ffa1a3):** Salmon — the legacy brand colour, untouched. Used for CTAs, wordmark accent (`LocaLoco`), awning band, liked hearts, and the “local gems” phrase in the hero. On charcoal it is ~8:1; on warm paper it pairs with `#2b1d1e` foreground to hold AA.
- **Background (#232220) / Foreground (#f2ede4):** Warm charcoal ink with bone type. `ForegroundLight (#26231f)` on `BackgroundLight (#f7f2ea)` for the light theme’s paper surfaces. `color-scheme: dark/light` is set via `.dark` on `html`.
- **Card (#2a2926) / Muted (#32312c) / Border (rgba 0.14):** Layered surfaces — card is one step up from background, muted is the table head and skeleton fill, border is a thin bone wash. Light equivalents shift to `#fffdf8` / `#ede5d7` / `rgba(38,35,31,0.15)`.
- **Success (#52b788) — “shutter-green”:** Open-now, Published, Verified. Text on tinted `success/10` pills; solid variant uses `successForeground (#14261c)`. Light mode darkens to `#2e7d54` for contrast on paper. Replaces scattered `emerald-*`.
- **Warning (#dfa945) — “sign-amber”:** Pending Review, Unverified, publication gate. Same pill pattern as success. Light mode `#96660f`.
- **Destructive (#e5484d):** Distinct from salmon (salmon is peach-pink, destructive is true red) so “Delete” never reads as “primary”.

Charts reuse the same hues: `chart-1` salmon, `chart-2` shutter-green, `chart-3` sign-amber — no new colours introduced for data.

## Typography

Type carries the personality; the previous app shipped no fonts (Inter was a dependency but never imported).

- **Display — Young Serif (400 only):** Chunky, painted-signboard warmth. Used for marketing and page titles (`Discover local businesses`, `Kopi & Toast Heritage`, `Why LocaLoco?`, `Welcome back`) via `font-display`. Single weight is intentional — hierarchy comes from size and colour, not faux-bold (Young Serif has no bold; `font-semibold` on these headings is omitted).
- **Body/UI — Overpass Variable:** Derived from Highway Gothic (U.S. road signage). Wayfinding DNA is the point — a discovery/map product rendered in a wayfinding face. All body, labels, and navigation. `font-sans` is set as the global `body` face; letter-spacing is slightly tight on headings (`-0.02em` hero, `-0.01em` section).
- **Data — Spline Sans Mono (400, 500):** UEN (`T20LL1001A`), opening-hours table (`07:00 – 19:00`), receipt numbers (`01`), eyebrows (`SINGAPORE · NEIGHBOURHOOD BUSINESSES`). Tabular, stamped-ticket feel; 500 is reserved for the “Today” pill.

Scale is restrained: hero `text-4xl → md:text-6xl`, section `text-3xl → md:text-4xl`, body `text-sm → text-base`, mono `text-xs`. No italic — Young Serif ships only Roman.

## Layout

The previous app rolled a bespoke header per page; this system introduces a single shared shell.

- **Shell:** `src/routes/__root.tsx` wraps every route in `SiteHeader` + `flex-1 Outlet` + `SiteFooter` on a `max-w-6xl` / `max-w-7xl` centred column with `px-4 sm:px-6`. Header is `sticky top-0 z-40` with a faint `backdrop-blur` and `bg-background/95` so the awning ribbon persists while scrolling. Footer is a quiet ink band with `LocaLoco` and “Made for Singapore’s neighbourhoods. © 2026.”
- **Landing hero:** Two-column `lg:grid-cols-[1.1fr_1fr]` — left copy (eyebrow → `display-hero` → sub → two pills `Let’s go!` + `Join the forum` → quiet anchor links), right CSS-built storefront illustration. The hero band is fixed `bg-[#232220] text-[#f2ede4]` in both themes so the storefront reads as an illustration, not a themed card.
- **Discovery:** `lg:grid-cols-12` — `lg:col-span-7` text directory (search + category select + Open now switch) and `lg:col-span-5 lg:sticky` map panel (`h-[calc(100vh-8rem)]`). Listing names are `font-display` — each card reads like a shop sign.
- **Listing detail:** `lg:grid-cols-12` — `lg:col-span-7` main (gallery → announcements → events → About → map) and `lg:col-span-5` sidebar (`Opening Hours` card + `Contact & Online` card). `About` is omitted when `description` is null.
- **Forum/profile/business:** Single-column `max-w-3xl` / `max-w-xl` centred stacks; forum post card is `bg-card rounded-lg border shadow-xs` (unified idiom — the previous `rounded-xl shadow-sm` vs `rounded-lg shadow-xs` split is removed via `src/components/ui/card.tsx` now `rounded-lg shadow-xs`).
- **Auth:** `AuthPageShell` is now chromeless-centred; the global wordmark in `SiteHeader` replaces its former local wordmark.

Responsive is mobile-first: header wraps (`flex-wrap gap-x-6 gap-y-2`), grids collapse to single column, and all pages were captured at 390 px.

## Elevation & Depth

Almost flat, with depth reserved for the storefront moment.

- Cards and feed items: `shadow-xs` (feed) / `shadow-sm` removed in favour of `shadow-xs` globally — just enough to lift from the charcoal field. No diffuse shadows on the landing Why/How bands.
- Storefront illustration: `shadow-2xl` on the outer rounded-xl to read as a lit shopfront floating off the ink.
- Map overlay buttons and gallery arrows: `shadow-md` — the only floating controls.
- No `backdrop-blur` beyond the sticky header; no glass, no gradients (the only gradient is the awning scallop mask).

## Shapes

Radius is tightened from the previous `0.625rem` to `--radius: 0.5rem` (`8px`) — sturdier, more sign-like.

- **Pills:** `rounded-full` for CTAs, `Sign up`, category `Badge`, and the OPEN plaque — signage plaques are oval.
- **Cards/inputs:** `rounded-lg` (`8px`) for `Card`, feed `article`, `AuthCard`, map container; `rounded-md` (`6px`) for icon chips (`size-10 rounded-md bg-primary/15`) and small `Badge`; `rounded-sm` for table containers.
- **Storefront:** `rounded-xl` (`12px`) — the sole larger radius, marking it as illustration not UI.
- **Borders:** `border-border` (`rgba 0.14`) hairline everywhere; `border-dashed` only for the integer receipt (see Components).

## Components

- **Awning valance:** The brand ribbon. `globals.css` defines `.awning-band` (10 px solid `var(--primary)`), `.awning-band-striped` (10 px repeating off-white stripe `repeating-linear-gradient 90deg`), and `.awning-scallops` (8 px row of half-discs `radial-gradient circle at 8px 0`). `.awning-hero` overrides `--awning-size: 20px` for the chunkier hero storefront. `SiteHeader` renders the valance above the nav on every page; the landing storefront repeats it at illustration scale. Chanel’s rule: this is the one accessory — nothing else competes for memorability.
- **OPEN plaque:** Mono `tracking-[0.25em]`, `border-2 border-[#52b788] bg-[#232220] text-[#52b788]`, `rotate-3`, `box-shadow 0 0 16px rgba(82,183,136,0.3)`. Class `.plaque-flicker` runs `plaque-flicker 1.3s steps(1,end) 0.3s 1 both` — a single neon stutter (18% → 41% opacity steps) gated by `@media (prefers-reduced-motion: no-preference)`. No JS.
- **TissuePacketIcon:** `src/components/custom/tissue-packet-icon.tsx` — a 24×24 SVG pocket tissue packet (rounded rect + zigzag perforation + band). Used as the visual mark for `BookmarkButton`; the button’s accessible names remain `Save bookmark` / `Remove bookmark` so the pun doesn’t cost semantics. Active state is `fill-primary/20 text-primary`.
- **Receipt chit:** “How it works” on a `max-w-md rounded-lg border border-dashed bg-card p-6` list. Steps are `font-mono 01 · 02 · 03` in `text-primary`, with `not-first:border-b border-dashed` dividers and a closing `*** see you at the kopitiam ***` line — kopitiam receipt vernacular, doubles as a process timeline where numbering carries real order.
- **Hours table:** `ListingHoursSchedule` renders a `table` with mono `HH:mm – HH:mm (next day)` and a `Today` pill (`bg-primary/10 text-primary`). Today’s row is `bg-primary/5 font-semibold`. “Closed” badges use `border-success/30 bg-success/10 text-success` vs `secondary` when shut.
- **ThemeToggle:** `SiteHeader` reads no React state for the icon; it toggles `document.documentElement.classList.contains("dark") ? "light" : "dark"` via `next-themes setTheme` and shows `SunIcon hidden dark:block` / `MoonIcon dark:hidden` — no hydration mismatch, no `useState` in an effect.

## Do's and Don'ts

- **Do** use Young Serif only for signboard moments (page/section headings, shop names) at 400 with `tracking-tight`. **Don’t** synthesise bold on it — Overpass covers semibold UI.
- **Do** keep salmon for signage and primary actions. **Don’t** use it for destructive (use `#e5484d`) or for stars — rating stars remain `amber-500` by convention.
- **Do** repeat the awning valance as the single decorative system. **Don’t** add new motifs (no gradients, no glass, no broadsheet hairlines — the AI defaults of warm cream + high-contrast serif + terracotta, near-black + acid, and dense newspaper columns were explicitly rejected).
- **Do** keep “local gems” together — the hero wraps it as `inline-block whitespace-nowrap` so the salmon phrase never breaks mid-thought.
- **Do** respect `prefers-reduced-motion` (the OPEN flicker is CSS-gated; no JS animation). **Don’t** scatter motion — one orchestrated load moment, otherwise quiet.
- **Do** keep bookmarks as `Bookmark` in code and `Save bookmark` in aria — the tissue packet is a visual glyph only. **Don’t** rename the domain concept to “chope” in APIs or tests (`CONTEXT.md` reserves `Bookmark`).
- **Do** use mono for UEN, times, and receipt numbers. **Don’t** use mono for body copy.
- **Don’t** add abstractions for single uses — `AppThemeProvider` exists only to mirror `ReactQueryProvider` shape; if it collapses to one line, inline it into `main.tsx`.
