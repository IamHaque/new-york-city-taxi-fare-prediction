import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

/** How many estimates stay visible in the card; the rest live behind "See all" (the dialog). */
const INLINE_VISIBLE = 3;

function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** One estimate row — shared by the inline list and the full-history dialog. */
function EstimateRow({
  item,
  onSelect,
}: {
  item: RecentEstimate;
  onSelect: (item: RecentEstimate) => void;
}) {
  return (
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
  );
}

/**
 * Session-only list of recent estimates (PRD v4, Epic 6) — deliberately not persisted; the app
 * has no user accounts, so history lives in TripPlanner state only, newest first. TripPlanner
 * upserts by payload, so re-estimating an existing trip refreshes it rather than duplicating.
 *
 * Shows the first INLINE_VISIBLE entries inline; beyond that a "See all" button opens a dialog
 * with the full history (up to TripPlanner's MAX_RECENT_ESTIMATES). Clicking a row anywhere
 * repopulates the map/form and re-runs the estimate (dialog rows close it first).
 */
export function RecentEstimatesCard({ items, onSelect }: RecentEstimatesCardProps) {
  const [showAll, setShowAll] = useState(false);
  const inlineItems = items.slice(0, INLINE_VISIBLE);

  function selectFromDialog(item: RecentEstimate) {
    setShowAll(false);
    onSelect(item);
  }

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
          <>
            <ul className="space-y-1.5">
              {inlineItems.map((item) => (
                <li key={item.id}>
                  <EstimateRow item={item} onSelect={onSelect} />
                </li>
              ))}
            </ul>

            {items.length > INLINE_VISIBLE && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-muted-foreground"
                onClick={() => setShowAll(true)}
              >
                See all {items.length} estimates
              </Button>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Recent Estimates</DialogTitle>
            <DialogDescription>
              Full session history, newest first — pick one to load it into the planner.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto pr-1">
            <ul className="space-y-1.5">
              {items.map((item) => (
                <li key={item.id}>
                  <EstimateRow item={item} onSelect={selectFromDialog} />
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
