import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface FareResultProps {
  fareAmount: number;
  distanceKm: number;
}

/**
 * FareResult - displays predicted fare, distance, and caveat text.
 * Currency formatting uses Intl.NumberFormat; card renders correctly in both themes.
 */
export function FareResult({ fareAmount, distanceKm }: FareResultProps) {
  const formattedFare = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(fareAmount);

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="text-4xl font-bold text-primary">
          {formattedFare}
        </div>
        <Badge variant="secondary">{distanceKm.toFixed(1)} km</Badge>
        <p className="text-sm text-muted-foreground">
          Estimate based on a machine learning model trained on historical NYC taxi data —
          actual fares may vary due to traffic, tolls, and surcharges.
        </p>
      </CardContent>
    </Card>
  );
}