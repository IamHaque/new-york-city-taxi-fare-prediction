import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { parseTrip } from '@/api/fareApi';
import type { ParsedTripDetails } from '@/types/trip';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { NoticeBanner } from '@/components/shared/NoticeBanner';
import { Loader2, MessageSquare } from 'lucide-react';

interface NaturalLanguageInputProps {
  onParsedTrip: (trip: ParsedTripDetails) => void;
  disabled?: boolean;
}

/**
 * NaturalLanguageInput - free-text trip description, parsed AND predicted via /parse-trip.
 *
 * The server resolves the LLM's landmark names to coordinates and, when both sides resolve, runs
 * the fare model itself — so a successful parse here already carries fare_amount/distance_km.
 * onParsedTrip() hands the full response up to App.tsx, which pre-fills the map/form and, when a
 * prediction is present, displays it immediately (see App.tsx's handleParsedTrip).
 *
 * If the server could only resolve one side (or neither), the response still carries the parsed
 * time/passenger fields plus a `warning` explaining which location needs to be placed manually —
 * that's a partial success, not a thrown error, so it's shown as a NoticeBanner, not ErrorBanner.
 */
export function NaturalLanguageInput({ onParsedTrip, disabled }: NaturalLanguageInputProps) {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!description.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setNotice(null);

    try {
      const parsed = await parseTrip(description.trim());
      onParsedTrip(parsed);
      setNotice(parsed.warning ?? null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not understand that trip description. Please fill the form manually.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    // Level 1 card: secondary surface with softer border
    <Card className="border-border/60 rounded-lg border">
      <CardHeader className="flex flex-col items-start">
        <div className="flex w-full items-center gap-2">
          <MessageSquare className="mr-2 h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-2xl font-semibold">Describe Your Trip</CardTitle>
        </div>
        <CardDescription className="text-sm">
          Example: "3 people from Times Square to JFK airport Friday at 6pm" — this fills in the
          map and form, and estimates the fare in one step.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trip-description">Trip Description</Label>
            <Textarea
              id="trip-description"
              placeholder="e.g., 2 passengers from Times Square to JFK on Friday at 6pm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={disabled || isLoading}
              rows={3}
              className="resize-none"
            />
          </div>

          {error && <ErrorBanner message={error} />}
          {notice && <NoticeBanner message={notice} />}

          <Button
            type="submit"
            className="w-full"
            disabled={disabled || isLoading || !description.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Parsing & estimating...
              </>
            ) : (
              'Parse Trip & Estimate Fare'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
