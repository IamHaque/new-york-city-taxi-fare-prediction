import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import avgFareByHour from '@/data/avgFareByHour.json';
import type { AvgFareByHour } from '@/types/trip';

/**
 * Renders a bar chart of average historical fare by hour of day,
 * giving the user context for whether their predicted fare is typical for that time slot.
 */
export function FareChart() {
  const data = avgFareByHour as AvgFareByHour[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Average Fare by Hour</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: unknown) => (typeof value === 'number' ? `$${value.toFixed(2)}` : '')}
              labelFormatter={(label: unknown) => (typeof label === 'number' ? `${label}:00` : '')}
            />
            {/* Accent color matches the app's chosen indigo palette from Section 4.3 */}
            <Bar
              dataKey="avgFare"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}