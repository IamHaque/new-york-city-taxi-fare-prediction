import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import avgFareByHour from '@/data/avgFareByHour.json';
import type { AvgFareByHour } from '@/types/trip';

type Theme = 'light' | 'dark';

interface FareChartProps {
  currentHour?: number;
  predictedFare?: number;
  theme: Theme;
}

const THEME_COLORS: Record<
  Theme,
  {
    axisTick: string;
    barDefault: string;
    barHighlight: string;
    tooltipBg: string;
    tooltipBorder: string;
    tooltipText: string;
  }
> = {
  light: {
    axisTick: '#6b6f7a',
    barDefault: '#a0a4ae',
    barHighlight: '#6552d6',
    tooltipBg: '#ffffff',
    tooltipBorder: '#dcdad3',
    tooltipText: '#1b1e26',
  },
  dark: {
    axisTick: '#8d919c',
    barDefault: '#4a4d5a',
    barHighlight: '#7c6fe0',
    tooltipBg: '#1b1e26',
    tooltipBorder: '#2e323d',
    tooltipText: '#edebe3',
  },
};

export function FareChart({ currentHour, predictedFare, theme }: FareChartProps) {
  const data = avgFareByHour as AvgFareByHour[];
  const colors = THEME_COLORS[theme];

  const displayData = data.map((d) => ({
    ...d,
    predictedFare:
      currentHour !== undefined && d.hour === currentHour && predictedFare !== undefined
        ? predictedFare
        : null,
  }));

  return (
    <Card className="border-border/60 mt-8 rounded-lg border">
      <CardHeader className="flex flex-col items-start">
        <div className="flex w-full items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-2xl font-semibold">Average Fare by Hour</CardTitle>
        </div>
        <CardDescription className="text-sm">
          Based on historical NYC taxi data, not your specific trip
        </CardDescription>
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
