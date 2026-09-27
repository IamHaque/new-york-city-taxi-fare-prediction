import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle';
import { TripForm } from '@/components/TripForm/TripForm';
import { FareResult } from '@/components/FareResult/FareResult';
import { FareChart } from '@/components/FareChart/FareChart';
import { useFarePrediction } from '@/hooks/useFarePrediction';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { Card, CardContent } from '@/components/ui/card';
import { Receipt } from 'lucide-react';
import type { ParsedTripDetails, TripInput } from '@/types/trip';

/**
 * App - top-level layout composing the major sections:
 * header (title, description, theme toggle), main (form + results in responsive grid), footer.
 */
function App() {
  const { predict, isLoading, error, result } = useFarePrediction();
  const [lastSubmittedTrip, setLastSubmittedTrip] = useState<TripInput | null>(null);
  const [parsedTrip, setParsedTrip] = useState<ParsedTripDetails | null>(null);
  const [inputMode, setInputMode] = useState<'manual' | 'describe'>('manual');

  function handleSubmit(trip: TripInput) {
    setLastSubmittedTrip(trip);
    predict(trip);
  }

  function handleParsedTrip(trip: ParsedTripDetails) {
    setParsedTrip(trip);
  }

  function handleModeChange(mode: 'manual' | 'describe') {
    setInputMode(mode);
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Header - simplified per PRD v3 Section 3.7 */}
      <header className="mx-auto max-w-6xl border-b border-border px-5 py-5">
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

      {/* Main content - increased spacing rhythm per PRD v2 Section 2.5 */}
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left column: Trip Form (with embedded NaturalLanguageInput) */}
          <div className="space-y-8">
            <TripForm
              onSubmit={handleSubmit}
              disabled={isLoading}
              initialValues={parsedTrip ?? undefined}
              mode={inputMode}
              onModeChange={handleModeChange}
              onParsedTrip={handleParsedTrip}
            />
          </div>

          {/* Right column: Fare Result + Chart */}
          <div className="space-y-8">
            {isLoading ? (
              <Card className="rounded-lg border border-border">
                <CardContent className="py-12">
                  <LoadingSpinner />
                </CardContent>
              </Card>
            ) : error ? (
              <ErrorBanner
                message={error}
                onRetry={() => lastSubmittedTrip && predict(lastSubmittedTrip)}
              />
            ) : result ? (
              <FareResult fareAmount={result.fare_amount} distanceKm={result.distance_km} />
            ) : (
              // Empty state with dashed border and icon per PRD v2 Story 3.3
              <Card className="rounded-lg border-dashed border-border">
                <CardContent className="flex min-h-[180px] flex-col items-center justify-center gap-4 py-12 text-center">
                  <Receipt className="text-muted-foreground/50 mt-2 h-10 w-10" />
                  <p className="text-muted-foreground">Fill out the form to get a fare estimate</p>
                </CardContent>
              </Card>
            )}
            <FareChart />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-5 py-4">
        <div className="mx-auto max-w-6xl text-center text-sm text-muted-foreground">
          Case study demo — NYC Taxi Fare Prediction ML model
        </div>
      </footer>
    </div>
  );
}

export default App;
