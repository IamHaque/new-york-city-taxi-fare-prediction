import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GitCompareArrows } from 'lucide-react';
import fareVsDistance from '@/data/fare_vs_distance_sample.json';
import type { FareDistancePoint } from '@/types/charts';
import { axisTick, formatFareTick, tooltipStyle } from './chartTheme';

/**
 * Fare vs distance scatter (500-point sample from scripts/generate_chart_data.py) with a
 * least-squares trend line fitted client-side on that sample — the visual justification for
 * why distance_km dominates FEATURE_COLUMNS (ties into the feature-importance chart).
 */
export function FareVsDistanceChart() {
  const sample = fareVsDistance as FareDistancePoint[];

  // Ordinary least-squares fit of fare ~ distance over the sample; evaluated at every point,
  // so the Line series renders as one straight trend line across the full x-range.
  const n = sample.length;
  const sumX = sample.reduce((acc, p) => acc + p.distance_km, 0);
  const sumY = sample.reduce((acc, p) => acc + p.fare_amount, 0);
  const sumXY = sample.reduce((acc, p) => acc + p.distance_km * p.fare_amount, 0);
  const sumXX = sample.reduce((acc, p) => acc + p.distance_km * p.distance_km, 0);
  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = n === 0 ? 0 : (sumY - slope * sumX) / n;

  const data = sample.map((point) => ({
    ...point,
    trend: Math.max(intercept + slope * point.distance_km, 0),
  }));

  return (
    <Card className="rounded-lg border">
      <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
        <GitCompareArrows className="h-5 w-5 text-muted-foreground" />
        <div>
          <CardTitle className="text-lg font-semibold">Fare vs Distance</CardTitle>
          <CardDescription className="text-sm">
            Why distance dominates the model (trend line fitted on the sample)
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="distance_km"
              type="number"
              domain={[0, 'dataMax']}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              label={{
                value: 'Distance (km)',
                position: 'insideBottom',
                offset: -12,
                fill: 'var(--muted-foreground)',
                fontSize: 11,
              }}
            />
            <YAxis
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatFareTick}
            />
            <Tooltip
              cursor={{ stroke: 'var(--border)' }}
              contentStyle={tooltipStyle}
              formatter={(value, name) => {
                const formatted = `$${Number(value ?? 0).toFixed(2)}`;
                return name === 'trend' ? [formatted, 'Trend'] : [formatted, 'Fare'];
              }}
              labelFormatter={(_label, payload) => {
                const point = payload?.[0]?.payload as FareDistancePoint | undefined;
                return point ? `${point.distance_km.toFixed(1)} km` : '';
              }}
            />
            <Scatter
              dataKey="fare_amount"
              fill="var(--chart-1)"
              fillOpacity={0.45}
              shape="circle"
            />
            <Line
              dataKey="trend"
              type="linear"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
