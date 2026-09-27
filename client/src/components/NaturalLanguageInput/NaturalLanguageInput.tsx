import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { parseTrip } from '@/api/fareApi';
import type { ParsedTripDetails } from '@/types/trip';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { Loader2, MessageSquare } from 'lucide-react';

interface NaturalLanguageInputProps {
  onParsedTrip: (trip: ParsedTripDetails) => void;
  disabled?: boolean;
}

/**
 * NaturalLanguageInput - free-text trip description parsed via LLM (Epic 5 stretch).
 * Calls parseTrip(), on success calls onParsedTrip() to pre-fill TripForm.
 * Gracefully handles malformed LLM responses.
 * Designed to be embedded within TripForm's describe mode (Level 1 card styling).
 */
export function NaturalLanguageInput({ onParsedTrip, disabled }: NaturalLanguageInputProps) {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!description.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const parsed = await parseTrip(description.trim());
      onParsedTrip(parsed);
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
      <CardHeader className="flex flex-row items-center">
        <MessageSquare className="mr-2 h-5 w-5 text-muted-foreground" />
        <div>
          <CardTitle className="text-2xl font-semibold">Describe Your Trip</CardTitle>
          <CardDescription className="text-sm">
            Example: "3 people from Times Square to JFK airport Friday at 6pm"
          </CardDescription>
        </div>
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

          <Button
            type="submit"
            className="w-full"
            disabled={disabled || isLoading || !description.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Parsing...
              </>
            ) : (
              'Parse Trip'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
