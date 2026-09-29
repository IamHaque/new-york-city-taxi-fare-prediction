/**
 * Shapes of the generated chart-data artifacts in client/src/data/ — all produced by
 * scripts/generate_chart_data.py from the real notebook/train.csv analysis (PRD v4, Epic 8),
 * never hand-typed.
 */

export interface RidesByDay {
  day: string;
  rides: number;
}

export interface RidesByHour {
  hour: number;
  rides: number;
}

export interface AvgFareByMonth {
  month: string;
  avgFare: number;
}

export interface FareDistributionBin {
  range: string;
  min: number;
  max: number;
  count: number;
}

export interface FareDistancePoint {
  distance_km: number;
  fare_amount: number;
}

export interface TopDropoffZone {
  label: string;
  lat: number;
  lon: number;
  rides: number;
  avgFare: number;
}

export interface ModelRmse {
  model: string;
  rmse: number;
}

export interface FeatureImportanceEntry {
  feature: string;
  importance: number;
}

/**
 * Live trip context the average-fare-by-hour chart highlights (your hour + predicted fare),
 * reported up from TripPlanner so App can pass it down to the dashboard below.
 */
export interface ChartContext {
  currentHour?: number;
  predictedFare?: number;
}
