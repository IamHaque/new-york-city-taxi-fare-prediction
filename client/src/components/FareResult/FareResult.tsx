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
    <div className="overflow-hidden rounded-lg border border-l-4 border-border border-l-primary">
      {/* Solid banner strip — direct port of .holder-banner */}
      <div className="flex items-center justify-between bg-primary px-3 py-1.5">
        <span className="font-mono text-xs font-semibold uppercase tracking-wide text-primary-foreground">
          Predicted Fare
        </span>
      </div>
      {/* Tinted body — mirrors .tile.claimed .tile-body's tinted background */}
      <div className="bg-primary/10 space-y-3 p-4">
        <div className="font-mono text-5xl font-bold tracking-tight text-foreground">
          {formattedFare}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground">
          <Route className="h-3 w-3" />
          {distanceKm.toFixed(1)} km trip
        </span>
        <p className="text-sm text-muted-foreground">
          Estimate based on a machine learning model trained on historical NYC taxi data — actual
          fares may vary due to traffic, tolls, and surcharges.
        </p>
      </div>
    </div>
  );
}
