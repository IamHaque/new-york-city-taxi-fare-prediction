import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

/**
 * ErrorBanner - displays an error message with an optional retry button.
 * Built from shadcn's Alert component.
 */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        <div className="flex items-center justify-between">
          <span>{message}</span>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}