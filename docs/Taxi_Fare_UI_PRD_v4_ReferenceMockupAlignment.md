# PRD v4 — Align React Client with the Reference HTML Mockup

### For the AI coding agent (and human reviewers) — revises `client/`, does not rebuild it

**Repo:** `IamHaque/new-york-city-taxi-fare-prediction`
**Scope:** `client/src/**`. No changes to `server/`, `scripts/`, `trained-models/`, or `notebooks/`
except the **new** file added in Epic 8.
**Supersedes:** `docs/Taxi_Fare_UI_PRD_v3_VisualIdentityMatch.md` for everything visual (palette,
fonts, layout, header treatment). PRD v3's non-visual instructions that are unrelated to this pass
(e.g. its Section 4 "explicit non-matches") are moot once this document's palette replaces the
"Bingo Bust" palette it was protecting. PRD v1 and v2's bug fixes are **already resolved in the
current codebase** (verified by reading the files — `avgFareByHour.json` has all 24 hours,
`App.tsx` imports `TripInput` from `@/types/trip`, `prettier` + `prettier-plugin-tailwindcss` are
present alongside `oxlint`) — no action needed there.

---

## 0. What "the HTML" Means, Concretely

The person supplied a static reference file (`taxi-fare-ui-v3.html`) built earlier in this
conversation as a Tailwind + shadcn-token mockup. It is **not** meant to be ported byte-for-byte —
it uses vanilla SVG charts and hand-rolled Leaflet instead of Recharts and react-leaflet, because it
had no real backend to call. The React app already has react-leaflet, recharts, and a real Flask API
behind it, all of which the mockup was simulating. This PRD's job is to translate the mockup's
**design decisions**, not its markup, into the existing component tree:

1. A blue/amber "city" palette, not the mockup's earlier purple "Bingo Bust" palette.
2. A system-aware theme toggle (System → Light → Dark), not just Light/Dark.
3. A **two-column, map-as-hero layout** (large sticky map left, compact input+result rail right) —
   not today's single stacked card with a 400px map wedged inside it.
4. Manual pin-selection and "describe your trip" shown **together**, not behind a mode toggle.
5. A **result panel** that always has a visible slot (empty / loading / error / populated states)
   with a fare, a comparison to the city average, a likely range, a cost breakdown, and secondary
   stats (distance, $/mile, $/rider, ETA).
6. A **recent estimates** list.
7. A **multi-chart, tabbed insights dashboard** (Demand / Fares / Locations / Model & Data), not a
   single "Average Fare by Hour" chart.
8. Real, notebook-derived numbers behind every chart, not the currently hand-typed
   `avgFareByHour.json`.

---

## 1. Ground Truth: Correct the Mockup Against the Real Backend

The mockup guessed at two things it had no server for. Reading `server/app.py`, `server/services.py`,
and `scripts/config.py` corrects both — **the existing React app already implements the correct
version of each**, so this section is a record of what NOT to break, not new work:

| Mockup assumption                                 | Reality (`server/app.py`, `scripts/config.py`)                                                                                                                                                                                                                | Already handled by                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /predict` takes a `pickup_datetime` string  | It takes **decomposed** `hour`, `day_of_week_num`, `month`, `year` (see `FEATURE_COLUMNS`), plus `pickup_lat`/`pickup_lon`/`dropoff_lat`/`dropoff_lon`/`passenger_count`. No datetime string crosses the wire.                                                | `utils/dateTimeUtils.ts` (`decomposeDateTime`), `types/trip.ts` (`TripInput`)                                                                  |
| `POST /predict` returns fare + distance           | Confirmed: `{ fare_amount, distance_km }`, `distance_km` **not** miles.                                                                                                                                                                                       | `types/trip.ts` (`PredictionResult`), `api/fareApi.ts`                                                                                         |
| `POST /parse-trip` (LLM) returns lat/lon directly | It returns **landmark name strings** (`pickup_landmark`, `dropoff_landmark`) plus the decomposed time fields — Ollama never sees or returns coordinates (see `TRIP_PARSER_PROMPT_TEMPLATE` in `scripts/config.py`). Coordinates must be resolved client-side. | `utils/landmarks.ts` (`LANDMARK_COORDINATES`, `enrichParsedTripWithCoordinates`) — already a 31-entry table, wider than the mockup's 7         |
| Reverse-geocoded place names on the map           | Not part of `/predict` or `/parse-trip` at all — this is a pure frontend nicety.                                                                                                                                                                              | `utils/geocoding.ts` — already calls Nominatim with a queue + cache; keep this, it's better than the mockup's hardcoded nearest-landmark guess |
| No RMSE / feature-importance data exists anywhere | It does — `notebooks/train.ipynb` prints baseline/linear/random-forest RMSE, and `scripts/train_extreme.py` trains the **production** model (XGBoost, log-target, `FEATURE_COLUMNS`, targeting RMSE < 3.0).                                                   | Nothing yet — this is new work, see Epic 8                                                                                                     |

**Action for this PRD:** none of the above needs fixing. Epics 4–8 must be written to keep using
these exact contracts (decomposed time fields, `distance_km`, landmark-string parsing) rather than
reintroducing the mockup's simplified assumptions.

One real gap to flag, not fix here: `/parse-trip`'s LLM prompt only ever returns a landmark **name**,
and `landmarks.ts` only resolves 31 hardcoded names. A description naming an address or an
unlisted neighborhood will silently fail to produce coordinates. This is a backend/prompt limitation,
out of scope for a client-only PRD — Epic 4 below specifies the correct **error state** for it, not
a fix for it.

---

## 2. Dependency Audit — No New Packages Required

`client/package.json` already has everything this PRD needs:

| Need                                 | Already installed                                                                                              | Notes                                                                                                                                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Map + pins                           | `leaflet@^1.9.4`, `react-leaflet@^5.0.0`, `@types/leaflet`                                                     | `TripMap.tsx` already uses these correctly                                                                                                                                              |
| Charts                               | `recharts@^3.10.1`                                                                                             | Currently only used once (`FareChart.tsx`); Epic 7 adds ~8 more chart components on the same library                                                                                    |
| Icons                                | `lucide-react`                                                                                                 | Used throughout; Epic 5/6 need a couple more icon imports (`History`, `TrendingUp`, `TrendingDown`) — already part of the package, no install needed                                    |
| Styling primitives                   | Radix (`label`, `select`, `separator`, `slot`, `switch`), `class-variance-authority`, `tailwind-merge`, `clsx` | shadcn-style `components/ui/*` already built on these                                                                                                                                   |
| Tabs (for Epic 7's chart categories) | **Not present** — no `@radix-ui/react-tabs`                                                                    | See Epic 7, Story 7.1 — build a 6-line custom tab-button-group instead of adding a dependency, matching how `InputModeToggle.tsx` already implements a manual toggle without Radix Tabs |

**Decision: zero new dependencies.** Everything the reference mockup does (map, charts, tabs,
theming) has a library already in `package.json`; the one missing primitive (tabs) is small enough
to hand-roll consistent with the codebase's existing pattern rather than adding Radix Tabs for one
use site.

---

## 3. Design Tokens — Replace the Palette in `src/index.css` and `tailwind.config.ts`

The current tokens (in `index.css`) are the purple "Bingo Bust" set from PRD v3. Replace with a
blue/amber palette matching the reference mockup, kept in the **same raw-hex custom-property format**
the file already uses (no `hsl()` wrapper, consistent with the existing convention — do not
reintroduce the `hsl(var(--x))` pattern from earlier PRDs).

### 3.1 `src/index.css`

```css
@layer base {
  :root {
    --background: #f7f8fa;
    --foreground: #12172a;
    --card: #ffffff;
    --card-foreground: #12172a;
    --popover: #ffffff;
    --popover-foreground: #12172a;
    --primary: #12172a;
    --primary-foreground: #fafafa;
    --secondary: #eef0f4;
    --secondary-foreground: #12172a;
    --muted: #eef0f4;
    --muted-foreground: #5b6272;
    --accent: #eaecf1;
    --accent-foreground: #12172a;
    --destructive: #c22f22;
    --destructive-foreground: #ffffff;
    --success: #0e8a5f;
    --success-foreground: #ffffff;
    --border: #dfe2e8;
    --input: #d5d9e0;
    --ring: #2f6fed;
    --brand: #f5bb2e;
    --brand-foreground: #241a04;
    --pickup: #0e9f6e;
    --dropoff: #e1355e;
    --chart-1: #2f6fed;
    --chart-2: #f5bb2e;
    --radius: 0.625rem;
  }

  .dark {
    --background: #0b0e16;
    --foreground: #f2f3f6;
    --card: #131826;
    --card-foreground: #f2f3f6;
    --popover: #131826;
    --popover-foreground: #f2f3f6;
    --primary: #f2f3f6;
    --primary-foreground: #12172a;
    --secondary: #1c2233;
    --secondary-foreground: #f2f3f6;
    --muted: #1c2233;
    --muted-foreground: #9aa1b2;
    --accent: #202739;
    --accent-foreground: #f2f3f6;
    --destructive: #e1584a;
    --destructive-foreground: #ffffff;
    --success: #38b787;
    --success-foreground: #0b0e16;
    --border: #232a3d;
    --input: #2b3348;
    --ring: #6f9bff;
    --brand: #f5bb2e;
    --brand-foreground: #241a04;
    --pickup: #34d399;
    --dropoff: #fb7185;
    --chart-1: #6f9bff;
    --chart-2: #f5bb2e;
  }
}
```

Also add, in the same `@layer base` block, a `[data-theme]` variant so the tri-state toggle in
Epic 9 works without fighting `prefers-color-scheme`:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    /* re-declare the .dark block's values here, or refactor
    .dark to a shared selector list `.dark, :root:not([data-theme])` — agent's choice, but the
    system-preference case (no explicit data-theme) must resolve to the same values as .dark */
  }
}
```

### 3.2 `tailwind.config.ts`

Add the new tokens alongside the existing ones (do not remove `success` — still used by validation
states):

```ts
colors: {
  // ...existing entries unchanged...
  brand: { DEFAULT: 'var(--brand)', foreground: 'var(--brand-foreground)' },
  pickup: 'var(--pickup)',
  dropoff: 'var(--dropoff)',
  'chart-1': 'var(--chart-1)',
  'chart-2': 'var(--chart-2)',
},
```

### 3.3 Fonts

PRD v3 switched the app to Space Grotesk + IBM Plex Mono. **Keep that** — the reference mockup used
a single geometric sans (Geist) purely because it was a static file with no numeric-vs-label
distinction to encode; the existing two-font system (UI text vs. tabular numbers) is a strictly
better solve for a data-heavy fare app and nothing in the reference contradicts it. No font change
in this PRD.

---

## Epic 1 — Theme Token Migration

**As** a rider comparing this tool to a real ride-hailing app,
**I want** the interface to look like a modern city-transit product (blue/amber), not a generic
purple admin theme,
**so that** the visual identity matches the domain (taxis, maps, fares).

### Story 1.1 — Replace CSS custom properties

- **Given** `src/index.css` currently defines the PRD v3 purple palette
- **When** the agent applies Section 3.1's token block
- **Then** `:root` and `.dark` both resolve to the blue/amber/green/rose palette, and every existing
  component that only ever references Tailwind color tokens (never hardcoded hex) repaints correctly
  with no component-level code changes needed
- **And** the corrupted placeholder lines from Section 3.1 are cleaned up before commit

### Story 1.2 — Extend `tailwind.config.ts`

- **Given** the new `--brand`, `--pickup`, `--dropoff`, `--chart-1`, `--chart-2` variables exist
- **When** the agent adds the corresponding entries to `theme.extend.colors`
- **Then** `bg-brand`, `text-pickup`, `border-dropoff`, `fill-[hsl(var(--chart-1))]`-style Recharts
  fills, etc. are all available as Tailwind utilities

### Story 1.3 — Visual regression check

- **Given** the token swap is complete
- **When** the agent runs the app in both light and dark mode
- **Then** every existing surface (cards, buttons, badges, the map's pickup/dropoff markers, form
  focus rings) shows the new palette with no leftover purple, and contrast is checked against
  WCAG AA for text-on-background and text-on-card pairs

**Files touched:** `src/index.css`, `tailwind.config.ts`.
**Depends on:** nothing. **Blocks:** all other epics (do this first).

---

## Epic 2 — App Shell: Two-Column, Map-as-Hero Layout

**As** a person estimating a fare,
**I want** the map to be the largest, most prominent thing on screen, with trip inputs and the
result in a compact side rail,
**so that** placing pins feels like the primary action, matching how the reference mockup and most
real ride-hailing apps are laid out — not a form with a small map buried inside it.

### Story 2.1 — Restructure `App.tsx`'s main content grid

- **Given** `App.tsx` currently renders a single `<TripDetails>` card inside `<main className="max-w-7xl px-5 py-8">`
- **When** the agent introduces a new top-level layout component (`components/TripPlanner/TripPlanner.tsx`, replacing the current direct `<TripDetails>` usage in `App.tsx`) with a CSS grid: `grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-5 items-start`
- **Then** on large screens the map occupies the left column and the input/result rail occupies a
  fixed ~400px right column; on small screens both stack full-width, map first

### Story 2.2 — Make the map fill its column, not a fixed 400px box

- **Given** `TripMap.tsx` currently hardcodes `style={{ height: '400px', width: '100%' }}` on `MapContainer`
- **When** the agent changes the map's wrapper to `h-[420px] lg:h-[calc(100vh-8rem)] lg:min-h-[560px] lg:sticky lg:top-[5.5rem]`
- **Then** the map is short on mobile (420px, non-sticky, since sticky map + stacked form is a poor
  mobile pattern) and tall + sticky on desktop (fills the viewport height, stays in view while the
  person scrolls the right-hand rail or the insights section below)

### Story 2.3 — Split `TripDetails.tsx` into rail sections

- **Given** `TripDetails.tsx` is currently one 350-line component doing form state, map wiring,
  validation, submission, and chart rendering all at once
- **When** the agent decomposes it into: `TripInputCard` (map mode switch + coordinate/time/passenger
  fields + describe-trip textarea, see Epic 4), `FareResultCard` (see Epic 5), `RecentEstimatesCard`
  (see Epic 6) — each own file under `components/`
- **Then** `TripPlanner.tsx` composes: left column = `<TripMap>`; right column = `<TripInputCard>`,
  `<FareResultCard>`, `<RecentEstimatesCard>` stacked vertically; state (`values`, `errors`,
  `touched`, pin coordinates) stays lifted in `TripPlanner.tsx` and is passed down as props, exactly
  like `TripDetails.tsx` does today — this is a decomposition of one file into four, not a rewrite
  of the state logic
- **And** all existing validation (`validateTripInputs`), date decomposition (`decomposeDateTime`),
  and landmark enrichment (`enrichParsedTripWithCoordinates`) calls move with the code that used
  them, unchanged

**Files touched:** `src/App.tsx` (simplified to render `TripPlanner` + `InsightsSection`, see Epic 7),
new `src/components/TripPlanner/TripPlanner.tsx`, `src/components/TripMap/TripMap.tsx` (height/sticky
classes only), `src/components/TripDetails/TripDetails.tsx` split into `TripInputCard.tsx`,
`FareResultCard.tsx`, `RecentEstimatesCard.tsx` (new files under their own folders, following the
existing one-component-per-folder convention).
**Depends on:** Epic 1 (do the palette first so new components are built against final tokens).

---

## Epic 3 — Map UX Parity with the Reference

**As** a person placing pickup and drop-off pins,
**I want** the same at-a-glance affordances the mockup demonstrated — a floating mode switch, a
distance readout on the route line, and a way to clear both pins,
**so that** the interaction feels finished, not just functional.

### Story 3.1 — Float the pickup/dropoff switch over the map

- **Given** `TripMap.tsx` currently renders "Set Pickup"/"Set Dropoff" buttons **above** the map in
  normal document flow
- **When** the agent moves this button group inside the map's relatively-positioned wrapper with
  `absolute top-3 left-3 z-[1000]` and a `bg-card/90 backdrop-blur border rounded-lg shadow-md p-1`
  container (matching the reference's floating pill control)
- **Then** the switch overlays the top-left corner of the map itself, freeing vertical space, and
  remains usable while the map is tall/sticky (Epic 2, Story 2.2)
- **And** the active button uses `bg-pickup`/`text-pickup-foreground`-equivalent (or the existing
  `--primary` token, agent's call — pick whichever the palette in Epic 1 makes visually distinct
  from the inactive state) rather than today's `bg-primary/15` for pickup and `bg-destructive/15`
  for dropoff, since dropoff is no longer "destructive"-colored in the new palette (Epic 1 introduces
  a dedicated `--dropoff` rose token instead of reusing red-as-error)

### Story 3.2 — Show live distance on the route line

- **Given** `Polyline` currently renders the pickup–dropoff line with no label
- **When** the agent adds a Leaflet `Tooltip` (react-leaflet's `<Tooltip permanent direction="center">`
  as a child of `<Polyline>`) showing the great-circle distance in miles, computed client-side with
  the same haversine math already needed for Story 7.x chart work (factor into a shared
  `src/utils/geo.ts` haversine function so it's not duplicated between the map and any chart that
  needs distance)
- **Then** as soon as both pins exist, a pill reading e.g. "4.2 mi" appears at the line's midpoint,
  updating live as either marker is dragged
- **Note:** this is a client-side straight-line estimate for display polish only — it is **not** a
  substitute for `distance_km` returned by `/predict` (which is also haversine-based per
  `scripts/shared/features.py`, so the two numbers will actually agree, but the API response remains
  the source of truth for anything shown in `FareResultCard`)

### Story 3.3 — Add a "Clear pins" control

- **Given** there is currently no way to remove both pins short of manually dragging or reloading
- **When** the agent adds a button (`absolute top-3 right-3 z-[1000]`, same floating-pill treatment
  as Story 3.1) labeled "Clear pins", visible whenever at least one pin is set
- **Then** clicking it clears `pickup`/`dropoff` state (calling the existing `onPickupChange`/
  `onDropoffChange` callbacks with `null` — this requires widening those prop types from
  `(coord: Coordinate) => void` to `(coord: Coordinate | null) => void` in `TripMap.tsx` and its
  caller), clears any reverse-geocoded address strings, and resets the map view to the default NYC
  center/zoom

### Story 3.4 — Quick-jump landmark chips move into the rail, not the map

- **Given** `TripMap.tsx` currently renders 8 landmark quick-jump buttons **below** the map, inside
  the map component itself
- **When** the agent relocates this control to `TripInputCard` (Epic 4) as a row of chips under the
  describe-trip textarea, reusing the existing `LANDMARK_COORDINATES` data and click handler logic
  (moved, not duplicated)
- **Then** the map component itself only renders the map, the floating mode switch, and the floating
  clear button — matching the reference's clean map surface — while the landmark shortcuts live
  alongside the other "quick ways to fill the form" (the describe-trip box), which is where the
  reference groups them

**Files touched:** `src/components/TripMap/TripMap.tsx`, new `src/utils/geo.ts`, `src/components/TripInputCard/TripInputCard.tsx` (receives the relocated landmark chips).
**Depends on:** Epic 2 (map must already be in its new sticky/tall wrapper).

---

## Epic 4 — Unified Trip Input (Manual + Describe, Shown Together)

**As** a person who might prefer typing a sentence over hunting for exact pins,
**I want** the "describe your trip" box and the manual pin/time/passenger fields visible at the same
time, not gated behind a mode switch,
**so that** I can start with either one and freely correct the other, matching the reference mockup's
single always-visible card.

This **replaces** `InputModeToggle` (`components/shared/InputModeToggle.tsx`) — that toggle pattern
was PRD v3's explicit choice (Section 3.4 of that document) and is exactly what this PRD's reference
mockup does differently. Deleting it is intentional, not an oversight.

### Story 4.1 — Merge into one `TripInputCard`

- **Given** today `mode: 'manual' | 'describe'` in `App.tsx`/`TripDetails.tsx` renders **either** the
  coordinate form **or** `NaturalLanguageInput`, toggled by `InputModeToggle`
- **When** the agent builds `TripInputCard.tsx` rendering, top to bottom, in one always-visible card:
  1. A short textarea + "Estimate from text" button (the former `NaturalLanguageInput`, restyled to
     the compact treatment in the reference — 2-row textarea, inline chip suggestions, not a whole
     separate `Card` with its own header)
  2. The landmark quick-jump chips (relocated per Epic 3, Story 3.4)
  3. Two compact rows showing the currently-selected pickup/drop-off (name if reverse-geocoded,
     coordinates as a fallback/secondary line) — clicking either row calls the same `setActivePin`
     the map's floating switch uses, so the rail and the map's mode switch stay in sync (lift
     `activePin` state up from `TripMap` into `TripInputCard`/`TripPlanner` so both can read/set it —
     currently `activePin` is local `useState` inside `TripMap.tsx` and needs to move up one level)
  4. The date/time input and passenger stepper (unchanged logic from today's form, restyled to the
     compact two-column row from the reference)
  5. The submit button
- **Then** `mode` state and `InputModeToggle` are removed entirely from `App.tsx`, `TripDetails.tsx`
  (deleted after Epic 2's split), and `components/shared/InputModeToggle.tsx` is deleted
- **And** `parseTrip()` (from `api/fareApi.ts`) is still called exactly as today, still returns
  `ParsedTripDetails`, still gets enriched via `enrichParsedTripWithCoordinates` — only the
  surrounding UI changes, not the data flow

### Story 4.2 — Auto-estimate after a successful text parse

- **Given** the reference mockup calls the fare estimate automatically right after text parsing
  succeeds, rather than requiring a second manual click
- **When** the agent updates the parse-success handler to call the existing `onSubmit`/`predict`
  flow immediately after `enrichParsedTripWithCoordinates` produces valid coordinates
- **Then** describing a trip in text populates the map, the form fields, **and** shows a result,
  in one action — matching the reference's "Estimate from text" button label and behavior
- **But** if `enrichParsedTripWithCoordinates` fails to resolve one or both landmarks (see Section 1's
  flagged gap), the auto-estimate is skipped and an inline error explains which side (pickup/
  drop-off) couldn't be resolved and that the person should place that pin manually — this is the
  correct behavior for the real landmark-coverage limitation, not a mockup fantasy of always
  succeeding

### Story 4.3 — Dragging a pin re-estimates automatically

- **Given** the reference mockup re-runs the estimate whenever a placed pin is dragged (not just on
  explicit submit)
- **When** the agent adds a call to the existing predict flow inside `TripMap`'s marker
  `dragend` handler, gated on both pickup and drop-off already being set
- **Then** adjusting a pin after the fact updates the fare live, without requiring the person to find
  and click "Predict Fare" again — mirrors real map-based fare tools

**Files touched:** new `src/components/TripInputCard/TripInputCard.tsx`, delete
`src/components/NaturalLanguageInput/NaturalLanguageInput.tsx` (merged in) and
`src/components/shared/InputModeToggle.tsx`, edits to `TripMap.tsx` (lift `activePin` state up),
`TripPlanner.tsx` (own `activePin` state, pass to both `TripMap` and `TripInputCard`).
**Depends on:** Epic 2, Epic 3.

---

## Epic 5 — Fare Result Panel

**As** a person who just estimated a fare,
**I want** more than a bare dollar figure — I want to know if that's cheap or expensive for the
city, roughly what it includes, and how long the ride might take,
**so that** the number is legible on its own, matching the reference mockup's result card.

### Story 5.1 — Always-present result card with four states

- **Given** today's result only appears inline inside the manual form, and only in a "has result"
  vs "nothing" binary (no loading/error states shown in that inline block)
- **When** the agent builds `FareResultCard.tsx` with four explicit render states — **empty**
  ("Place both pins to see your estimated fare"), **loading** (skeleton blocks, reusing
  `components/ui/skeleton.tsx` which already exists but is currently unused anywhere in the app),
  **error** (reusing `components/shared/ErrorBanner.tsx`), **populated** — matching
  `useFarePrediction`'s existing `isLoading`/`error`/`result` trio one-to-one
- **Then** the card is always visible in the right rail (per Epic 2's layout), never conditionally
  unmounted, so its position doesn't jump around as state changes

### Story 5.2 — Fare vs. city average, and a likely range

- **Given** the API returns only `{ fare_amount, distance_km }` with no range or comparison
- **When** the agent adds, computed **client-side** for display only:
  - a comparison chip: `fare_amount / cityAverageFare` rendered as "1.8× the city average" or
    "Below the city average" (needs a `cityAverageFare` constant — source this from the same real
    number used in Epic 8's generated chart data, e.g. `$11.35` from the Kaggle sample-submission
    mean fare, not invented)
  - a "likely range" band, `fare_amount * 0.9` to `fare_amount * 1.12`, labeled clearly as an
    **illustrative** uncertainty band, not a model-calibrated confidence interval, since the model
    doesn't currently output one (see Section on Non-Goals — a real prediction interval would need
    quantile regression or a residual-based bootstrap in `scripts/train_extreme.py`, out of scope
    for a client PRD)
- **Then** the fare number is contextualized without the UI claiming statistical precision it
  doesn't have — copy must say "likely range" or "typical range," never "95% confidence interval"

### Story 5.3 — Illustrative fare breakdown

- **Given** the API returns one number, not a breakdown, and `scripts/shared/features.py` computes
  `is_rush_hour`, `is_overnight`, `is_jfk_trip`/`is_lga_trip` server-side but never exposes them back
  to the client
- **When** the agent computes a **labeled-as-illustrative** breakdown client-side from data the form
  already has (the submitted `hour`, `day_of_week_num`, and the pin coordinates against
  `LANDMARK_COORDINATES`' airport entries), e.g. "Base + distance," "Rush hour," "Airport trip," each
  as a proportional segment of a horizontal bar plus a small legend list
- **Then** the breakdown visually explains _why_ a fare might be higher without claiming to be the
  model's actual internal computation — a one-line disclaimer ("Estimated breakdown, not the model's
  internal calculation") is required directly under the bar
- **Recommendation, not required in this pass:** the cleanest real fix is a `server/app.py` change
  returning `is_rush_hour`/`is_overnight`/`is_jfk_trip`/`is_lga_trip` (already computed, currently
  discarded) alongside `fare_amount`/`distance_km`, so the breakdown becomes real instead of
  illustrative. Flagged here for a future backend PRD; this pass ships the client-only illustrative
  version since backend changes are out of scope.

### Story 5.4 — Secondary stat grid

- **Given** the reference mockup shows distance, $/mile, $/rider, and an ETA
- **When** the agent adds a 4-column stat grid: `distance_km` converted to miles for US-audience
  display (`distance_km * 0.621371`, labeled "mi"), `fare_amount / distanceMiles` as $/mile,
  `fare_amount / passenger_count` as $/rider, and an illustrative ETA computed as
  `distanceMiles / assumedMph * 60` minutes where `assumedMph` is 10 during the submitted trip's
  rush-hour window and 15 otherwise (same heuristic as the mockup, clearly labeled "Estimated
  travel time" not "arrival time")
- **Then** the four stats render in the reference's bordered 4-column grid layout

**Files touched:** new `src/components/FareResultCard/FareResultCard.tsx`, new
`src/utils/fareDisplay.ts` (houses the range/breakdown/ETA math from Stories 5.2–5.4 so it's unit-
testable and not buried in JSX), `src/components/ui/skeleton.tsx` (start actually importing it — no
changes needed to the primitive itself).
**Depends on:** Epic 1, Epic 2. **Data depends on:** Epic 8 for the real `cityAverageFare` constant.

---

## Epic 6 — Recent Estimates

**As** a person comparing a couple of trip options,
**I want** to see my last few estimates and reselect one,
**so that** I don't have to re-place pins to compare "airport trip" vs. "across town."

### Story 6.1 — In-memory recent-estimates list

- **Given** there is currently no history of past predictions anywhere in the app
- **When** the agent adds `RecentEstimatesCard.tsx`, backed by state lifted into `TripPlanner.tsx`
  (a simple array, newest first, capped at 5, **not** persisted to `localStorage` — this is
  intentionally session-only scope for this pass, matching that the app has no user accounts)
- **Then** every successful `/predict` call appends `{ pickupLabel, dropoffLabel, fare_amount,
distance_km, submittedAt }` to the list, using the reverse-geocoded address if available
  (`geocoding.ts`) or falling back to "Custom pin" / the nearest landmark name
- **And** clicking an item re-populates the map pins, the form fields, and re-runs the estimate

**Files touched:** new `src/components/RecentEstimatesCard/RecentEstimatesCard.tsx`, state addition
in `TripPlanner.tsx`.
**Depends on:** Epic 2, Epic 5 (reuses the same "re-run estimate" plumbing).

---

## Epic 7 — Insights Dashboard (Tabbed, Multi-Chart)

**As** someone evaluating this as a case-study demo,
**I want** to see the patterns the model actually learned from — not just one bar chart — grouped
so I can browse by topic,
**so that** the "AI & ML case study" deliverable visibly covers the EDA the case study asked for
(`docs/RTB-C16-AI-ML.md`: "busiest day," "busiest time," "which months are fares highest," "which
drop locations have the highest fares," "average ride distance").

### Story 7.1 — Tabbed section shell, no new dependency

- **Given** there is no tab primitive in `components/ui/`
- **When** the agent builds `components/InsightsSection/ChartTabs.tsx` as a small controlled
  component (`activeGroup` state + a row of buttons, `aria-selected` set correctly, matching the
  hand-rolled pattern `InputModeToggle.tsx` already established before Epic 4 removes it — reuse
  that visual style for consistency even though the toggle component itself is deleted)
- **Then** four groups exist — **Demand**, **Fares**, **Locations**, **Model & Data** — and switching
  tabs swaps which chart cards render below, without a page reload or losing map/form state (this
  section lives below the two-column layout from Epic 2, full-width, so switching tabs never
  disturbs the map)

### Story 7.2 — Demand charts (backed by real data, see Epic 8)

- **Given** `notebooks/train.ipynb` cell 5 already computes `df.day_of_week.value_counts()` and cell
  6 computes `df.hour.value_counts().sort_index()`
- **When** the agent builds two Recharts components — a `BarChart` for rides-by-day-of-week and an
  `AreaChart` for rides-by-hour — consuming JSON files generated per Epic 8 (not hand-typed numbers)
- **Then** both charts render with real ride-count data, directly answering the case study's
  "busiest day of week" / "busiest time of the day" questions

### Story 7.3 — Fares charts

- **Given** `notebooks/train.ipynb` cell 7 already computes `df.groupby('month').fare_amount.mean()`
- **When** the agent builds: average-fare-by-month (`BarChart`), a fare-distribution histogram
  (`BarChart` over binned ranges), and a fare-vs-distance `ScatterChart` with a fitted trend line
- **Then** the "which months are fares the highest" case-study question is directly answered, and
  the fare-vs-distance scatter gives the visual justification for why `distance_km` dominates
  `FEATURE_COLUMNS` (ties back to Story 7.5's feature-importance chart)

### Story 7.4 — Locations charts

- **Given** `notebooks/train.ipynb` cell 8 already computes top-10 drop-off buckets by rounding
  `dropoff_latitude`/`dropoff_longitude` to 2 decimals and grouping
- **When** the agent builds a horizontal bar chart of top drop-off buckets by ride count (relabeled
  with the nearest entry in `LANDMARK_COORDINATES`/a small named-zone lookup where the rounded
  coordinate falls within ~0.01° of a known landmark, falling back to raw coordinates otherwise —
  do not invent neighborhood boundaries not present in the data)
- **Then** the "which drop locations have the highest fares" case-study question has a real,
  data-backed answer instead of the placeholder city names used in the throwaway HTML mockup

### Story 7.5 — Model & Data charts

- **Given** `notebooks/train.ipynb` prints baseline/linear-regression/random-forest RMSE (cell 14),
  and `scripts/train_extreme.py` trains the production XGBoost model
- **When** the agent builds: a horizontal bar chart of validation RMSE by model (baseline → linear →
  random forest → XGBoost, lower-is-better, matching the Kaggle competition's own stated "$5–8 with
  distance alone" reference point as one of the bars if a distance-only baseline is computed — see
  Epic 8, Story 8.4), and a feature-importance chart if `train_extreme.py`'s fitted XGBoost model
  exposes `.feature_importances_` (it does, as a standard XGBoost/sklearn API — Epic 8 must extract
  and save it)
- **Then** the dashboard shows real model comparison numbers, not the illustrative RMSE progression
  used in the throwaway HTML mockup

### Story 7.6 — Empty/placeholder states for anything not yet computable

- **Given** some chart ideas from the mockup (pickup/drop-off density heat maps) need geospatial
  binning heavier than a JSON export can reasonably carry for a client-rendered chart
- **When** the agent adds a clearly labeled placeholder card ("Heat map — coming once
  `scripts/generate_chart_data.py` exports a binned density grid," dashed border, muted icon,
  matching the mockup's placeholder treatment) rather than fabricating fake density data
- **Then** the dashboard is honest about what's real vs. not-yet-built, consistent with this PRD's
  overall stance against inventing numbers

**Files touched:** new `src/components/InsightsSection/` (`InsightsSection.tsx`, `ChartTabs.tsx`,
one file per chart: `RidesByDayChart.tsx`, `RidesByHourChart.tsx`, `AvgFareByMonthChart.tsx`,
`FareDistributionChart.tsx`, `FareVsDistanceChart.tsx`, `TopDropoffsChart.tsx`,
`ModelRmseChart.tsx`, `FeatureImportanceChart.tsx`), replaces `FareChartSection`/`FareChart` (the
existing average-fare-by-hour chart becomes one card among many inside the Demand or Fares group —
keep its component, just relocate/re-skin it to match the new card style rather than deleting it).
`src/App.tsx` renders `<InsightsSection>` below `<TripPlanner>`.
**Depends on:** Epic 1 (palette for chart colors), Epic 8 (real data — do not build these charts
against placeholder numbers; block on Epic 8's JSON exports existing first).

---

## Epic 8 — Chart Data Generation Script

**As** the maintainer of this case study,
**I want** one script that reads `train.csv` (or a cached sample) and the fitted model, and emits
small JSON files the React app can `import`,
**so that** every chart in Epic 7 is backed by numbers that actually came out of the notebook's
analysis, not numbers a UI pass invented.

### Story 8.1 — New script location and shape

- **Given** `scripts/` already has `config.py`, `shared/data_utils.py`, `shared/features.py`, and
  three `train_*.py` entry points following a consistent style
- **When** the agent adds `scripts/generate_chart_data.py`, importing `DATA_PATH`, `TRAIN_DTYPES`
  from `scripts.config` and `process_chunk` from `scripts.shared.data_utils` (reusing the exact same
  cleaning/feature logic the training scripts already use, so chart numbers and model numbers are
  computed on the same cleaned data — not a second, divergent cleaning pass)
- **Then** running `python -m scripts.generate_chart_data` reads a configurable sample of `train.csv`
  (default: reuse `EXTREME_TRAIN_MAX_ROWS`'s sampling approach or a smaller dedicated
  `CHART_DATA_SAMPLE_ROWS` constant added to `config.py` — full 55M rows is unnecessary for
  aggregate charts, a multi-million-row sample is statistically sufficient and far faster), computes
  every aggregate Epic 7 needs, and writes one JSON file per chart into `client/src/data/`

### Story 8.2 — Aggregates to compute (mirrors `train.ipynb`'s existing cells exactly)

- **Given** cells 5–8 of `train.ipynb` already contain the pandas calls needed
- **When** the script ports each cell's logic into a named function returning a small JSON-
  serializable structure:
  - `rides_by_day_of_week()` → `[{day: "Mon", rides: N}, ...]` (from cell 5's `value_counts`)
  - `rides_by_hour()` → `[{hour: 0, rides: N}, ...]` (cell 6)
  - `avg_fare_by_month()` → `[{month: "Jan", avgFare: X}, ...]` (cell 7) — **replaces**
    `src/data/avgFareByHour.json`'s hand-typed numbers with the real ones on the same schema so
    `FareChart.tsx` needs zero code changes, only a regenerated data file
  - `top_dropoff_zones()` → top-N rounded-coordinate buckets with ride count and mean fare (cell 8)
  - `fare_distribution()` → histogram buckets over `fare_amount` (new, not in the notebook yet —
    simple `pd.cut` + `value_counts`, same pattern as the existing cells)
  - `fare_vs_distance_sample()` → a capped random sample (e.g. 500 points) of
    `{distance_km, fare_amount}` pairs for the scatter chart (must not ship the full dataset to the
    client — a bounded sample is required)
  - `city_average_fare()` → single number, `df.fare_amount.mean()` (feeds Epic 5, Story 5.2)
- **Then** every function's docstring names the exact pandas call it mirrors, so a future notebook
  change and this script don't silently drift apart

### Story 8.3 — Model comparison numbers

- **Given** `train.ipynb` already prints baseline/linear/random-forest RMSE, and `train_extreme.py`
  computes the production XGBoost RMSE and saves the fitted model + metadata via
  `METADATA_SAVE_PATH_EXTREME`
- **When** the agent adds `model_comparison()`, loading `trained-models/model_metadata_extreme.pkl`
  (via `joblib.load`, same pattern `server/app.py` already uses for the model file) for the XGBoost
  number, and re-deriving baseline/linear/random-forest RMSE the same way `train.ipynb` does (either
  by importing/calling shared logic if it's refactored out of the notebook, or by re-running the
  same three short `sklearn` calls directly in this script against the sampled data — duplicated
  math is acceptable here since it's ~10 lines and the notebook isn't imported as a module)
- **Then** `model_comparison.json` contains real RMSE for all four models, and
  `feature_importance.json` contains the XGBoost model's `.feature_importances_` paired with
  `FEATURE_COLUMNS` names, sorted descending

### Story 8.4 — Kaggle's own distance-only baseline

- **Given** the Kaggle competition page states a distance-only estimate lands at "$5–8 RMSE
  depending on the model used"
- **When** the agent adds a `distance_only_rmse()` function — a single-feature linear regression on
  `distance_km` alone against the same train/test split used elsewhere in the script
- **Then** `model_comparison.json` includes this as its own labeled entry ("Distance only"), giving
  Epic 7's model chart the same reference point the competition itself uses to define "good enough
  to be worth calling ML"

### Story 8.5 — Output contract and regeneration workflow

- **Given** the React app should never run Python at build time
- **When** the script writes finished JSON files directly into `client/src/data/` (adding
  `avg_fare_by_month.json`, `rides_by_day.json`, `rides_by_hour.json`, `top_dropoffs.json`,
  `fare_distribution.json`, `fare_vs_distance_sample.json`, `model_comparison.json`,
  `feature_importance.json`, `city_average_fare.json` alongside the existing
  `avgFareByHour.json` — rename the latter to match the new `snake_case` convention if the agent
  judges consistency worth the one-line import update in `FareChart.tsx`, otherwise leave it as-is
  and just match its established camelCase for that one file)
- **Then** regenerating charts is `python -m scripts.generate_chart_data` followed by a normal
  `npm run build` — no client-side data fetching, no runtime Python dependency, and a
  `docs/`-level one-line note added to this script's module docstring explaining that these files
  are checked-in generated artifacts, regenerated on demand, not computed live

**Files touched:** new `scripts/generate_chart_data.py`, new JSON files under `client/src/data/`,
one new constant in `scripts/config.py` (`CHART_DATA_SAMPLE_ROWS`).
**Depends on:** nothing (can be built in parallel with Epics 1–6). **Blocks:** Epic 7 (charts must
not be built against placeholder numbers — this is a hard sequencing requirement, not a suggestion).

---

## Epic 9 — Theme Toggle: System-Aware Tri-State (Enhancement)

**As** a person who already set a light/dark preference at the OS level,
**I want** the app to respect that by default, with an explicit override available,
**so that** the app behaves like the reference mockup's tri-state toggle rather than always defaulting
to whatever `ThemeProvider` last had in `localStorage`.

> **Priority note:** the app **already has** a working, persisted Light/Dark toggle
> (`ThemeToggle.tsx` + `ThemeProvider.tsx`) — the person's instruction "theme toggle button should be
> there" is already satisfied today. This epic is a genuine enhancement to match the reference
> mockup's specific System → Light → Dark cycle, not a fix for something broken. Sequence it after
> Epics 1–8 if time is constrained.

### Story 9.1 — Add a `system` state to `ThemeProvider`

- **Given** `ThemeProvider.tsx`'s `Theme` type is currently `'light' | 'dark'` only, defaulting once
  at init time from `prefers-color-scheme` but never re-checking it live
- **When** the agent widens the type to `'light' | 'dark' | 'system'`, stores the raw preference
  (including `'system'` itself) in `localStorage`, and adds a `matchMedia('(prefers-color-scheme:
dark)')` change listener that re-applies the resolved theme whenever the OS preference changes
  **while** `'system'` is the active preference
- **Then** choosing "System" makes the app track OS changes live (e.g. the OS auto-switching to dark
  at sunset), matching the reference mockup's behavior

### Story 9.2 — Update `ThemeToggle.tsx` to a three-state cycle

- **Given** the current button is a single icon that flips between two states
- **When** the agent changes it to cycle `system → light → dark → system` on each click, with a
  distinct icon per state (monitor/sun/moon, all already available in `lucide-react`) and an
  optional text label on wider viewports, matching the reference mockup's header control
- **Then** `aria-label` updates per state ("Switch to light mode" / "Switch to dark mode" / "Switch
  to system theme") so the control stays accessible through the cycle

**Files touched:** `src/context/ThemeProvider.tsx`, `src/components/ThemeToggle/ThemeToggle.tsx`.
**Depends on:** Epic 1 (final token names should be settled first, though this epic doesn't touch
tokens directly).

---

## 4. Non-Goals (Explicitly Out of Scope for This Pass)

- **Backend changes.** `server/app.py`/`server/services.py` are not modified. Epic 5's breakdown and
  Epic 3's distance tooltip are deliberately client-computed approximations for this reason — see
  each story's inline recommendation for the real fix, filed as future work, not done here.
- **True model confidence intervals.** The "likely range" in Epic 5 is a fixed illustrative
  percentage band, not a statistically derived prediction interval. Getting a real one requires a
  training-time change (quantile regression or bootstrapped residuals), out of scope for a client PRD.
- **Persisting recent estimates or theme preference server-side / across devices.** Both stay
  `localStorage`/in-memory only, consistent with this app having no auth/accounts.
- **Pickup/drop-off density heat maps.** Flagged as a placeholder card (Story 7.6) rather than
  built, since it needs a geospatial binning export heavier than this pass's JSON-file approach —
  candidate for a follow-up PRD once `generate_chart_data.py` exists and can be extended.
- **Expanding `/parse-trip` landmark coverage or improving the Ollama prompt.** The 31-entry
  `LANDMARK_COORDINATES` table and the existing prompt template are backend/data concerns; Epic 4
  only specifies the correct client-side _failure_ behavior when a description names something
  outside that coverage, not a fix to the coverage itself.

---

## 5. Definition of Done

- [ ] Epic 1 complete and visually verified in both themes before any other epic's components are
      built against the new tokens
- [ ] Epic 8's JSON files exist and are non-placeholder (spot-check a few numbers against the
      notebook's printed output) before Epic 7's charts are wired to them
- [ ] `InputModeToggle.tsx` and `NaturalLanguageInput.tsx` are deleted, not just unused
- [ ] `TripDetails.tsx` is deleted once its contents are fully absorbed into `TripPlanner.tsx` /
      `TripInputCard.tsx` / `FareResultCard.tsx` / `RecentEstimatesCard.tsx`
- [ ] `npm run build` and `npm run lint` (oxlint) both pass with zero errors
- [ ] Manual pass: place pickup pin → place drop-off pin → drag one pin → confirm fare re-estimates
      (Story 4.3) → clear pins (Story 3.3) → describe a trip in text → confirm auto-estimate
      (Story 4.2) → describe a trip naming a location outside `LANDMARK_COORDINATES` → confirm the
      graceful error path (Story 4.2's "but" clause), not a silent failure
- [ ] Manual pass: switch theme through all three states (Epic 9) and confirm the map tiles, chart
      colors, and pin colors all repaint correctly at each state
- [ ] Insights dashboard: all four tabs render, every chart either shows real Epic 8 data or an
      explicit "coming soon" placeholder — no chart silently shows fabricated numbers
