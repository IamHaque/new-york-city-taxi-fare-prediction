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
 * The server resolves each landmark name to coordinates itself (scripts/shared/landmarks.py)
 * and, when BOTH sides resolve, runs the same model inference /predict uses and includes
 * fare_amount/distance_km directly in this response. pickup_lat/pickup_lon/dropoff_lat/
 * dropoff_lon are therefore normally server-provided; enrichParsedTripWithCoordinates() in
 * utils/landmarks.ts only falls back to the client-side table when the server didn't supply them.
 *
 * pickup_resolved/dropoff_resolved report whether the server could resolve each landmark name at
 * all. When either is false, fare_amount/distance_km are absent and `warning` explains why —
 * the parsed time/passenger fields are still usable to pre-fill the form even when a location
 * couldn't be resolved.
 *
 * Time fields are `number | null`: the LLM only echoes values the description literally states
 * (null otherwise), the server completes them with the current date/time, and every field it
 * filled in that way is listed in assumed_time_fields so the UI can disclose the assumption
 * instead of silently showing a fabricated time. A response is therefore always either valid
 * values or null — never an out-of-range placeholder like 0.
 */
export interface ParsedTripDetails {
  pickup_landmark: string | null;
  dropoff_landmark: string | null;
  hour: number | null;
  day_of_week_num: number | null;
  month: number | null;
  year: number | null;
  passenger_count: number | null;
  assumed_time_fields?: string[];
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
