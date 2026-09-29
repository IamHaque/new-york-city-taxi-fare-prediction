import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle';
import { TripPlanner } from '@/components/TripPlanner/TripPlanner';
import { InsightsSection } from '@/components/InsightsSection/InsightsSection';
import type { ChartContext } from '@/types/charts';

function App() {
  const [chartContext, setChartContext] = useState<ChartContext>({});

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
        <TripPlanner onChartContextChange={setChartContext} />
        <InsightsSection chartContext={chartContext} />
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
