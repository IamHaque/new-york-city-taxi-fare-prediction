import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
// TODO: replace with real groupby('hour').fare_amount.mean() output from the training notebook before evaluation
import avgFareByHour from '@/data/avgFareByHour.json';
import type { AvgFareByHour } from '@/types/trip';

/**
 * Renders a bar chart of average historical fare by hour of day,
 * giving the user context for whether their predicted fare is typical for that time slot.
 */
export function FareChart() {
  const data = avgFareByHour as AvgFareByHour[];

  return (
    // Level 1 card: secondary surface with softer border
    <Card className="border-border/60 rounded-lg border">
      <CardHeader className="flex flex-row items-center">
        <BarChart3 className="mr-2 h-5 w-5 text-muted-foreground" />
        <div>
          <CardTitle className="text-2xl font-semibold">Average Fare by Hour</CardTitle>
          <CardDescription className="text-sm">
            Based on historical NYC taxi data, not your specific trip
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: unknown) =>
                typeof value === 'number' ? `$${value.toFixed(2)}` : ''
              }
              labelFormatter={(label: unknown) => (typeof label === 'number' ? `${label}:00` : '')}
            />
            {/* Accent color matches the app's chosen primary palette */}
            <Bar dataKey="avgFare" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
