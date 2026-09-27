import { FareChart } from '@/components/FareChart/FareChart';

type Theme = 'light' | 'dark';

interface FareChartSectionProps {
  currentHour?: number;
  predictedFare?: number;
  theme: Theme;
}

export function FareChartSection({ currentHour, predictedFare, theme }: FareChartSectionProps) {
  return <FareChart currentHour={currentHour} predictedFare={predictedFare} theme={theme} />;
}
