# PRD v5 — Post-Implementation Review: Issues Found and Fix Plan

### Reviews the client + server as implemented against PRD v4. For the AI coding agent and human reviewers

**Scope:** `client/`, `server/`, `scripts/` where model-path constants are involved.
**Method:** cloned the repo at its current state, ran `npm install && npm run build` and `npx oxlint`
in `client/`, read through every component PRD v4 called for, checked every model file path
`server/app.py` and `scripts/generate_chart_data.py` reference against what's actually committed in
`trained-models/` (`os.path.exists()`, and `joblib.load()` + `type()`/`n_features_in_` on each `.pkl`
present, to identify what each file actually is). Every issue below is something directly observed,
not inferred — file paths and line-level evidence are given so each can be verified independently.

**Headline finding:** PRD v4 was implemented thoroughly and well — every epic (theme tokens, map-hero
layout, unified input card, fare result panel, recent estimates, tabbed insights dashboard, tri-state
theme toggle) is present, and `npm run build`/`npx oxlint` both pass with zero errors. This document is
about what's left, not a report that the prior work was done poorly.

---

## Priority key

- **P0 — Blocking.** The application cannot run in its current state.
- **P1 — High.** Runs, but is visibly wrong or meaningfully inaccessible to some users.
- **P2 — Medium.** A real inconsistency or missed best-practice, not visible-breakage.
- **P3 — Low.** Polish.

---

## P0 — Blocking

### Issue 1: `server/app.py` cannot start — the model file it loads doesn't exist

**Evidence:**

```python
# scripts/config.py
MODEL_SAVE_PATH_EXTREME = "./trained-models/fare_model_extreme.pkl"
METADATA_SAVE_PATH_EXTREME = "./trained-models/model_metadata_extreme.pkl"
```

```python
# server/app.py, module level — runs at import time, before any request is handled
model = joblib.load(MODEL_SAVE_PATH_EXTREME)
```

Checking `trained-models/` directly:

| File `config.py` expects                                  | Exists? |
| --------------------------------------------------------- | ------- |
| `fare_model_standard.pkl` / `model_metadata_standard.pkl` | ✗ / ✗   |
| `fare_model_full.pkl` / `model_metadata_full.pkl`         | ✓ / ✗   |
| `fare_model_extreme.pkl` / `model_metadata_extreme.pkl`   | ✗ / ✗   |

What's actually sitting in `trained-models/` instead: `fare_model.pkl` (a 5-feature
`RandomForestRegressor` — matches neither the 26-feature production feature set nor any config path;
most likely a leftover artifact from an exploratory comparison run), `fare_model_all_records.pkl`
(a 26-feature `XGBRegressor` — matches no config constant by name at all), `fare_model_full.pkl`
(a 26-feature `XGBRegressor` — matches `MODEL_SAVE_PATH_INCREMENTAL` exactly), and `model_metadata.pkl`
(`{'model_type': 'xgboost_gpu_incremental', 'rmse': 3.5506...}` — the `model_type` string matches
`train_incremental.py`'s literal metadata dict, but the filename doesn't match
`METADATA_SAVE_PATH_INCREMENTAL`'s expected `model_metadata_full.pkl`).

**Conclusion:** `train_extreme.py` was written, but its output was never generated and committed (or
was generated somewhere and never committed) — the config constants pointing at `*_extreme.pkl`
describe files that don't exist anywhere in this repo. Separately, `train_incremental.py`'s real
output exists but under a filename (`model_metadata.pkl`) that doesn't match what its own
`METADATA_SAVE_PATH_INCREMENTAL` constant says it should be — a plausible sign the three-tier naming
convention in `config.py` was introduced _after_ that training run already happened, and the file was
never renamed to match.

**Same root cause breaks `scripts/generate_chart_data.py` too** — `model_comparison()` and
`feature_importance()` both call `joblib.load(METADATA_SAVE_PATH_EXTREME)` /
`joblib.load(MODEL_SAVE_PATH_EXTREME)` directly.

**Impact:** `python server/app.py` raises `FileNotFoundError` before the Flask app finishes
initializing — **the server cannot serve a single request.** `python -m scripts.generate_chart_data`
fails the same way partway through (after writing the aggregate charts, when it reaches
`model_comparison()`).

### Story 1.1 — Pick one resolution path, apply it consistently, verify by running both scripts

Two valid fixes; pick based on which better reflects what you actually want to claim about the served
model's provenance — don't do both:

- **Option A — Retrain for real.** Run `python scripts/train_extreme.py` against `train.csv` to
  completion, so `fare_model_extreme.pkl`/`model_metadata_extreme.pkl` are genuinely produced and can
  be committed. Cleanest option if you want the served model to actually be the log-target, GPU,
  early-stopped model `train_extreme.py`'s docstring describes ("targeting RMSE below 3.0").
- **Option B — Repoint the config at what already exists.** If `fare_model_full.pkl` +
  `model_metadata.pkl` (the `train_incremental.py` output) is meant to be the production model, change
  `MODEL_SAVE_PATH_EXTREME`/`METADATA_SAVE_PATH_EXTREME` in `scripts/config.py` to point at those exact
  filenames (or rename the files on disk to match the existing `_extreme` constants — either direction
  works, but do it explicitly and intentionally, not by coincidence).

**Given** either option is applied
**When** `python server/app.py` is run
**Then** it starts without a traceback, and `curl -X POST localhost:5000/predict -H 'Content-Type:
application/json' -d '{"pickup_lat":40.758,"pickup_lon":-73.9855,"dropoff_lat":40.6413,
"dropoff_lon":-73.7781,"hour":18,"day_of_week_num":4,"month":9,"year":2026,"passenger_count":2}'`
returns a `{"fare_amount": ..., "distance_km": ...}` body, not an error

**And** `python -m scripts.generate_chart_data` completes without a traceback and every file listed
in its `main()` (`rides_by_day.json` through `feature_importance.json`) is written

**And** the two orphaned files that match neither the chosen option nor any config constant
(`fare_model.pkl`, and whichever of `fare_model_all_records.pkl`/`fare_model_full.pkl` wasn't chosen)
are either deleted or clearly documented in a `trained-models/README.md` as intentionally-kept
historical artifacts — see Epic 5 below.

**Files touched:** `scripts/config.py` (Option B) or a training run producing two new `.pkl` files
(Option A), no application code changes either way.

---

## P1 — High priority

### Issue 2: the "dark" map theme loads a light basemap style

**Evidence**, `client/src/components/TripMap/TripMap.tsx`:

```js
const tileUrl =
  theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=...'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
```

CARTO's **Voyager** style is one of CARTO's light, colorful basemaps — not a dark one. (CARTO's actual
dark style is served from a `dark_all`/`dark_matter` path, not `rastertiles/voyager`.) The practical
effect: switching the app to dark theme currently makes the _rest of the UI_ go dark while the map
itself stays bright and light-colored — the opposite of what a theme toggle should do, and visually
jarring at exactly the moment it's meant to demonstrate theme-awareness.

### Story 2.1 — Use an actual dark tile style for dark theme

- **Given** `theme === 'dark'`
- **When** `TripMap` selects a tile URL
- **Then** it uses a genuinely dark basemap (e.g. CARTO's dark style path, or another provider's dark
  tile set) — verify by visual inspection in dark mode, not just by the code compiling
- **And** the light-theme path (`tile.openstreetmap.org`) is left as-is, or reconsidered per the note
  in Story 2.2

### Issue 3: a live-looking API key is committed to the repo in plaintext

**Evidence**, same file, same line: `...?key=cb1_40hw_1_a2904f9235369bdd56f8c34e`. Regardless of the
specific tile provider's exposure policy for this class of key, committing any API key directly into
client-side source that ends up in a public GitHub repo is a hygiene problem — it's now visible to
anyone who reads the repository or its git history, indefinitely, even if the line is later removed
(git history retains it unless the history itself is rewritten).

### Story 2.2 — Move the key out of source, or drop it if unneeded

- **Given** the CARTO tile URL includes a `key` query parameter
- **When** the agent checks whether CARTO's basemap tiles actually require this key for the request
  volume this project needs (many raster basemap providers, including CARTO's basic styles, don't
  require a key for light usage — this should be verified against current CARTO documentation, not
  assumed)
- **Then** either the parameter is removed entirely (if unneeded), or it's sourced from a Vite
  environment variable (`import.meta.env.VITE_CARTO_KEY`, gitignored `.env`) instead of being
  hardcoded — and the exposed key above is treated as compromised (rotated/revoked) rather than reused
  once moved

### Issue 4: the map's floating pickup/dropoff buttons don't visually match the pins they control

**Evidence:** `TripMap.tsx`'s `switchButtonClass()` hardcodes Tailwind's `green-600` (`#16a34a`) for
the pickup button and `red-600` (`#dc2626`) for the dropoff button. The pins those buttons control
(`Mapicons.ts`) are colored from the app's actual design tokens: `var(--pickup)` = `#0e9f6e` and
`var(--dropoff)` = `#e1355e` (index.css). `#dc2626` (a pure red) and `#e1355e` (a rose/magenta-red) are
visibly different hues sitting on the same map — a person can reasonably not realize the red button
and the pink-red pin refer to the same "dropoff" concept.

### Story 2.3 — Drive the switch buttons from the same tokens as the pins

- **Given** `switchButtonClass()` hardcodes `green-600`/`red-600` rather than referencing
  `--pickup`/`--dropoff`
- **When** the agent replaces the hardcoded Tailwind color classes with the CSS custom properties
  already used for the pin icons (either via inline `style` using `var(--pickup)`/`var(--dropoff)`, or
  by adding `pickup`/`dropoff` as proper Tailwind color tokens in `tailwind.config.ts` the way
  PRD v4 §3.2 originally specified, if that step was skipped during implementation — check
  `tailwind.config.ts` first, since `index.css` already defines the custom properties either way)
- **Then** the floating switch buttons and the map pins use the exact same color for "pickup" and the
  exact same color for "dropoff," in both light and dark theme

### Issue 5: no keyboard- or screen-reader-accessible way to set a pickup/drop-off location

**Evidence:** `TripInputCard.tsx`'s `LocationRow` is read-only — it displays the reverse-geocoded
address and the coordinates as text, with a button that only toggles _which_ pin is "active" for the
next map click. There is no numeric input anywhere in the form for latitude/longitude, and no text
search field for an address. The only way to actually set a coordinate is clicking or dragging a
marker on the Leaflet map (`TripMap.tsx`'s `MapClickHandler`/marker `dragend`), which has no keyboard
equivalent, and no path for a screen-reader user at all. The 8 landmark quick-jump chips
(`QUICK_JUMP_LANDMARKS` in `TripInputCard.tsx`) are keyboard-operable and partially mitigate this, but
only cover 8 fixed locations — nowhere close to a general input method.

**Note:** this is a regression this project's own PRD v4 introduced (Epic 4 explicitly replaced the
old manual lat/lon number inputs with map-only interaction) without specifying an accessible
fallback — worth being upfront about if asked, rather than treating it as something that "just
happened."

### Story 2.4 — Add an accessible manual-entry fallback

- **Given** the map is the only way to set a location
- **When** the agent adds a collapsed-by-default "Enter coordinates manually" disclosure inside each
  `LocationRow` (a `<button aria-expanded>` toggling two `<Input type="number">` fields for lat/lon,
  reusing the exact validation already in `utils/validators.ts`), or alternatively a text address
  field that geocodes _forward_ (address → coordinates) using the same Nominatim endpoint
  `utils/geocoding.ts` already calls in reverse
- **Then** a keyboard-only or screen-reader user can complete an entire trip estimate without ever
  interacting with the Leaflet map directly
- **And** the floating "Set Pickup"/"Set Dropoff" buttons in `TripMap.tsx` gain `aria-pressed={activePin
=== 'pickup' | 'dropoff'}` — note `LocationRow`'s own button already correctly sets `aria-pressed`
  (line ~128 of `TripInputCard.tsx`); this fix is about the map's buttons having the same treatment,
  since right now the two controls that both represent "which pin is active" are accessibility-
  inconsistent with each other

**Files touched:** `client/src/components/TripMap/TripMap.tsx`, `client/src/index.css`,
`client/tailwind.config.ts`, `client/src/components/TripInputCard/TripInputCard.tsx`.

---

## P2 — Medium priority

### Issue 6: a single ~900KB JS bundle, no code-splitting

**Evidence**, from `npm run build` output:

```
dist/assets/index-gcxJvWWf.js   896.62 kB │ gzip: 260.78 kB
(!) Some chunks are larger than 500 kB after minification.
```

Leaflet, Recharts, and every chart's JSON data (`fare_vs_distance_sample.json` alone is 32KB) all load
eagerly on first paint, even though the Insights dashboard is below the fold and not needed until the
person scrolls to it.

### Story 3.1 — Lazy-load the Insights dashboard

- **Given** `App.tsx` imports `InsightsSection` eagerly
- **When** the agent wraps it in `React.lazy()` + `<Suspense>` (a simple skeleton/spinner fallback,
  reusing `components/ui/skeleton.tsx`)
- **Then** the initial bundle needed to show the map and trip form shrinks, and the insights
  dashboard's code + chart JSON load only once the person actually reaches that section
- **Note:** this is a genuine improvement but not urgent for a case-study demo running locally —
  correctly triaged as P2, not P0/P1, since bundle size doesn't affect correctness or a local-network
  demo's perceived speed much. Worth doing before any real deployment.

### Issue 7: the map's floating controls are crowded into one corner

**Evidence:** the pickup/dropoff switch (`top-3 right-3`) and the "Clear pins" button
(`top-[4rem] right-3`) both float in the map's top-right corner, stacked vertically. On the mobile
layout (`h-[420px]` map), this is three rows of floating UI competing for a comparatively short map
height, plus Leaflet's own default zoom control.

### Story 3.2 — Separate the two control groups

- **Given** both floating control groups currently occupy the same corner
- **When** the agent moves the pickup/dropoff switch to `top-3 left-3` (as PRD v4 Story 3.1
  originally specified) and leaves "Clear pins" at `top-3 right-3`
- **Then** the two independent actions (which pin am I placing vs. clear everything) are visually and
  spatially separated, reducing the vertical stack on short/mobile map heights

### Issue 8: two orphaned model files with no clear purpose

**Evidence:** `fare_model.pkl` (5-feature RandomForest) and whichever of `fare_model_all_records.pkl`
/ `fare_model_full.pkl` isn't chosen as canonical in Issue 1's fix don't correspond to any active
config path. Anyone opening `trained-models/` later has no way to know if these are safe to delete,
needed by something not yet checked, or leftover mistakes.

### Story 3.3 — Document or remove orphaned artifacts

- **Given** `trained-models/` contains files with no corresponding `scripts/config.py` constant
- **When** the agent either deletes them (if genuinely unused) or adds a short
  `trained-models/README.md` explaining what each committed `.pkl` file is, which config constant (if
  any) points to it, and which one is the actual production model the server loads
- **Then** the directory is self-explanatory to the next person who opens it, including a future
  version of whoever is reading this PRD

**Files touched:** `client/src/App.tsx`, `client/src/components/TripMap/TripMap.tsx`, new
`trained-models/README.md` (or file deletions, agent's judgment per Story 3.3).

---

## P3 — Low priority / polish

### Issue 9: the app header dropped two things the reference mockup had

`App.tsx`'s header is not sticky and has no icon/brand mark — PRD v4's reference design had both
(a small icon in a colored square next to the title, header pinned on scroll). Purely cosmetic; the
current header is clean and functional as-is. Optional: add `sticky top-0 z-10 bg-background/80
backdrop-blur` to the `<header>` and a small `lucide-react` icon (e.g. `Car` or `MapPin`) next to the
title, matching the treatment `TripMap`'s own floating panels already use for the blur effect.

### Issue 10: `tile.openstreetmap.org` is being used directly for the light-theme basemap

OpenStreetMap's own standard tile server carries a
[usage policy](https://operations.osmfoundation.org/policies/tiles/) that disallows heavy/production
traffic against it directly — fine for a local case-study demo, worth a one-line mention in the
README (already added — see the main README's Known Issues section) rather than a code change for
this project's purposes. If this project were ever deployed publicly, switching both light and dark
tiles to a provider intended for that (e.g. a properly-keyed CARTO or Mapbox plan) would be the
correct fix, subsuming Issue 2/3 above.

---

## Summary table

| #   | Priority | Issue                                                      | Fix effort                      |
| --- | -------- | ---------------------------------------------------------- | ------------------------------- |
| 1   | P0       | Server/chart-script can't start — model file path mismatch | Config change or a training run |
| 2   | P1       | Dark theme uses a light (Voyager) map style                | One tile URL                    |
| 3   | P1       | Hardcoded API key committed to source                      | Env var or removal              |
| 4   | P1       | Switch-button colors don't match pin colors                | Token reference swap            |
| 5   | P1       | No accessible non-map way to set a location                | New disclosure UI, ~1 component |
| 6   | P2       | 896KB single JS bundle, no code-splitting                  | `React.lazy` on one section     |
| 7   | P2       | Map's floating controls crowded into one corner            | Move one control group          |
| 8   | P2       | Orphaned, undocumented model files                         | README or deletion              |
| 9   | P3       | Header not sticky, no icon                                 | Cosmetic, optional              |
| 10  | P3       | Direct use of OSM's rate-limited tile endpoint             | Documented, not code-fixed here |

**Recommended order:** fix #1 before anything else — nothing else in this document can be verified
against a running server until the server can start. #2–#5 are independent of each other and of #1,
and can be done in any order or in parallel. #6–#8 are cleanup, best done last so they don't get
re-disturbed by the fixes above them.
