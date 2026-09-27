import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle';
import { TripForm } from '@/components/TripForm/TripForm';
import { FareResult } from '@/components/FareResult/FareResult';
import { FareChart } from '@/components/FareChart/FareChart';
import { NaturalLanguageInput } from '@/components/NaturalLanguageInput/NaturalLanguageInput';
import { useFarePrediction } from '@/hooks/useFarePrediction';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { Card, CardContent } from '@/components/ui/card';
import type { ParsedTripDetails } from '@/types/trip';

/**
 * App - top-level layout composing the major sections:
 * header (title, description, theme toggle), main (form + results in responsive grid), footer.
 */
function App() {
  const { predict, isLoading, error, result } = useFarePrediction();
  const [lastSubmittedTrip, setLastSubmittedTrip] = useState<{
    pickup_lat: number;
    pickup_lon: number;
    dropoff_lat: number;
    dropoff_lon: number;
    hour: number;
    day_of_week_num: number;
    month: number;
    passenger_count: number;
  } | null>(null);
  const [parsedTrip, setParsedTrip] = useState<ParsedTripDetails | null>(null);

  function handleSubmit(trip: {
    pickup_lat: number;
    pickup_lon: number;
    dropoff_lat: number;
    dropoff_lon: number;
    hour: number;
    day_of_week_num: number;
    month: number;
    passenger_count: number;
  }) {
    setLastSubmittedTrip(trip);
    predict(trip);
  }

  function handleParsedTrip(trip: ParsedTripDetails) {
    setParsedTrip(trip);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">NYC Taxi Fare Predictor</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter trip details to predict the fare using a machine learning model trained on historical NYC taxi data.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Trip Form + Natural Language Input */}
          <div className="space-y-6">
            <TripForm onSubmit={handleSubmit} disabled={isLoading} initialValues={parsedTrip ?? undefined} />
            <NaturalLanguageInput onParsedTrip={handleParsedTrip} disabled={isLoading} />
          </div>

          {/* Right column: Fare Result + Chart */}
          <div className="space-y-6">
            {isLoading ? (
              <Card>
                <CardContent className="py-12">
                  <LoadingSpinner />
                </CardContent>
              </Card>
            ) : error ? (
              <ErrorBanner message={error} onRetry={() => lastSubmittedTrip && predict(lastSubmittedTrip)} />
            ) : result ? (
              <FareResult fareAmount={result.fare_amount} distanceKm={result.distance_km} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Fill out the form to get a fare estimate
                </CardContent>
              </Card>
            )}
            <FareChart />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          Case study demo — NYC Taxi Fare Prediction ML model
        </div>
      </footer>
    </div>
  );
}

export default App;