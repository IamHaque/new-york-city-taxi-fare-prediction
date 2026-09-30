import { lazy, Suspense, useState } from 'react';
import { Car } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle';
import { TripPlanner } from '@/components/TripPlanner/TripPlanner';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChartContext } from '@/types/charts';

/**
 * Code-split the insights dashboard (PRD v5, Issue 6): Recharts and every chart's JSON data
 * are only fetched once the person actually scrolls to the section, instead of riding along
 * in the first paint with the map + form.
 */
const InsightsSection = lazy(() =>
  import('@/components/InsightsSection/InsightsSection').then((module) => ({
    default: module.InsightsSection,
  }))
);

/** Skeleton fallback in the same shape as the loaded dashboard (title + tabs + two cards). */
function InsightsFallback() {
  return (
    <section className="mt-10 space-y-4" aria-hidden="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-8 w-72" />
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-[300px] rounded-lg" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    </section>
  );
}

function App() {
  const [chartContext, setChartContext] = useState<ChartContext>({});

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Sticky header with brand mark, matching the reference mockup treatment (PRD v5,
          Issue 9). Full-bleed so the backdrop blur covers the viewport, not just content. */}
      <header className="bg-background/80 sticky top-0 z-10 border-b border-border backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground"
              aria-hidden="true"
            >
              <Car className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight">NYC Taxi Fare Predictor</h1>
              <p className="max-w-[52ch] text-[14px] text-muted-foreground">
                ML-powered fare estimates from historical NYC taxi trip data.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <TripPlanner onChartContextChange={setChartContext} />
        <Suspense fallback={<InsightsFallback />}>
          <InsightsSection chartContext={chartContext} />
        </Suspense>
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
