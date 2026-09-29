import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { DollarSign, MapPin, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import type { PredictionResult, TripInput } from '@/types/trip';
import {
  BREAKDOWN_DISCLAIMER,
  getFareBreakdown,
  getFareComparison,
  getLikelyRange,
  getSecondaryStats,
} from '@/utils/fareDisplay';

interface FareResultCardProps {
  result: PredictionResult | null;
  isLoading: boolean;
  error: string | null;
  /** Snapshot of the trip the current result was computed for — supplies the hour/pins/
   *  passenger context the illustrative breakdown and ETA are derived from. */
  trip: TripInput | null;
  onRetry?: () => void;
}

const SEGMENT_COLORS: Record<string, string> = {
  'Base + distance': 'bg-chart-1',
  'Rush hour': 'bg-brand',
  'Airport trip': 'bg-pickup',
};

function LoadingState() {
  return (
    <div className="space-y-4" aria-label="Loading fare estimate">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-5 w-56" />
      <Skeleton className="h-4 w-full" />
      <div className="grid grid-cols-4 gap-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
      <MapPin className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Place both pins to see your estimated fare</p>
    </div>
  );
}

/**
 * Always-present fare result panel (PRD v4, Epic 5). The card never unmounts — it renders
 * one of four explicit states (empty / loading / error / populated) matching
 * useFarePrediction's isLoading/error/result trio, so its position never jumps around.
 */
export function FareResultCard({ result, isLoading, error, trip, onRetry }: FareResultCardProps) {
  let content: ReactNode;

  if (isLoading) {
    content = <LoadingState />;
  } else if (error) {
    content = <ErrorBanner message={error} onRetry={onRetry} />;
  } else if (!result) {
    content = <EmptyState />;
  } else {
    const comparison = getFareComparison(result.fare_amount);
    const range = getLikelyRange(result.fare_amount);
    const breakdown = trip
      ? getFareBreakdown({
          fare: result.fare_amount,
          hour: trip.hour,
          dayOfWeekNum: trip.day_of_week_num,
          pickup: { lat: trip.pickup_lat, lon: trip.pickup_lon },
          dropoff: { lat: trip.dropoff_lat, lon: trip.dropoff_lon },
        })
      : [];
    const stats = trip
      ? getSecondaryStats({
          fare: result.fare_amount,
          distanceKm: result.distance_km,
          passengerCount: trip.passenger_count,
          hour: trip.hour,
          dayOfWeekNum: trip.day_of_week_num,
        })
      : null;

    content = (
      <div className="space-y-4">
        <div>
          <div className="flex items-end justify-between gap-2">
            <p className="font-mono text-3xl font-bold text-foreground">
              ${result.fare_amount.toFixed(2)}
            </p>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-medium ${
                comparison.belowAverage
                  ? 'bg-success/15 text-success'
                  : 'bg-brand/25 text-foreground'
              }`}
            >
              {comparison.belowAverage ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5" />
              )}
              {comparison.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Likely range:{' '}
            <span className="font-mono">
              ${range.low.toFixed(2)} – ${range.high.toFixed(2)}
            </span>{' '}
            <span className="text-xs">(illustrative)</span>
          </p>
        </div>

        {breakdown.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Fare breakdown</p>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {breakdown.map((segment) => (
                <div
                  key={segment.label}
                  className={SEGMENT_COLORS[segment.label] ?? 'bg-chart-1'}
                  style={{ width: `${segment.share * 100}%` }}
                  title={`${segment.label}: $${segment.amount.toFixed(2)}`}
                />
              ))}
            </div>
            <ul className="space-y-1">
              {breakdown.map((segment) => (
                <li
                  key={segment.label}
                  className="flex items-center justify-between text-xs text-muted-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        SEGMENT_COLORS[segment.label] ?? 'bg-chart-1'
                      }`}
                    />
                    {segment.label}
                  </span>
                  <span className="font-mono">${segment.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] italic text-muted-foreground">{BREAKDOWN_DISCLAIMER}</p>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-4 divide-x divide-border rounded-lg border border-border">
            <div className="flex flex-col items-center gap-0.5 px-1 py-2">
              <span className="font-mono text-sm font-semibold text-foreground">
                {stats.distanceMiles.toFixed(1)} mi
              </span>
              <span className="text-center text-[10px] leading-tight text-muted-foreground">
                Distance
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-1 py-2">
              <span className="font-mono text-sm font-semibold text-foreground">
                {stats.farePerMile !== null ? `$${stats.farePerMile.toFixed(2)}` : '—'}
              </span>
              <span className="text-center text-[10px] leading-tight text-muted-foreground">
                Per mile
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-1 py-2">
              <span className="font-mono text-sm font-semibold text-foreground">
                ${stats.farePerRider.toFixed(2)}
              </span>
              <span className="text-center text-[10px] leading-tight text-muted-foreground">
                Per rider
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-1 py-2">
              <span className="flex items-center gap-1 font-mono text-sm font-semibold text-foreground">
                <Clock className="h-3 w-3 text-muted-foreground" />
                {Math.round(stats.etaMinutes)} min
              </span>
              <span className="text-center text-[10px] leading-tight text-muted-foreground">
                Estimated travel time
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="rounded-lg border border-t-2 border-border border-t-brand">
      <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
        <DollarSign className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-lg font-semibold">Estimated Fare</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
