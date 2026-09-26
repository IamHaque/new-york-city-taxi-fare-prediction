# PRD: NYC Taxi Fare Prediction — Frontend Application

### For consumption by an AI coding agent (Cursor / Claude / Gemini code-assist) — Epic/Story format

**Purpose of this document:** This PRD is written to be handed directly to a code-generation agent to scaffold a complete, working React + Vite + TypeScript frontend for the NYC Taxi Fare Prediction case study. It intentionally over-specifies tech stack, structure, and standards so the agent has minimal room for divergent assumptions. A human (React/Angular-experienced, ML-beginner) will review and adjust the agent's output, not write it from scratch.

**Backend contract (already built separately, do not regenerate):** A Flask REST API running at `http://localhost:5000` (both machines are Windows — see plan document for `venv` setup) exposes:

- `POST /predict` — body: `{ pickup_lat, pickup_lon, dropoff_lat, dropoff_lon, hour, day_of_week_num, month, passenger_count }` → response: `{ fare_amount, distance_km }`
- `POST /parse-trip` (optional/stretch) — body: `{ description: string }` → response: structured trip JSON (see Epic 5)

---

## 1. Tech Stack (mandatory — do not substitute without flagging why)

| Layer              | Choice                                                                                                                      | Reasoning                                                                                                                                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build tool         | **Vite** (`npm create vite@latest`)                                                                                         | Fast dev server, minimal config, explicitly requested                                                                                                                                                                                                            |
| Framework          | **React 18** (functional components + Hooks only)                                                                           | Matches developer's existing React experience; no class components anywhere                                                                                                                                                                                      |
| Language           | **TypeScript** (strict mode enabled)                                                                                        | Catches integration bugs (mismatched API field names/types between form and Flask contract) at compile time rather than at demo time — a meaningful safety net given the tight timeline                                                                          |
| Styling            | **Tailwind CSS** (utility classes, `tailwind.config.ts`)                                                                    | Minimizes hand-written CSS, keeps styling co-located with markup, fast to iterate on                                                                                                                                                                             |
| Component library  | **shadcn/ui**                                                                                                               | Accessible, unstyled-by-default component primitives (Button, Input, Select, Card, Dialog, etc.) built on Radix UI, styled via Tailwind — gives a modern, polished look without hand-building basic components or pulling in a heavy pre-styled library like MUI |
| Theming            | **shadcn/ui theme tokens + `next-themes`-style toggle (via a lightweight custom provider, since this is Vite not Next.js)** | Provides an instant light/dark/toggle experience using CSS variables, no manual re-theming of every component                                                                                                                                                    |
| HTTP client        | **native `fetch`**, typed via TypeScript interfaces — no axios                                                              | Avoids an extra dependency for a small, well-defined API surface                                                                                                                                                                                                 |
| Charting           | **Recharts** (`npm install recharts`)                                                                                       | Declarative, React-idiomatic, integrates cleanly with Tailwind-based layouts, handles the "show graphs/charts" requirement with minimal boilerplate                                                                                                              |
| State management   | **React `useState`/`useReducer` only** — no Redux, no Zustand                                                               | App state is small (one form + one result + one chart dataset + current theme); a state library is unjustified overhead                                                                                                                                          |
| Routing            | **None** — single-page app, no `react-router`                                                                               | The entire case study fits on one screen; adding routing is unnecessary complexity                                                                                                                                                                               |
| Linting/formatting | **ESLint (Vite's React+TS template default) + Prettier** (with `prettier-plugin-tailwindcss` for automatic class sorting)   | Baseline code hygiene, keeps Tailwind class lists consistently ordered and readable                                                                                                                                                                              |
| Package manager    | **npm** (not yarn/pnpm)                                                                                                     | Matches the most common default, avoids lockfile ambiguity                                                                                                                                                                                                       |

**Explicitly forbidden:** No CSS Modules, no styled-components, no other component libraries alongside shadcn/ui (no MUI, Ant Design, Chakra) — shadcn/ui + Tailwind is the single, complete styling system for this app.

---

## 2. Project Initialization Sequence (agent should run these exact commands, in order)

```bash
# 1. Scaffold Vite + React + TypeScript
npm create vite@latest taxi-fare-ui -- --template react-ts
cd taxi-fare-ui
npm install

# 2. Install and configure Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 3. Install shadcn/ui CLI and initialize it (this sets up components.json, CSS variables, utils)
npx shadcn@latest init

# 4. Add the specific shadcn components this app needs (agent adds more only if a story explicitly requires it)
npx shadcn@latest add button input label select card badge separator switch skeleton alert

# 5. Charting library
npm install recharts

# 6. Icons (shadcn's recommended companion icon set)
npm install lucide-react
```

**Note on shadcn/ui philosophy for the agent:** shadcn/ui is NOT an installed npm dependency in the traditional sense — the CLI copies component source code directly into `src/components/ui/`, meaning those files are owned and editable by this project, not hidden inside `node_modules`. The agent should treat everything under `src/components/ui/` as generated scaffolding it can adjust (e.g., tweaking a `Button` variant), while everything under `src/components/` (outside the `ui` subfolder) is this app's own hand/agent-written feature code.

---

## 3. File/Folder Structure (agent must generate exactly this shape)

```
taxi-fare-ui/
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx                       # React root render entrypoint
│   ├── App.tsx                        # top-level layout, composes the major sections
│   ├── index.css                      # Tailwind directives + shadcn CSS variables (light/dark/theme tokens)
│   ├── vite-env.d.ts
│   ├── types/
│   │   └── trip.ts                    # ALL shared TypeScript interfaces/types live here
│   ├── api/
│   │   └── fareApi.ts                 # ALL fetch() calls to the Flask backend live here, nowhere else
│   ├── components/
│   │   ├── ui/                        # shadcn/ui-generated primitives (button.tsx, input.tsx, card.tsx, etc.) — do not hand-roll duplicates
│   │   ├── TripForm/
│   │   │   └── TripForm.tsx
│   │   ├── NaturalLanguageInput/       # Epic 5 (optional/stretch) — Ollama-backed free text box
│   │   │   └── NaturalLanguageInput.tsx
│   │   ├── FareResult/
│   │   │   └── FareResult.tsx
│   │   ├── FareChart/
│   │   │   └── FareChart.tsx
│   │   ├── ThemeToggle/
│   │   │   └── ThemeToggle.tsx
│   │   └── shared/
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBanner.tsx
│   ├── context/
│   │   └── ThemeProvider.tsx           # React context providing current theme + setter, persists choice
│   ├── data/
│   │   └── avgFareByHour.json          # static precomputed chart data exported from the Jupyter notebook
│   ├── hooks/
│   │   └── useFarePrediction.ts        # custom hook wrapping the /predict call + loading/error state
│   └── utils/
│       └── validators.ts               # input validation (lat/long bounds, passenger count range, etc.)
├── .eslintrc.cjs
├── .prettierrc
├── components.json                     # shadcn/ui config (generated by `shadcn init`)
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

**Rule for the agent:** feature components live in their own folder named after the component; each folder's single `.tsx` file is the component itself, styled entirely with Tailwind utility classes in the JSX (no co-located CSS file needed anymore, since Tailwind replaces that role). `src/components/ui/` is reserved exclusively for shadcn-generated primitives.

---

## 4. Theming Requirements (Modern, Polished, Toggleable)

### 4.1 Theme Behavior

- The app must support at least **two selectable themes**: **Light** and **Dark**, toggled via a visible control in the header (a `Switch` or icon-button from shadcn/ui, using `lucide-react`'s `Sun`/`Moon` icons).
- Theme choice must persist across page reloads using `localStorage` (key: `taxi-fare-ui-theme`), read once on initial app load inside `ThemeProvider`.
- Default theme (if no stored preference exists) should respect the user's OS-level preference via `window.matchMedia('(prefers-color-scheme: dark)')`.
- Theme switching applies by toggling a `class="dark"` on the `<html>` root element — the standard mechanism Tailwind's `darkMode: 'class'` strategy and shadcn/ui's CSS variables both expect.

### 4.2 `ThemeProvider` implementation contract

```tsx
// src/context/ThemeProvider.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = 'taxi-fare-ui-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function setTheme(next: Theme) {
    setThemeState(next);
  }

  function toggleTheme() {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Access the current theme and its setters. Must be called from within a ThemeProvider.
 * @throws if used outside ThemeProvider — fails loudly rather than silently defaulting,
 * so a missing provider is caught immediately during development.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
```

`main.tsx` must wrap `<App />` in `<ThemeProvider>` at the top level so every component can call `useTheme()`.

### 4.3 Visual Design Direction ("modern and nice" — concrete, not vague)

The agent should apply a cohesive, modern aesthetic rather than shadcn/ui's bare defaults:

- **Palette:** use a single accent color consistently (recommend an indigo/blue accent, e.g., Tailwind's `indigo-600` for light mode primary actions, `indigo-400` for dark mode), applied to the primary button, active form focus rings, and chart bars — not a rainbow of unrelated colors.
- **Typography:** import a clean sans-serif via Google Fonts in `index.html` (recommend **Inter** — pairs well with shadcn/ui's default design language) and set it as the Tailwind `fontFamily.sans` override in `tailwind.config.ts`.
- **Corners & elevation:** shadcn/ui's default `Card` rounding (`rounded-lg`) and subtle shadow (`shadow-sm`) should be kept as-is — consistent, not overridden per-component, so the whole app reads as one coherent design system rather than a patchwork.
- **Spacing rhythm:** consistent vertical spacing between major sections (`space-y-6` or `gap-6` at the page level) rather than ad hoc margins per component.
- **Dark mode must not be an afterthought:** every custom color used (if any raw Tailwind color is used outside shadcn's CSS-variable-driven components) must have an explicit `dark:` variant, so no element goes invisible or low-contrast when the theme is toggled. Prefer shadcn's semantic tokens (`bg-background`, `text-foreground`, `bg-card`, `border-border`, etc.) over raw Tailwind grays wherever possible, since those tokens already flip correctly between themes automatically.

### 4.4 `ThemeToggle` component

```tsx
// src/components/ThemeToggle/ThemeToggle.tsx
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/ThemeProvider';

/**
 * Icon button in the app header that flips between light and dark theme.
 * Shows a Sun icon in dark mode (click to go light) and a Moon icon in light mode (click to go dark),
 * i.e. the icon represents the theme you'll SWITCH TO, which is the common UX convention.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}
```

---

## 5. Coding Standards (apply to every file the agent generates)

1. **Functional components only**, written as `function ComponentName() { ... }` (not arrow-function-assigned-to-const, for consistent stack traces and easier `displayName` debugging).
2. **Every component's props are typed with an explicit `interface`**, named `<ComponentName>Props`, declared just above the component:

   ```tsx
   interface FareResultProps {
     fareAmount: number;
     distanceKm: number;
   }

   function FareResult({ fareAmount, distanceKm }: FareResultProps) {
     /* ... */
   }
   ```

3. **`strict: true` in `tsconfig.json`** — no `any` types except in rare, explicitly commented cases (e.g., a genuinely untyped third-party response), and never as a shortcut to avoid writing a real type.
4. **All API calls isolated to `src/api/fareApi.ts`.** No component may call `fetch` directly. This means if the backend URL or response shape ever changes, only one file needs editing. Every request/response shape has a corresponding interface in `src/types/trip.ts`.
5. **One component = one responsibility.** `TripForm` only collects and validates input; it does not call the API itself — it calls a callback prop (`onSubmit: (trip: TripInput) => void`) passed down from `App.tsx`, which owns the actual API call via the custom hook. This keeps components testable in isolation.
6. **Every exported function and non-trivial component gets a short JSDoc/TSDoc comment** describing purpose and behavior — types already document the shape, so comments should focus on _why_, not repeat the type signature:

   ```ts
   /**
    * Calls the Flask /predict endpoint with trip details and returns the model's fare estimate.
    * Distance is computed server-side, so only raw coordinates need to be sent here.
    */
   export async function predictFare(
     trip: TripInput,
   ): Promise<PredictionResult> {
     /* ... */
   }
   ```

7. **Styling is Tailwind utility classes directly in JSX** — no inline `style={{ }}` objects except for genuinely dynamic/computed runtime values (e.g., a chart bar's computed height), and no separate CSS files per component (Tailwind replaces that need). Use `clsx` (bundled as a shadcn/ui dependency) for conditional class composition rather than manual string concatenation.
8. **Error handling is mandatory, not optional**, on every network call: wrap in `try/catch`, surface a user-readable message via the shared `ErrorBanner` component, and never let an unhandled promise rejection reach the console silently.
9. **Naming conventions:** `camelCase` for variables/functions, `PascalCase` for components/types/interfaces, `SCREAMING_SNAKE_CASE` for constants (e.g., `const MAX_PASSENGER_COUNT = 6`).
10. **No magic numbers in JSX.** Validation bounds (lat/long ranges, passenger count limits) live in `src/utils/validators.ts` as named, typed constants, imported wherever needed — never hardcoded twice.
11. **Accessibility baseline:** every form input uses shadcn/ui's `Label` paired via `htmlFor`/`id`; the submit button is a real `<button type="submit">` inside a `<form>` (not a `<div onClick>`); color is never the only signal for an error state (pair red text/border with an icon or explicit wording); theme toggle has an `aria-label` (see Section 4.4).
12. **Import path alias:** use the `@/` alias (already configured by `shadcn init` in `tsconfig.json` and `vite.config.ts`) for all internal imports (e.g., `@/components/ui/button`, `@/hooks/useFarePrediction`) instead of relative `../../` chains.

---

## 6. Epics and Stories

### EPIC 1 — Project Scaffolding, Tailwind/shadcn Setup, and Base Layout

**Goal:** A running Vite+React+TypeScript app with Tailwind and shadcn/ui fully configured, the folder structure above, empty placeholder components wired together, theme toggle working, and no console errors on `npm run dev`.

**Story 1.1 — Initialize project and install the stack**

- Run the exact command sequence in Section 2.
- Acceptance criteria: `npm run dev` launches with no errors; a shadcn `<Button>` renders correctly with Tailwind styles applied (proves the whole toolchain is wired together correctly).

**Story 1.2 — Configure Tailwind + shadcn theme tokens**

- `tailwind.config.ts` sets `darkMode: 'class'` and extends `fontFamily.sans` to `Inter`.
- `index.css` contains the Tailwind directives plus shadcn's generated CSS variable blocks for `:root` (light) and `.dark` (dark).
- Acceptance criteria: toggling the `dark` class manually on `<html>` via browser devtools visibly changes background/text/card colors app-wide, confirming the CSS variables are wired correctly before any component logic is built.

**Story 1.3 — Build the folder structure**

- Create every folder/file listed in Section 3, each feature component as a minimal typed stub returning a `<div>` with its own name as placeholder text.
- Acceptance criteria: folder structure matches Section 3 exactly; app still renders with no TypeScript or import errors.

**Story 1.4 — App shell layout + ThemeProvider wiring**

- `main.tsx` wraps `<App />` in `<ThemeProvider>`.
- `App.tsx` renders: header (app title, one-line description, `ThemeToggle` in the top-right), main content area (form + results side by side on desktop via a responsive grid, stacked on mobile), footer (small muted text noting this is a case-study demo).
- Use Tailwind's responsive grid utilities (`grid grid-cols-1 lg:grid-cols-2 gap-6`) for the main layout split.
- Acceptance criteria: layout is responsive down to a 375px-wide viewport without horizontal scrolling; theme toggle visibly flips the whole app's palette instantly.

---

### EPIC 2 — Shared Types and Validation

**Goal:** All data contracts defined up front in TypeScript so every later story builds against a single source of truth.

**Story 2.1 — `src/types/trip.ts`**

```ts
export interface TripInput {
  pickup_lat: number;
  pickup_lon: number;
  dropoff_lat: number;
  dropoff_lon: number;
  hour: number; // 0-23
  day_of_week_num: number; // 0 (Mon) - 6 (Sun), matches Python's datetime.dayofweek
  month: number; // 1-12
  passenger_count: number; // 1-6
}

export interface PredictionResult {
  fare_amount: number;
  distance_km: number;
}

export interface ParsedTripDetails {
  pickup_landmark: string;
  dropoff_landmark: string;
  hour: number;
  day_of_week_num: number;
  month: number;
  passenger_count: number;
}
```

- Acceptance criteria: every other file that touches trip data imports these types rather than redefining inline object shapes.

**Story 2.2 — `src/utils/validators.ts`**

```ts
// Pulled directly from the case study's own NYC bounding box used during model training
export const NYC_LAT_MIN = 40.5;
export const NYC_LAT_MAX = 40.9;
export const NYC_LON_MIN = -74.3;
export const NYC_LON_MAX = -73.7;
export const MIN_PASSENGERS = 1;
export const MAX_PASSENGERS = 6;

export type ValidationErrors = Partial<Record<keyof TripInput, string>>;

/**
 * Validates raw trip form values against the same bounds the model was trained within.
 * Returns an empty object when fully valid.
 */
export function validateTripInputs(
  values: Partial<TripInput>,
): ValidationErrors {
  /* ... */
}
```

- Acceptance criteria: coordinates outside the NYC bounding box produce a specific message ("Latitude must be between 40.5 and 40.9 for NYC pickups"), not a generic "invalid input."

---

### EPIC 3 — Trip Input Form (shadcn/ui components)

**Goal:** A fully validated, visually polished form using shadcn/ui primitives.

**Story 3.1 — Build `TripForm` using shadcn `Card`, `Input`, `Label`, `Select`, `Button`**

- Wrap the whole form in a shadcn `<Card>` with `<CardHeader>` (title: "Trip Details") and `<CardContent>`.
- Fields: pickup latitude/longitude (`Input type="number"`), dropoff latitude/longitude (`Input type="number"`), a single native `<input type="datetime-local">` (shadcn does not ship a date-time picker primitive, so a plain styled native input is acceptable here — Tailwind-styled to match the rest of the form), passenger count (shadcn `<Select>` with options 1–6).
- Each field wrapped in a small `<div className="space-y-2">` containing its `<Label htmlFor="...">` and input, with validation error text (`text-sm text-destructive`) shown beneath when invalid.
- Submit button is a shadcn `<Button type="submit" className="w-full">Predict Fare</Button>`.
- Component calls `onSubmit(trip: TripInput)` prop — it does NOT call the API itself.
- Acceptance criteria: cannot submit with any field empty or out of valid range; a clear inline error message appears under the specific invalid field, not just a generic banner; visually consistent shadcn styling throughout (no unstyled native inputs breaking the design language).

**Story 3.2 — Date-time decomposition utility**

- A small pure function `decomposeDateTime(value: string): Pick<TripInput, "hour" | "day_of_week_num" | "month">` converts the native `datetime-local` string into the three numeric fields the backend expects.
- `day_of_week_num` must map Monday=0 ... Sunday=6, matching exactly what the backend model was trained on (Python's `datetime.dayofweek` convention) — a mismatch here would silently produce wrong predictions.
- Acceptance criteria: an inline comment with a worked example demonstrates the mapping is correct, e.g. a Wednesday date correctly decomposes to `day_of_week_num: 2`.

---

### EPIC 4 — Prediction Display and Data Visualization

**Goal:** Show the predicted fare, distance, and supporting chart clearly, all styled consistently with shadcn/Tailwind.

**Story 4.1 — `useFarePrediction` custom hook**

```ts
interface UseFarePredictionResult {
  predict: (trip: TripInput) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  result: PredictionResult | null;
}

/**
 * Encapsulates calling /predict and tracking loading/error/result state,
 * so App.tsx stays declarative and components don't manage fetch lifecycles individually.
 */
export function useFarePrediction(): UseFarePredictionResult {
  /* ... */
}
```

- Acceptance criteria: three states are all visibly distinguishable in the UI — loading (shadcn `Skeleton`), error (shadcn `Alert` variant="destructive" with retry button), success (result `Card` populated).

**Story 4.2 — `FareResult` component**

- A shadcn `<Card>` displaying: predicted fare in large, bold, accent-colored currency-formatted text (e.g., `$18.42`, using `text-4xl font-bold text-indigo-600 dark:text-indigo-400`), trip distance as a `<Badge variant="secondary">12.4 km</Badge>`, and a short muted caveat line ("Estimate based on a machine learning model trained on historical NYC taxi data — actual fares may vary due to traffic, tolls, and surcharges.") in `text-sm text-muted-foreground`.
- Acceptance criteria: currency formatting uses `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`, not manual string concatenation; card renders correctly in both themes without contrast issues.

**Story 4.3 — Shared `LoadingSpinner` and `ErrorBanner`**

- `LoadingSpinner`: use `lucide-react`'s `Loader2` icon with Tailwind's `animate-spin` utility — no custom CSS keyframes needed.
- `ErrorBanner`: built from shadcn's `Alert` + `AlertTitle` + `AlertDescription`, accepting a `message: string` prop and an optional `onRetry?: () => void` rendering a small `Button variant="outline"` inside the alert.
- Acceptance criteria: both components are used by more than one parent (proving they're genuinely shared, not accidentally duplicated per-feature).

**Story 4.4 — Static chart data file**

- `src/data/avgFareByHour.json`:

```json
[
  { "hour": 0, "avgFare": 12.4 },
  { "hour": 6, "avgFare": 9.2 },
  { "hour": 8, "avgFare": 14.5 },
  { "hour": 17, "avgFare": 16.9 },
  { "hour": 23, "avgFare": 13.1 }
]
```

(Placeholder values — the human will replace these with the REAL numbers exported from the Jupyter notebook's `groupby('hour').fare_amount.mean()` step before the demo.)

- Acceptance criteria: file is valid JSON, imported directly (no fetch needed since it's a build-time static asset), typed via a small `AvgFareByHour[]` interface in `src/types/trip.ts`.

**Story 4.5 — `FareChart` component using Recharts, inside a shadcn `Card`**

```tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import avgFareByHour from '@/data/avgFareByHour.json';

/**
 * Renders a bar chart of average historical fare by hour of day,
 * giving the user context for whether their predicted fare is typical for that time slot.
 */
export function FareChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Average Fare by Hour</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={avgFareByHour}>
            <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
            {/* Accent color matches the app's chosen indigo palette from Section 4.3 */}
            <Bar
              dataKey="avgFare"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

- Note: `fill="hsl(var(--primary))"` reads shadcn's own theme CSS variable directly, so the chart bars automatically match whichever theme (light/dark) is active without any manual color-switching logic.
- Acceptance criteria: chart renders responsively inside its card, tooltip shows currency-formatted values on hover, colors adapt correctly when the theme is toggled.

---

### EPIC 5 (Optional/Stretch) — Natural Language Trip Input via Ollama

**Goal:** Demonstrate the LLM-as-frontend-parser pattern described in the main case study plan.

**Story 5.1 — `NaturalLanguageInput` component**

- A shadcn `<Card>` containing a `<textarea>` (plain Tailwind-styled, since shadcn's textarea primitive can also be added via `npx shadcn@latest add textarea` if preferred) + a `<Button>`: "Describe your trip in plain English" (e.g., _"3 people from Times Square to JFK airport Friday at 6pm"_).
- On submit, calls a new typed function `parseTrip(description: string): Promise<ParsedTripDetails>` in `fareApi.ts`, receives structured JSON back, and pre-fills the `TripForm` fields with it (does NOT auto-submit the prediction — the user should be able to review/adjust before predicting).
- Acceptance criteria: if the LLM response is malformed JSON (a real possibility since it's a probabilistic model), the component shows a graceful `ErrorBanner` ("Couldn't understand that trip description, please fill the form manually") rather than crashing the app — this must be defensively coded with a `try/catch` around `JSON.parse`, not assumed to always succeed.

**Story 5.2 — Landmark lookup fallback (stretch within a stretch)**

- If time allows, a small hardcoded typed lookup table (`Record<string, [number, number]>`, e.g., `{ "times square": [40.7580, -73.9855], "jfk airport": [40.6413, -73.7781] }`) resolves landmark names the LLM extracts into actual coordinates, since the LLM itself has no guaranteed access to precise NYC geocoding.
- Acceptance criteria: at minimum 5 well-known NYC landmarks resolve correctly; unresolved landmarks fall back to asking the user to enter coordinates manually.

---

### EPIC 6 — Polish & Demo Readiness

**Story 6.1 — Loading/empty states**

- Before any prediction has been made, the results panel shows a friendly placeholder card ("Fill out the form to get a fare estimate") with a muted icon, rather than a blank space or an error.

**Story 6.2 — README**

- Agent must generate a `README.md` covering: how to install (`npm install`), how to run (`npm run dev`), the expected backend URL/port, the theme toggle behavior, and a one-paragraph description of the app's purpose — useful both for the evaluator and for the human's own memory under time pressure.

**Story 6.3 — Environment variable for API base URL**

- Backend URL (`http://localhost:5000`) must live in a `.env` file (`VITE_API_BASE_URL`), read via `import.meta.env.VITE_API_BASE_URL` in `fareApi.ts` — never hardcoded inline — so switching between local dev and the company laptop's environment is a one-line config change, not a code edit. Add a matching `vite-env.d.ts` type declaration so `import.meta.env.VITE_API_BASE_URL` is properly typed rather than `any`.

---

## 7. Definition of Done (whole project)

- [ ] `npm run dev` runs with zero console errors/warnings and zero TypeScript errors (`npm run build` succeeds)
- [ ] Theme toggle works instantly, persists across reloads, and every screen/component looks correct and legible in BOTH light and dark mode
- [ ] Form validates all inputs before allowing submission
- [ ] Successful prediction displays fare, distance, and the caveat text inside a polished shadcn `Card`
- [ ] Chart renders with real (not placeholder) data before the actual evaluation, and its colors adapt to the active theme
- [ ] Loading and error states are visibly distinct and tested by temporarily pointing `VITE_API_BASE_URL` at a wrong port
- [ ] Code reviewed line-by-line by the human before demo day — the agent generates the scaffolding, but the human must be able to explain every file's purpose and every type's shape during evaluation questioning
- [ ] No unused dependencies in `package.json` (agent should not add libraries beyond Section 1's list without flagging why)
- [ ] No `any` types remain in the codebase except explicitly justified, commented exceptions

---

## 8. Explicit Non-Goals (tell the agent NOT to do these, to prevent scope creep)

- No user authentication/login system.
- No persistence layer beyond the theme preference in `localStorage` — no database, no saved prediction history.
- No deployment/hosting configuration (Docker, CI/CD) — this runs locally on the company laptop only.
- No additional shadcn themes/color presets beyond light/dark (no multi-theme picker with 5+ palettes) — two well-executed themes beat five shallow ones on a 2-day timeline.
- No design system libraries other than shadcn/ui + Tailwind.
