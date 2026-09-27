import type { TripInput } from '@/types/trip';

// Pulled directly from the case study's own NYC bounding box used during model training
export const NYC_LAT_MIN = 40.5;
export const NYC_LAT_MAX = 40.9;
export const NYC_LON_MIN = -74.3;
export const NYC_LON_MAX = -73.7;
export const MIN_PASSENGERS = 1;
export const MAX_PASSENGERS = 6;

export type ValidationErrors = Partial<Record<keyof TripInput, string>>;

/**
 * Validates raw trip form values against the same bounds the model was trained within.
 * Returns an empty object when fully valid.
 */
export function validateTripInputs(values: Partial<TripInput>): ValidationErrors {
  const errors: ValidationErrors = {};

  if (values.pickup_lat === undefined || values.pickup_lat === null) {
    errors.pickup_lat = 'Pickup latitude is required';
  } else if (values.pickup_lat < NYC_LAT_MIN || values.pickup_lat > NYC_LAT_MAX) {
    errors.pickup_lat = `Latitude must be between ${NYC_LAT_MIN} and ${NYC_LAT_MAX} for NYC pickups`;
  }

  if (values.pickup_lon === undefined || values.pickup_lon === null) {
    errors.pickup_lon = 'Pickup longitude is required';
  } else if (values.pickup_lon < NYC_LON_MIN || values.pickup_lon > NYC_LON_MAX) {
    errors.pickup_lon = `Longitude must be between ${NYC_LON_MIN} and ${NYC_LON_MAX} for NYC pickups`;
  }

  if (values.dropoff_lat === undefined || values.dropoff_lat === null) {
    errors.dropoff_lat = 'Dropoff latitude is required';
  } else if (values.dropoff_lat < NYC_LAT_MIN || values.dropoff_lat > NYC_LAT_MAX) {
    errors.dropoff_lat = `Latitude must be between ${NYC_LAT_MIN} and ${NYC_LAT_MAX} for NYC dropoffs`;
  }

  if (values.dropoff_lon === undefined || values.dropoff_lon === null) {
    errors.dropoff_lon = 'Dropoff longitude is required';
  } else if (values.dropoff_lon < NYC_LON_MIN || values.dropoff_lon > NYC_LON_MAX) {
    errors.dropoff_lon = `Longitude must be between ${NYC_LON_MIN} and ${NYC_LON_MAX} for NYC dropoffs`;
  }

  if (values.hour === undefined || values.hour === null) {
    errors.hour = 'Hour is required';
  } else if (values.hour < 0 || values.hour > 23) {
    errors.hour = 'Hour must be between 0 and 23';
  }

  if (values.day_of_week_num === undefined || values.day_of_week_num === null) {
    errors.day_of_week_num = 'Day of week is required';
  } else if (values.day_of_week_num < 0 || values.day_of_week_num > 6) {
    errors.day_of_week_num = 'Day of week must be between 0 (Monday) and 6 (Sunday)';
  }

  if (values.month === undefined || values.month === null) {
    errors.month = 'Month is required';
  } else if (values.month < 1 || values.month > 12) {
    errors.month = 'Month must be between 1 and 12';
  }

  if (values.passenger_count === undefined || values.passenger_count === null) {
    errors.passenger_count = 'Passenger count is required';
  } else if (values.passenger_count < MIN_PASSENGERS || values.passenger_count > MAX_PASSENGERS) {
    errors.passenger_count = `Passenger count must be between ${MIN_PASSENGERS} and ${MAX_PASSENGERS}`;
  }

  return errors;
}
