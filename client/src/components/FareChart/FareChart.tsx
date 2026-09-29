import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import avgFareByHour from '@/data/avgFareByHour.json';
import type { AvgFareByHour } from '@/types/trip';

interface FareChartProps {
  currentHour?: number;
  predictedFare?: number;
}

/**
 * Colors are CSS custom properties (PRD v4 palette) rather than per-theme hexes, so every chart
 * repaints on theme switch — including the system-preference case — without a theme prop.
 */
const CHART_COLORS = {
  axisTick: 'var(--muted-foreground)',
  barDefault: 'var(--muted-foreground)',
  barHighlight: 'var(--chart-1)',
  tooltipBg: 'var(--popover)',
  tooltipBorder: 'var(--border)',
  tooltipText: 'var(--popover-foreground)',
};

export function FareChart({ currentHour, predictedFare }: FareChartProps) {
  const data = avgFareByHour as AvgFareByHour[];
  const colors = CHART_COLORS;

  const displayData = data.map((d) => ({
    ...d,
    predictedFare:
      currentHour !== undefined && d.hour === currentHour && predictedFare !== undefined
        ? predictedFare
        : null,
  }));

  return (
    <Card className="rounded-lg border">
      <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
        <div>
          <CardTitle className="text-lg font-semibold">Average Fare by Hour</CardTitle>
          <CardDescription className="text-sm">
            Based on historical NYC taxi data, not your specific trip
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={displayData}
            layout="horizontal"
            margin={{ top: 10, right: 10, left: 40, bottom: 30 }}
          >
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 13, fill: colors.axisTick }}
              tickFormatter={(hour) => `${hour}:00`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="number"
              domain={[0, 'auto']}
              tick={{ fontSize: 13, fill: colors.axisTick }}
              tickFormatter={(value) => `$${value}`}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              formatter={(value: unknown, name: unknown) => {
                if (typeof value !== 'number') return ['', ''];
                const label = typeof name === 'string' ? name : 'avgFare';
                if (label === 'predictedFare') return [`$${value.toFixed(2)}`, 'Your trip'];
                return [`$${value.toFixed(2)}`, 'Average'];
              }}
              labelFormatter={(label: unknown) => {
                if (typeof label === 'object' && label && 'payload' in label) {
                  const payload = (label as { payload: unknown[] }).payload[0];
                  if (payload && typeof payload === 'object' && 'hour' in payload) {
                    const hour = (payload as { hour: number }).hour;
                    return `${hour}:00`;
                  }
                }
                return '';
              }}
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                background: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                padding: '12px 16px',
                fontSize: '13px',
                color: colors.tooltipText,
              }}
              wrapperStyle={{ outline: 'none' }}
            />
            <Bar dataKey="avgFare" fill={colors.barDefault} radius={[4, 4, 0, 0]} maxBarSize={30}>
              {displayData.map((entry, index) => {
                const isCurrentHour = currentHour !== undefined && entry.hour === currentHour;
                return (
                  <Cell
                    key={`bar-${index}`}
                    fill={isCurrentHour ? colors.barHighlight : colors.barDefault}
                    opacity={isCurrentHour ? 1 : 0.7}
                  />
                );
              })}
            </Bar>
            {currentHour !== undefined && predictedFare !== undefined && (
              <Bar
                dataKey="predictedFare"
                fill={colors.barHighlight}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
                opacity={0.6}
              >
                {displayData.map((entry, index) => {
                  const isCurrentHour = entry.hour === currentHour;
                  return (
                    <Cell
                      key={`pred-bar-${index}`}
                      fill={isCurrentHour ? colors.barHighlight : 'transparent'}
                      opacity={isCurrentHour ? 1 : 0}
                    />
                  );
                })}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>

        {currentHour !== undefined && predictedFare !== undefined && (
          <div className="flex items-center gap-3">
            <span className="bg-primary/10 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-sm text-primary">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              Your trip: {currentHour}:00 — ${predictedFare.toFixed(2)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
