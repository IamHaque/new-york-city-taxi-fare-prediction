import type { ParsedTripDetails } from '@/types/trip';

/**
 * Hardcoded landmark to coordinates lookup for NYC.
 * Used as fallback when LLM returns landmark names instead of coordinates.
 */
export const LANDMARK_COORDINATES: Record<string, [number, number]> = {
  'times square': [40.7580, -73.9855],
  'jfk airport': [40.6413, -73.7781],
  'la guardia airport': [40.7769, -73.8740],
  'newark airport': [40.6895, -74.1745],
  'central park': [40.7829, -73.9654],
  'empire state building': [40.7484, -73.9857],
  'statue of liberty': [40.6892, -74.0445],
  'brooklyn bridge': [40.7061, -73.9969],
  'wall street': [40.7069, -74.0090],
  'grand central': [40.7527, -73.9772],
  'penn station': [40.7505, -73.9934],
  'port authority': [40.7571, -73.9913],
  'bryant park': [40.7536, -73.9832],
  'rockefeller center': [40.7587, -73.9787],
  'madison square garden': [40.7505, -73.9934],
  'union square': [40.7359, -73.9911],
  'washington square park': [40.7308, -73.9973],
  'soho': [40.7233, -74.0030],
  'tribeca': [40.7195, -74.0089],
  'chinatown': [40.7158, -73.9968],
  'little italy': [40.7188, -73.9976],
  'greenwich village': [40.7346, -74.0035],
  'chelsea': [40.7465, -74.0014],
  'hells kitchen': [40.7635, -73.9917],
  'upper east side': [40.7736, -73.9566],
  'upper west side': [40.7870, -73.9754],
  'harlem': [40.8116, -73.9465],
  'bronx': [40.8448, -73.8648],
  'brooklyn': [40.6782, -73.9442],
  'queens': [40.7282, -73.7949],
  'staten island': [40.5795, -74.1502],
};

/**
 * Normalizes a landmark name for lookup (lowercase, trim).
 */
function normalizeLandmark(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Attempts to resolve a landmark name to coordinates.
 * Returns tuple [lat, lon] or null if not found.
 */
export function resolveLandmark(name: string): [number, number] | null {
  const normalized = normalizeLandmark(name);
  return LANDMARK_COORDINATES[normalized] ?? null;
}

/**
 * Enriches a ParsedTripDetails with coordinates by resolving landmarks.
 * If a landmark is not found, leaves the coordinate as undefined.
 */
export function enrichParsedTripWithCoordinates(parsed: ParsedTripDetails): ParsedTripDetails & {
  pickup_lat?: number;
  pickup_lon?: number;
  dropoff_lat?: number;
  dropoff_lon?: number;
} {
  const pickupCoords = resolveLandmark(parsed.pickup_landmark);
  const dropoffCoords = resolveLandmark(parsed.dropoff_landmark);

  return {
    ...parsed,
    pickup_lat: pickupCoords?.[0],
    pickup_lon: pickupCoords?.[1],
    dropoff_lat: dropoffCoords?.[0],
    dropoff_lon: dropoffCoords?.[1],
  };
}