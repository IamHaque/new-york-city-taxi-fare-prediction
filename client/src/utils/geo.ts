import { LANDMARK_COORDINATES } from '@/utils/landmarks';

export interface Coordinate {
  lat: number;
  lon: number;
}

const EARTH_RADIUS_KM = 6371.0;
export const KM_TO_MILES = 0.621371;

/**
 * Great-circle distance in kilometers (haversine).
 *
 * This is display/UX math only — it mirrors the server-side haversine in
 * scripts/shared/features.py (same radius), but the `distance_km` returned by /predict
 * remains the source of truth for anything shown in the fare result card.
 */
export function haversineKm(a: Coordinate, b: Coordinate): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Great-circle distance in statute miles (US-audience display unit). */
export function haversineMiles(a: Coordinate, b: Coordinate): number {
  return haversineKm(a, b) * KM_TO_MILES;
}

function titleCase(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Nearest entry in LANDMARK_COORDINATES within ~0.01 degrees of the given coordinate,
 * title-cased, or null when nothing is that close. Used to label reverse-geocode-less
 * pins (recent estimates, drop-off buckets) with a real place name — no neighborhood
 * boundaries are invented when the tolerance isn't met.
 */
export function nearestLandmark(coord: Coordinate, toleranceDeg = 0.01): string | null {
  let bestName: string | null = null;
  let bestDist = toleranceDeg;

  for (const [name, [lat, lon]] of Object.entries(LANDMARK_COORDINATES)) {
    const dist = Math.hypot(coord.lat - lat, coord.lon - lon);
    if (dist <= bestDist) {
      bestDist = dist;
      bestName = name;
    }
  }

  return bestName ? titleCase(bestName) : null;
}
