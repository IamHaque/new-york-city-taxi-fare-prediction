import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import { ChartTabs, type ChartGroup } from './ChartTabs';
import { RidesByDayChart } from './RidesByDayChart';
import { RidesByHourChart } from './RidesByHourChart';
import { AvgFareByMonthChart } from './AvgFareByMonthChart';
import { FareDistributionChart } from './FareDistributionChart';
import { FareVsDistanceChart } from './FareVsDistanceChart';
import { TopDropoffsChart } from './TopDropoffsChart';
import { ModelRmseChart } from './ModelRmseChart';
import { FeatureImportanceChart } from './FeatureImportanceChart';
import { FareChart } from '@/components/FareChart/FareChart';
import type { ChartContext } from '@/types/charts';

interface InsightsSectionProps {
  /** Live trip context the average-fare-by-hour card highlights ("Your trip"). */
  chartContext?: ChartContext;
}

/**
 * Insights dashboard (PRD v4, Epic 7) — chart tabs grouping the notebook-derived charts
 * into Demand / Fares / Locations / Model & Data, each chart sourced from the JSON exports
 * of scripts/generate_chart_data.py. The existing average-fare-by-hour chart (FareChart)
 * lives on as one card in the Fares group.
 */
export function InsightsSection({ chartContext }: InsightsSectionProps) {
  const [activeGroup, setActiveGroup] = useState<ChartGroup>('demand');

  return (
    <section className="mt-10 space-y-4" aria-label="Insights dashboard">
      <div>
        <h2 className="text-2xl font-semibold">Insights</h2>
        <p className="text-sm text-muted-foreground">
          Patterns from the real NYC taxi trip dataset — generated from the analysis notebook
        </p>
      </div>

      <ChartTabs activeGroup={activeGroup} onChange={setActiveGroup} />

      <div
        role="tabpanel"
        id={`insights-panel-${activeGroup}`}
        aria-labelledby={`insights-tab-${activeGroup}`}
        className="grid gap-5 md:grid-cols-2"
      >
        {activeGroup === 'demand' && (
          <>
            <RidesByDayChart />
            <RidesByHourChart />
          </>
        )}

        {activeGroup === 'fares' && (
          <>
            <AvgFareByMonthChart />
            <FareChart
              currentHour={chartContext?.currentHour}
              predictedFare={chartContext?.predictedFare}
            />
            <FareDistributionChart />
            <FareVsDistanceChart />
          </>
        )}

        {activeGroup === 'locations' && (
          <>
            <TopDropoffsChart />
            {/* <HeatmapPlaceholder /> */}
          </>
        )}

        {activeGroup === 'model' && (
          <>
            <ModelRmseChart />
            <FeatureImportanceChart />
          </>
        )}
      </div>
    </section>
  );
}

/**
 * Story 7.6 — honest placeholder instead of fabricated density data: dashed card awaiting a
 * binned heat-map grid export from scripts/generate_chart_data.py.
 */
function HeatmapPlaceholder() {
  return (
    <Card className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
      <CardHeader className="items-center pb-2">
        <Layers className="mb-2 h-6 w-6 text-muted-foreground" />
        <CardTitle className="text-base font-medium text-muted-foreground">
          Heat map — coming once{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            scripts/generate_chart_data.py
          </code>{' '}
          exports a binned density grid
        </CardTitle>
      </CardHeader>
      <CardContent className="max-w-xs">
        <p className="text-sm text-muted-foreground">
          Pickup/drop-off density needs geospatial binning that this PRD deliberately excludes
          rather than faking.
        </p>
      </CardContent>
    </Card>
  );
}
