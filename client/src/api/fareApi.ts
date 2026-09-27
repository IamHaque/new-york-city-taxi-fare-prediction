import type { TripInput, PredictionResult, ParsedTripDetails } from '@/types/trip';

/**
 * Base URL for the Flask backend API.
 * Configured via VITE_API_BASE_URL environment variable (defaults to http://localhost:5000).
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

/**
 * Calls the Flask /predict endpoint with trip details and returns the model's fare estimate.
 * Distance is computed server-side, so only raw coordinates need to be sent here.
 */
export async function predictFare(trip: TripInput): Promise<PredictionResult> {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trip),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message ?? `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Calls the Flask /parse-trip endpoint to convert a natural language description
 * into structured trip data (Epic 5 stretch).
 */
export async function parseTrip(description: string): Promise<ParsedTripDetails> {
  const response = await fetch(`${API_BASE_URL}/parse-trip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message ?? `Request failed with status ${response.status}`);
  }

  return response.json();
}
