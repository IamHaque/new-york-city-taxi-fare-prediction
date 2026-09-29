import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, MapPin } from 'lucide-react';
import type { TripInput } from '@/types/trip';

export interface RecentEstimate {
  id: string;
  pickupLabel: string;
  dropoffLabel: string;
  fare_amount: number;
  distance_km: number;
  /** Epoch ms of when the estimate completed. */
  submittedAt: number;
  /** Full input so clicking an item can repopulate the form/map and re-run the estimate. */
  trip: TripInput;
}

interface RecentEstimatesCardProps {
  items: RecentEstimate[];
  onSelect: (item: RecentEstimate) => void;
}

function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Session-only list of the last few estimates (PRD v4, Epic 6) — deliberately not persisted;
 * the app has no user accounts, so history lives in TripPlanner state only, newest first,
 * capped at 5. Clicking an item repopulates the map/form and re-runs the estimate.
 */
export function RecentEstimatesCard({ items, onSelect }: RecentEstimatesCardProps) {
  return (
    <Card className="rounded-lg border">
      <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
        <History className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-lg font-semibold">Recent Estimates</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No estimates yet — your last few fares will show up here.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-left transition-colors hover:border-primary hover:bg-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm text-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-pickup" />
                      <span className="truncate">{item.pickupLabel}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="truncate">{item.dropoffLabel}</span>
                    </span>
                    <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                      {item.distance_km.toFixed(1)} km · {formatTime(item.submittedAt)}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold text-foreground">
                    ${item.fare_amount.toFixed(2)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
