# PRD v3 — Match Visual Identity of "Bingo Bust — Board Control"

### For the AI coding agent — supersedes PRD v2's visual design system, keeps its bug fixes

**Scope note:** This document ports a SPECIFIC, already-designed visual system — extracted directly
from the attached `Bingo_Bust_-_Tracker.html` reference file's actual CSS — onto the existing taxi
fare React/Tailwind/shadcn app. This is not a vague "make it nicer" pass; every token, font, and
component pattern below was read out of that file's stylesheet, not guessed. Where anything here
conflicts with PRD v2 (Section 2's shadow-based surface hierarchy, Story 2.4/3.4's icon-mark header
treatment), **this document wins** — the reference file uses a flatter, border-driven, no-shadow,
no-icon-mark aesthetic, and matching it faithfully means dropping those earlier choices, not
layering on top of them. PRD v2 Section 1 (the 4 bug fixes) is unaffected and still required.

---

## 1. What Makes the Reference Look the Way It Does (read this before touching any code)

The reference is a dense, dark, "control-room dashboard" aesthetic, not a soft consumer-app
aesthetic. Four structural decisions create that feeling, and all four need to carry over:

1. **Two-font system with a clear division of labor:** _Space Grotesk_ for all UI text (headings,
   labels, buttons, body copy) and _IBM Plex Mono_ for every single piece of numeric/data output
   (scores, tiers, timestamps, counts, badges). This split is what makes the data feel like data —
   the eye instantly knows "this is a live number" versus "this is a label" without reading it.
2. **Hierarchy built from borders and color, not shadows.** The reference has effectively zero
   `box-shadow` usage. Instead, importance is signaled by: border style (solid vs. `dashed` for
   "empty/open" states), a colored **left border accent** (3–4px) keyed to meaning (team color,
   category color, accent color), and a solid colored **top banner strip** for the single most
   important state on a card (`.holder-banner`). This is the opposite of shadcn's default
   `shadow-sm`/`shadow-md` escalation, and needs to explicitly replace it.
3. **Everything is compact.** Padding is tight (10–14px, not shadcn's default 24px `p-6`), corner
   radius is small (6px flat, not 8px+), font sizes are modest (13–17px for most UI text, only the
   hero numbers go large). The whole thing reads as a tool, not a marketing page.
4. **Deliberate, minimal color use.** One accent (soft purple `#7c6fe0`) does almost all the
   "interactive/important" signaling, plus a small fixed palette of semantic colors (red/green/
   yellow/blue) used ONLY for category/team identity — never decoratively.

---

## 2. Design Tokens — Exact Values Extracted From the Reference

### 2.1 Replace `src/index.css`'s CSS variable blocks entirely

The current shadcn HSL-triplet tokens get replaced with the reference's actual hex values, used
directly (no `hsl()` wrapper needed — see Section 2.2 for the Tailwind config change this implies).

The reference file is dark-first and ships no light palette at all, so the light theme below is an
original extension — designed to match the dark theme's _personality_ (warm neutrals rather than
cold gray, same surface-lighter-than-background relationship, same accent hue family) rather than
a generic default. `:root` now holds the light palette (the default, no-class state); `.dark` holds
the reference's actual dark palette, applied when `ThemeToggle` adds the `dark` class to `<html>`.

```css
@layer base {
  :root {
    /* LIGHT THEME — an original extension of the reference, not from the source file.
       Design logic: warm off-white background (not clinical pure white) to match the dark
       theme's warm off-black; white cards sit lighter than the page background, mirroring how
       the dark theme's card (#1b1e26) sits lighter than its background (#12141a); primary/
       destructive/success are darkened versions of the dark theme's hues (same family, tuned
       for AA contrast against light surfaces — spot-check with a contrast checker before final
       ship, particularly the primary-on-white and success-on-white combinations). */
    --background: #f7f6f3;
    --foreground: #1b1e26;
    --card: #ffffff;
    --card-foreground: #1b1e26;
    --popover: #ffffff;
    --popover-foreground: #1b1e26;
    --primary: #6552d6;
    --primary-foreground: #ffffff;
    --secondary: #eeece6;
    --secondary-foreground: #1b1e26;
    --muted: #eeece6;
    --muted-foreground: #6b6f7a;
    --accent: #eeece6;
    --accent-foreground: #1b1e26;
    --destructive: #c8442f;
    --destructive-foreground: #ffffff;
    --success: #2f8f5b;
    --success-foreground: #ffffff;
    --border: #dcdad3;
    --input: #dcdad3;
    --ring: #6552d6;
    --radius: 0.375rem; /* 6px flat — shared with dark mode, matches reference's --radius exactly */
  }

  /* DARK THEME — extracted directly from Bingo_Bust_-_Tracker.html, unchanged from the source. */
  .dark {
    --background: #12141a;
    --foreground: #edebe3;
    --card: #1b1e26;
    --card-foreground: #edebe3;
    --popover: #1b1e26;
    --popover-foreground: #edebe3;
    --primary: #7c6fe0;
    --primary-foreground: #ffffff;
    --secondary: #232733;
    --secondary-foreground: #edebe3;
    --muted: #232733;
    --muted-foreground: #8d919c;
    --accent: #232733;
    --accent-foreground: #edebe3;
    --destructive: #e15b4e;
    --destructive-foreground: #ffffff;
    --success: #4fa97a;
    --success-foreground: #12141a;
    --border: #2e323d;
    --input: #2e323d;
    --ring: #7c6fe0;
  }
}
```

**Note for the agent:** because `:root` now carries real, distinct values from `.dark` (rather than
being a duplicate), double-check every place in the app that assumed "light mode looks the same as
dark mode" (there shouldn't be any, since components should only ever reference the CSS variables/
Tailwind tokens, never hardcoded hex values — but confirm nothing slipped through, e.g. the
`FareResult` banner's `bg-primary` and `text-primary-foreground` should automatically pick up the
new light-mode primary/foreground pair with no component code changes needed).

### 2.2 Update `tailwind.config.ts` — drop the `hsl(var(...))` wrapper, use raw hex vars, add fonts

```ts
import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Space Grotesk drives all UI text — this REPLACES the earlier Inter choice from PRD v1.
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        // IBM Plex Mono is now a first-class font family, used for every numeric/data value.
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        success: {
          DEFAULT: 'var(--success)',
          foreground: 'var(--success-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**Why drop `hsl()`:** the reference's palette is authored as flat hex, and forcing hex values through
an `hsl()`-wrapped custom property either requires converting every value to an HSL triplet (error-
prone, and shadcn's tooling doesn't care which format you use) or breaks. Referencing the hex
variable directly is simpler and exactly reproduces the source values with no conversion risk.

### 2.3 Update the font `<link>` in `index.html`

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

Remove the earlier Inter `<link>` entirely — Space Grotesk replaces it as the sole sans family.

### 2.4 Drop shadows app-wide

Do a project-wide check for any `shadow-sm`, `shadow-md`, or similar Tailwind shadow utility
introduced in PRD v2 (e.g. `FareResult`'s `shadow-md`) and remove them. The reference achieves
depth entirely through border color/weight, not elevation — reintroducing shadows anywhere breaks
the match.

---

## 3. Component-Level Mapping (reference pattern → taxi app equivalent)

This section is the actual design transfer — not just recoloring, but adopting the _same structural
patterns_ the reference uses for equivalent kinds of information.

### 3.1 Card hierarchy: left-border accent, not shadow escalation

Replace PRD v2's shadow-based Level 1/Level 2 distinction with the reference's actual method —
`.score-card`/`.leaderboard-list li` use a colored `border-left: 3–4px solid var(--team-color)`
against an otherwise plain 1px-bordered card:

- **`TripForm` card:** plain `border border-border rounded-lg` (like `.tier-list`/plain cards) — no
  left accent needed, since it's the default/neutral state before anything is known yet.
- **`FareResult` card:** `border border-border border-l-4 border-l-primary rounded-lg` once a
  result exists — directly mirrors `.score-card`'s `border-left: 3px solid var(--team-color)`
  pattern, using `primary` as "this is the important one" the same way the reference uses team
  color to mean "this row belongs to a specific team."
- **`FareChart` card:** plain `border border-border` — supporting/contextual information, same
  tier as `.tier-list` in the reference (informational, not actionable).
- **Empty-state placeholder card:** `border border-dashed border-border` — this is a direct, exact
  match to `.tile.unclaimed{ border-style: dashed; }`, which the reference uses specifically to
  mean "open/nothing here yet." Keep PRD v2 Story 3.3's dashed-border idea; it was already correct
  and happens to independently match the reference.

All cards: remove any `shadow-*` class, keep `rounded-lg` (now resolving to 6px via the new
`--radius`).

### 3.2 `FareResult` — banner treatment (replaces PRD v2's Story 3.2 entirely)

The reference's strongest "this is the answer, unmistakably" pattern is `.holder-banner` — a solid
colored strip with mono, uppercase-feeling text sitting above tinted content. Port that directly:

```tsx
import { Route } from 'lucide-react';

interface FareResultProps {
  fareAmount: number;
  distanceKm: number;
}

/**
 * FareResult - mirrors the reference's `.holder-banner` + tinted-body pattern: a solid
 * primary-colored banner strip labels the card unmistakably, then the hero number sits
 * in a tinted body below it. Distance is shown as a small mono badge, matching the
 * reference's `.your-tag` pill styling.
 */
export function FareResult({ fareAmount, distanceKm }: FareResultProps) {
  const formattedFare = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(fareAmount);

  return (
    <div className="overflow-hidden rounded-lg border border-border border-l-4 border-l-primary">
      {/* Solid banner strip — direct port of .holder-banner */}
      <div className="flex items-center justify-between bg-primary px-3 py-1.5">
        <span className="font-mono text-xs font-semibold uppercase tracking-wide text-primary-foreground">
          Predicted Fare
        </span>
      </div>
      {/* Tinted body — mirrors .tile.claimed .tile-body's tinted background */}
      <div className="space-y-3 bg-primary/10 p-4">
        <div className="font-mono text-5xl font-bold tracking-tight text-foreground">
          {formattedFare}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground">
          <Route className="h-3 w-3" />
          {distanceKm.toFixed(1)} km trip
        </span>
        <p className="text-sm text-muted-foreground">
          Estimate based on a machine learning model trained on historical NYC
          taxi data — actual fares may vary due to traffic, tolls, and
          surcharges.
        </p>
      </div>
    </div>
  );
}
```

Note the hero number uses `font-mono` — per Section 1's rule #1, this is a piece of live data, so it
takes the mono treatment, matching how `.lb-score`/`.score-row input` are always monospace in the
reference.

### 3.3 Passenger count: replace the `Select` dropdown with a stepper control

The reference never uses a dropdown for a numeric quantity — it uses `.score-row`'s `step-btn` +
mono numeric input pattern everywhere a number needs adjusting. Port that exact interaction for
passenger count instead of the current shadcn `Select`:

```tsx
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MIN_PASSENGERS, MAX_PASSENGERS } from '@/utils/validators';

interface PassengerStepperProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * PassengerStepper - direct port of the reference's `.score-row` + `.step-btn` pattern:
 * a bordered numeric field flanked by small increment/decrement buttons, value in mono font.
 */
export function PassengerStepper({
  value,
  onChange,
  disabled,
}: PassengerStepperProps) {
  function step(delta: number) {
    const next = value + delta;
    if (next >= MIN_PASSENGERS && next <= MAX_PASSENGERS) onChange(next);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-6 w-6 rounded"
        disabled={disabled || value <= MIN_PASSENGERS}
        onClick={() => step(-1)}
        aria-label="Decrease passenger count"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <input
        type="number"
        readOnly
        value={value}
        className="w-12 rounded border border-border bg-secondary py-1 text-center font-mono text-lg font-semibold text-foreground"
        aria-label="Passenger count"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-6 w-6 rounded"
        disabled={disabled || value >= MAX_PASSENGERS}
        onClick={() => step(1)}
        aria-label="Increase passenger count"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
```

Replace the `<Select>` block in `TripForm.tsx` with `<PassengerStepper value={values.passenger_count} onChange={(v) => handleChange('passenger_count', v)} disabled={disabled} />`. Remove the now-unused shadcn `Select` import from that file if nothing else in the form still needs it.

### 3.4 Merge `TripForm` + `NaturalLanguageInput` behind a view-toggle (mirrors `.view-toggle`/`.view-btn.active`)

The reference never stacks alternate ways of doing the same thing as two permanently-visible cards
— it uses a small toggle-button group (`Grid` / `List` / `Predictions`) to switch between views of
the same content, with the active button getting `background: var(--accent-soft); border-color:
var(--accent); color: var(--accent)`. Apply the identical pattern to the two trip-input methods,
since "manual coordinates" and "describe your trip" are two views of entering the same thing:

```tsx
type InputMode = 'manual' | 'describe';

function InputModeToggle({
  mode,
  onChange,
}: {
  mode: InputMode;
  onChange: (m: InputMode) => void;
}) {
  const baseClass =
    'rounded-md border px-3 py-1.5 font-mono text-xs font-medium transition-colors';
  const activeClass = 'border-primary bg-primary/15 text-primary';
  const inactiveClass =
    'border-border bg-transparent text-muted-foreground hover:border-primary';

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        className={`${baseClass} ${mode === 'manual' ? activeClass : inactiveClass}`}
        onClick={() => onChange('manual')}
      >
        Manual
      </button>
      <button
        type="button"
        className={`${baseClass} ${mode === 'describe' ? activeClass : inactiveClass}`}
        onClick={() => onChange('describe')}
      >
        Describe Trip
      </button>
    </div>
  );
}
```

Wrap this in the single `TripForm` card's `CardHeader` (next to the "Trip Details" title), and
conditionally render either the coordinate/date/passenger fields or the `NaturalLanguageInput`
textarea+button in the `CardContent` below it, based on `mode` state lifted into `App.tsx` (or kept
local to a new combined `TripInputCard` component — agent's choice, but keep it a single component
file rather than two permanently-stacked cards). This is a genuine structural echo of the
reference's view-switching pattern, not just a color change.

### 3.5 Buttons — match density and hover behavior exactly

The reference's `.btn:hover` only shifts `border-color` to the accent — it does NOT fill the
background the way shadcn's default `outline` variant hover (`hover:bg-accent`) does. Update
`src/components/ui/button.tsx`'s `outline` variant:

```ts
outline:
  "border border-input bg-background hover:border-primary hover:bg-background hover:text-foreground",
```

(replacing the default `"border border-input bg-background hover:bg-accent hover:text-accent-foreground"`).

Also add a denser size to match `.btn.small` (`padding: 4px 10px; font-size: 14px`):

```ts
size: {
  default: "h-10 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-sm", // slightly tightened from shadcn's stock h-9
  lg: "h-11 rounded-md px-8",
  icon: "h-10 w-10",
},
```

### 3.6 Badges — soft-tint pill, mono font (matches `.your-tag`)

Wherever a small pill/tag renders (the distance badge in `FareResult`, above), use:

```
inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 font-mono text-[10.5px] text-primary
```

This exactly reproduces `.your-tag`'s `background: var(--accent-soft); color: var(--accent); font-family: mono; border-radius: 8px`-style treatment (using Tailwind's `/15` opacity modifier in place of the separate `--accent-soft` variable — no new CSS variable needed).

### 3.7 Header — simplify to match the reference exactly (replaces PRD v2 Story 2.4/3.4)

The reference's header is deliberately plain: `<h1>` + one-line description on the left, controls
on the right, a single `border-bottom`, no card background, no icon mark, no sticky positioning, no
backdrop blur. Revert PRD v2's icon-square/sticky header treatment and use this instead:

```tsx
<header className="mx-auto max-w-6xl border-b border-border px-5 py-5">
  <div className="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-[33px] font-semibold tracking-tight">
        NYC Taxi Fare Predictor
      </h1>
      <p className="mt-1 max-w-[46ch] text-[16.5px] text-muted-foreground">
        ML-powered fare estimates from historical NYC taxi trip data.
      </p>
    </div>
    <ThemeToggle />
  </div>
</header>
```

**Acceptance criteria:** header has no icon, no card surface, no shadow, no sticky/blur behavior —
just the bottom border and two-column flex layout, matching the reference's `header.top` exactly.

### 3.8 Section labels — small, muted, uppercase-free (matches `section.leaderboard h2` / `.list-group h2`)

Any small section heading that isn't a `CardTitle` (e.g., a "Trip Details" label if not using
shadcn's `CardTitle` styling) should follow: `text-[15.5px] font-medium text-muted-foreground` — the
reference never uppercases or bolds these; it relies on muted color + modest weight only.

---

## 4. Explicit Non-Matches (things NOT to port, to avoid overfitting the reference)

- **Team colors / category colors:** the reference's red/green/yellow/blue team system and
  kill/loot/submit/vault/interact category system have no equivalent in the taxi app — do not
  invent fake categories just to use these colors. `primary`, `muted-foreground`, `destructive`,
  and `success` are the only semantic colors this app needs.
  - `success` from PRD v2 is retained but now aliased to the reference's `--team-green` (`#4fa97a`)
    value for palette consistency — no separate NYC-specific number needed.
- **The double-click "confirming" delete pattern** (`.btn.confirming`, `armConfirmButton`) is a nice
  reference pattern but this app currently has no destructive action that needs it (no reset/delete
  button exists in the taxi app's scope). Do not add one purely to reuse the pattern — only apply it
  if/when a genuine destructive action (e.g., a future "clear form" button) is added.
- **The slide-out `.panel` (right-side detail drawer)** and its `overlay` — the taxi app has no
  concept of "select an item to see its detail panel," so this pattern has nothing to attach to.
  Skip it entirely.
- **Light mode:** the reference has no light palette of its own — Section 2.1's light theme is an
  original, deliberately-matched extension (see the design rationale there), not extracted from the
  source file. Treat it as final, not a placeholder to redesign.

---

## 5. Revised Definition of Done (this pass)

- [ ] All CSS variables in `index.css` replaced per Section 2.1 — `:root` holds the new original
      light theme, `.dark` holds the reference's exact dark palette (these are now distinct, not
      duplicates)
- [ ] Theme toggle checked visually in BOTH modes — every component (banner, badges, buttons,
      stepper, dashed empty-state border) reads correctly and with adequate contrast in light mode,
      not just dark mode
- [ ] `tailwind.config.ts` updated to reference raw `var(--x)` (no `hsl()` wrapper) and both
      `fontFamily.sans` (Space Grotesk) and `fontFamily.mono` (IBM Plex Mono) are set
- [ ] `index.html` font link updated; Inter removed
- [ ] Every numeric/data value in the app (fare amount, distance badge, passenger stepper, any
      coordinate/date field value display) uses `font-mono`
- [ ] No `shadow-*` utility remains anywhere in the app
- [ ] `FareResult` uses the banner + tinted-body pattern from Section 3.2, not the earlier
      border-t-2 treatment from PRD v2
- [ ] Passenger count uses the stepper control from Section 3.3, not a `Select` dropdown
- [ ] `TripForm` and `NaturalLanguageInput` are merged behind the view-toggle from Section 3.4
- [ ] Button `outline` variant hover only changes border color, not background (Section 3.5)
- [ ] Header matches Section 3.7 exactly — no icon mark, no card surface, no sticky/blur
- [ ] `npm run build` succeeds with zero errors after all of the above
