import cityAverageFareData from '@/data/city_average_fare.json';
import { haversineKm, KM_TO_MILES, type Coordinate } from '@/utils/geo';
import { LANDMARK_COORDINATES } from '@/utils/landmarks';

/**
 * All of the client-side display math for the fare result card (PRD v4, Epic 5).
 *
 * Nothing here is a model output: the API returns only { fare_amount, distance_km }.
 * Everything else (comparison, likely range, breakdown, ETA) is an ILLUSTRATIVE
 * presentation-layer computation and is labeled as such in the UI.
 */

export { KM_TO_MILES };

/** Real mean fare from the generated chart data (client/src/data/city_average_fare.json). */
export const CITY_AVERAGE_FARE = (cityAverageFareData as { cityAverageFare: number })
  .cityAverageFare;

export interface FareComparison {
  /** fare_amount / CITY_AVERAGE_FARE */
  ratio: number;
  belowAverage: boolean;
  label: string;
}

/**
 * "1.8× the city average" when above, "Below the city average" when under.
 */
export function getFareComparison(fare: number): FareComparison {
  const ratio = fare / CITY_AVERAGE_FARE;
  const belowAverage = ratio < 1;
  return {
    ratio,
    belowAverage,
    label: belowAverage ? 'Below the city average' : `${ratio.toFixed(1)}× the city average`,
  };
}

export interface LikelyRange {
  low: number;
  high: number;
}

/**
 * Illustrative uncertainty band (fare × 0.9 → fare × 1.12) — NOT a model-calibrated
 * confidence interval; the model doesn't output one (see PRD v4 Non-Goals).
 */
export function getLikelyRange(fare: number): LikelyRange {
  return { low: fare * 0.9, high: fare * 1.12 };
}

/**
 * Mirrors scripts/shared/features.py's is_rush_hour:
 * weekdays (Mon=0..Fri=4) between 16:00 and 19:59.
 */
export function isRushHourWindow(hour: number, dayOfWeekNum: number): boolean {
  return hour >= 16 && hour < 20 && dayOfWeekNum <= 4;
}

const AIRPORT_RADIUS_KM = 2.5;

/**
 * Mirrors scripts/shared/features.py's is_jfk_trip / is_lga_trip: pickup or drop-off
 * within 2.5 km of JFK or LaGuardia (client-side haversine, same radius/threshold).
 */
export function isAirportTrip(pickup: Coordinate | null, dropoff: Coordinate | null): boolean {
  const jfk = LANDMARK_COORDINATES['jfk airport'];
  const lga = LANDMARK_COORDINATES['la guardia airport'];
  if (!jfk || !lga) return false;

  const airports: Coordinate[] = [
    { lat: jfk[0], lon: jfk[1] },
    { lat: lga[0], lon: lga[1] },
  ];

  return [pickup, dropoff].some(
    (point) =>
      point !== null && airports.some((airport) => haversineKm(point, airport) <= AIRPORT_RADIUS_KM)
  );
}

export interface BreakdownContext {
  fare: number;
  hour: number;
  dayOfWeekNum: number;
  pickup: Coordinate | null;
  dropoff: Coordinate | null;
}

export interface BreakdownSegment {
  label: string;
  /** Share of the total fare, 0–1. */
  share: number;
  amount: number;
}

export const BREAKDOWN_DISCLAIMER = "Estimated breakdown, not the model's internal calculation";

const RUSH_HOUR_SHARE = 0.12;
const AIRPORT_SHARE = 0.15;

/**
 * Illustrative proportional breakdown. The server computes is_rush_hour / is_overnight /
 * is_jfk_trip / is_lga_trip internally but never exposes them, so the client approximates
 * the same signals (same rules as features.py) to explain *why* a fare might be higher —
 * it never claims to be the model's actual internal computation.
 */
export function getFareBreakdown(context: BreakdownContext): BreakdownSegment[] {
  const { fare, hour, dayOfWeekNum, pickup, dropoff } = context;

  const rushAmount = isRushHourWindow(hour, dayOfWeekNum) ? fare * RUSH_HOUR_SHARE : 0;
  const airportAmount = isAirportTrip(pickup, dropoff) ? fare * AIRPORT_SHARE : 0;
  const baseAmount = Math.max(fare - rushAmount - airportAmount, 0);

  const segments: BreakdownSegment[] = [
    { label: 'Base + distance', share: baseAmount / fare, amount: baseAmount },
  ];
  if (rushAmount > 0) {
    segments.push({ label: 'Rush hour', share: rushAmount / fare, amount: rushAmount });
  }
  if (airportAmount > 0) {
    segments.push({ label: 'Airport trip', share: airportAmount / fare, amount: airportAmount });
  }
  return segments;
}

export interface SecondaryStats {
  distanceMiles: number;
  farePerMile: number | null;
  farePerRider: number;
  etaMinutes: number;
}

const RUSH_HOUR_MPH = 10;
const OFF_PEAK_MPH = 15;

/**
 * Distance in miles (distance_km × 0.621371), $/mile, $/rider, and an illustrative ETA
 * of distanceMiles / assumedMph × 60 where assumedMph is 10 inside the submitted trip's
 * rush-hour window and 15 otherwise — labeled "Estimated travel time" in the UI.
 */
export function getSecondaryStats(context: {
  fare: number;
  distanceKm: number;
  passengerCount: number;
  hour: number;
  dayOfWeekNum: number;
}): SecondaryStats {
  const { fare, distanceKm, passengerCount, hour, dayOfWeekNum } = context;
  const distanceMiles = distanceKm * KM_TO_MILES;
  const assumedMph = isRushHourWindow(hour, dayOfWeekNum) ? RUSH_HOUR_MPH : OFF_PEAK_MPH;

  return {
    distanceMiles,
    farePerMile: distanceMiles > 0.01 ? fare / distanceMiles : null,
    farePerRider: passengerCount > 0 ? fare / passengerCount : fare,
    etaMinutes: (distanceMiles / assumedMph) * 60,
  };
}
