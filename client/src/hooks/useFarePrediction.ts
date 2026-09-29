import { useState } from 'react';
import type { TripInput, PredictionResult } from '@/types/trip';
import { predictFare } from '@/api/fareApi';

interface UseFarePredictionResult {
  predict: (trip: TripInput) => Promise<void>;
  applyResult: (result: PredictionResult) => void;
  isLoading: boolean;
  error: string | null;
  result: PredictionResult | null;
}

/**
 * Encapsulates calling /predict and tracking loading/error/result state,
 * so App.tsx stays declarative and components don't manage fetch lifecycles individually.
 */
export function useFarePrediction(): UseFarePredictionResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);

  async function predict(trip: TripInput) {
    setIsLoading(true);
    setError(null);
    try {
      const data = await predictFare(trip);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Applies a prediction that was already computed server-side elsewhere — specifically,
   * /parse-trip now runs the model itself when both landmarks resolve, so the client shouldn't
   * fire a second /predict call just to get the same number again.
   */
  function applyResult(result: PredictionResult) {
    setError(null);
    setResult(result);
  }

  return { predict, applyResult, isLoading, error, result };
}
