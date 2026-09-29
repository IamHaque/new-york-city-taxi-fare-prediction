import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface NoticeBannerProps {
  message: string;
}

/**
 * NoticeBanner - non-fatal, informational message (as opposed to ErrorBanner's failure state).
 * Used e.g. when /parse-trip parses successfully but couldn't resolve one of the two locations,
 * so the person still gets their partial result plus a clear next step, not a red error box.
 */
export function NoticeBanner({ message }: NoticeBannerProps) {
  return (
    <Alert variant="default">
      <Info className="h-4 w-4" />
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
