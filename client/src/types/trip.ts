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
 * ParsedTripDetails - the shape of data returned from the Flask /parse-trip endpoint (Epic 5).
 * Optional coordinate fields are populated by frontend landmark lookup (Story 5.2).
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
}

/**
 * AvgFareByHour - static chart data shape for average fare by hour of day.
 */
export interface AvgFareByHour {
  hour: number;
  avgFare: number;
}
