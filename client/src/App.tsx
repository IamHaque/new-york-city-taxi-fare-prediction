import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle';
import { TripDetails } from '@/components/TripDetails/TripDetails';
import { useFarePrediction } from '@/hooks/useFarePrediction';
import type { ParsedTripDetails, TripInput } from '@/types/trip';

function App() {
  const { predict, applyResult, isLoading, result } = useFarePrediction();
  const [parsedTrip, setParsedTrip] = useState<ParsedTripDetails | null>(null);
  const [inputMode, setInputMode] = useState<'manual' | 'describe'>('manual');

  function handleSubmit(trip: TripInput) {
    predict(trip);
  }

  function handleParsedTrip(trip: ParsedTripDetails) {
    setParsedTrip(trip);
    // Switch to the manual view so the map (now pinned from the parsed coordinates), the
    // populated form, and the result panel are all visible in one place.
    setInputMode('manual');

    if (trip.fare_amount !== undefined && trip.distance_km !== undefined) {
      // /parse-trip already resolved both landmarks and ran the model server-side — show that
      // prediction directly instead of firing a redundant /predict call for the same trip.
      applyResult({ fare_amount: trip.fare_amount, distance_km: trip.distance_km });
    }
    // If fare_amount/distance_km are absent, the server couldn't resolve one or both landmarks
    // (trip.warning explains which). The form/time/passenger fields still populate from what DID
    // parse; the person places the remaining pin(s) manually and submits as usual.
  }

  function handleModeChange(mode: 'manual' | 'describe') {
    setInputMode(mode);
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="mx-auto max-w-7xl border-b border-border px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[33px] font-semibold tracking-tight">NYC Taxi Fare Predictor</h1>
            <p className="mt-1 max-w-[46ch] text-[16.5px] text-muted-foreground">
              ML-powered fare estimates from historical NYC taxi trip data.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <TripDetails
          onSubmit={handleSubmit}
          disabled={isLoading}
          initialValues={parsedTrip ?? undefined}
          mode={inputMode}
          onModeChange={handleModeChange}
          onParsedTrip={handleParsedTrip}
          result={result ?? undefined}
          isLoading={isLoading}
        />
      </main>

      <footer className="border-t border-border px-5 py-4">
        <div className="mx-auto max-w-7xl text-center text-sm text-muted-foreground">
          Case study demo — NYC Taxi Fare Prediction ML model
        </div>
      </footer>
    </div>
  );
}

export default App;