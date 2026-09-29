/**
 * TripInput - the shape of data sent to the Flask /predict endpoint.
 * All fields are required by the backend.
 */
export interface TripInput {
  pickup_lat: number;
  pickup_lon: number;
  dropoff_lat: number;
  dropoff_lon: number;
  hour: number; // 0-23
  day_of_week_num: number; // 0 (Mon) - 6 (Sun), matches Python's datetime.dayofweek
  month: number; // 1-12
  year: number;
  passenger_count: number; // 1-6
}

/**
 * PredictionResult - the shape of data returned from the Flask /predict endpoint.
 */
export interface PredictionResult {
  fare_amount: number;
  distance_km: number;
}

/**
 * ParsedTripDetails - the shape of data returned from the Flask /parse-trip endpoint.
 *
 * The server now resolves each landmark name to coordinates itself (scripts/shared/landmarks.py)
 * and, when BOTH sides resolve, runs the same model inference /predict uses and includes
 * fare_amount/distance_km directly in this response. pickup_lat/pickup_lon/dropoff_lat/
 * dropoff_lon are therefore normally server-provided; enrichParsedTripWithCoordinates() in
 * utils/landmarks.ts only falls back to the client-side table when the server didn't supply them.
 *
 * pickup_resolved/dropoff_resolved report whether the server could resolve each landmark name at
 * all. When either is false, fare_amount/distance_km are absent and `warning` explains why —
 * the parsed time/passenger fields are still usable to pre-fill the form even when a location
 * couldn't be resolved.
 */
export interface ParsedTripDetails {
  pickup_landmark: string;
  dropoff_landmark: string;
  hour: number;
  day_of_week_num: number;
  month: number;
  year: number;
  passenger_count: number;
  pickup_lat?: number;
  pickup_lon?: number;
  dropoff_lat?: number;
  dropoff_lon?: number;
  pickup_resolved?: boolean;
  dropoff_resolved?: boolean;
  fare_amount?: number;
  distance_km?: number;
  warning?: string;
}

/**
 * AvgFareByHour - static chart data shape for average fare by hour of day.
 */
export interface AvgFareByHour {
  hour: number;
  avgFare: number;
}
