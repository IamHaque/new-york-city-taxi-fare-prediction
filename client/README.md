# NYC Taxi Fare Predictor

A React + Vite + TypeScript frontend for the NYC Taxi Fare Prediction case study. Predicts taxi fares using a Flask ML backend.

## Features

- **Trip Form**: Validated input for pickup/dropoff coordinates, date/time, passenger count
- **Natural Language Input** (stretch): Describe trips in plain English (e.g., "3 people from Times Square to JFK Friday 6pm")
- **Fare Prediction**: Calls Flask `/predict` endpoint, displays fare, distance, and model caveats
- **Historical Chart**: Average fare by hour of day (Recharts, theme-aware)
- **Light/Dark Theme**: Persisted in localStorage, respects OS preference
- **Responsive Layout**: Works from 375px mobile to desktop

## Tech Stack

- React 18 + TypeScript (strict)
- Vite
- Tailwind CSS (darkMode: class)
- shadcn/ui (Radix primitives)
- Recharts
- Lucide React icons
- Native fetch (no axios)

## Getting Started

### Prerequisites

- Node.js 18+
- Flask backend running at `http://localhost:5000` (see separate repo)

### Install

```bash
npm install
```

### Run Dev Server

```bash
npm run dev
```

Opens at `http://localhost:5173`.

### Build for Production

```bash
npm run build
```

Output in `dist/`.

### Lint

```bash
npm run lint
```

## Configuration

Create `.env` (or `.env.local`):

```env
VITE_API_BASE_URL=http://localhost:5000
```

This is read via `import.meta.env.VITE_API_BASE_URL` in `src/api/fareApi.ts`.

## Theme Toggle

- Click the sun/moon icon in the top-right header
- Choice persists across reloads (localStorage key: `taxi-fare-ui-theme`)
- Defaults to OS preference (`prefers-color-scheme: dark`)

## Project Structure

```
src/
├── api/fareApi.ts           # All backend calls (fetch)
├── components/
│   ├── ui/                  # shadcn/ui primitives (Button, Input, Card, etc.)
│   ├── TripForm/            # Validated trip input form
│   ├── NaturalLanguageInput/# Free-text LLM parsing (stretch)
│   ├── FareResult/          # Predicted fare + distance display
│   ├── FareChart/           # Recharts bar chart (avg fare by hour)
│   ├── ThemeToggle/         # Light/dark switch
│   └── shared/              # LoadingSpinner, ErrorBanner
├── context/ThemeProvider.tsx # React context for theme
├── data/avgFareByHour.json  # Static chart data
├── hooks/useFarePrediction.ts # Custom hook for /predict
├── types/trip.ts            # All shared TypeScript interfaces
├── utils/
│   ├── validators.ts        # Input validation (NYC bounds)
│   ├── dateTimeUtils.ts     # datetime-local → hour/day/month
│   └── landmarks.ts         # Landmark → coordinate lookup
└── lib/utils.ts             # cn() class helper
```

## Backend Contract

**POST `/predict`**

```json
// Request
{
  "pickup_lat": 40.7580,
  "pickup_lon": -73.9855,
  "dropoff_lat": 40.6413,
  "dropoff_lon": -73.7781,
  "hour": 18,
  "day_of_week_num": 4,
  "month": 1,
  "passenger_count": 2
}

// Response
{
  "fare_amount": 18.42,
  "distance_km": 12.4
}
```

**POST `/parse-trip`** (optional, Epic 5)

```json
// Request
{ "description": "2 people from Times Square to JFK Friday at 6pm" }

// Response
{
  "pickup_landmark": "times square",
  "dropoff_landmark": "jfk airport",
  "hour": 18,
  "day_of_week_num": 4,
  "month": 1,
  "passenger_count": 2
}
```

## Validation Rules

- Latitude: 40.5 – 40.9 (NYC bounds)
- Longitude: -74.3 – -73.7
- Hour: 0–23
- Day of week: 0 (Mon) – 6 (Sun)
- Month: 1–12
- Passengers: 1–6

## License

Case study demo — not for production use.
