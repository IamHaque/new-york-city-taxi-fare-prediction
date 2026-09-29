const CACHE = new Map<string, string>();
const INFLIGHT = new Map<string, AbortController>();
const REQUEST_QUEUE: Array<{
  key: string;
  controller: AbortController;
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
}> = [];
let isProcessing = false;
const USER_AGENT = 'NYC-Taxi-Fare-Predictor/1.0';

function cacheKey(lat: number, lon: number): string {
  return `${Math.round(lat * 10000)},${Math.round(lon * 10000)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processQueue(): Promise<void> {
  if (isProcessing || REQUEST_QUEUE.length === 0) return;
  isProcessing = true;

  while (REQUEST_QUEUE.length > 0) {
    const next = REQUEST_QUEUE.shift();
    if (!next) continue;

    const { key, controller, resolve, reject } = next;

    if (controller.signal.aborted) {
      continue;
    }

    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set(
        'lat',
        (Math.round((parseFloat(key.split(',')[0]) / 10000) * 100000) / 100000).toString()
      );
      url.searchParams.set(
        'lon',
        (Math.round((parseFloat(key.split(',')[1]) / 10000) * 100000) / 100000).toString()
      );
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('accept-language', 'en');

      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const address = formatAddress(data.address) || data.display_name || 'Address unavailable';
      CACHE.set(key, address);
      INFLIGHT.delete(key);
      resolve(address);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        INFLIGHT.delete(key);
        continue;
      }
      INFLIGHT.delete(key);
      reject(err instanceof Error ? err : new Error('Geocoding failed'));
    }

    await sleep(1100);
  }

  isProcessing = false;
}

function formatAddress(address: Record<string, string> | undefined): string | null {
  if (!address) return null;

  const parts: string[] = [];

  const street = [address.house_number, address.road].filter(Boolean).join(' ');
  if (street) parts.push(street);

  const neighborhood = address.neighbourhood || address.suburb || address.city_district;
  if (neighborhood && neighborhood !== address.city) parts.push(neighborhood);

  if (address.city) parts.push(address.city);
  else if (address.town) parts.push(address.town);
  else if (address.village) parts.push(address.village);

  const state = address.state || address.ISO3166_2_lvl4?.replace('US-', '');
  if (state) parts.push(state);

  if (address.postcode && address.postcode.length <= 5) parts.push(address.postcode);

  return parts.join(', ') || null;
}

function enqueue(key: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const existingController = INFLIGHT.get(key);
    if (existingController) {
      existingController.abort();
    }

    const controller = new AbortController();
    INFLIGHT.set(key, controller);

    const queueIndex = REQUEST_QUEUE.findIndex((q) => q.key === key);
    if (queueIndex !== -1) {
      REQUEST_QUEUE[queueIndex].controller.abort();
      REQUEST_QUEUE.splice(queueIndex, 1);
    }

    REQUEST_QUEUE.push({ key, controller, resolve, reject });
    processQueue();
  });
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const key = cacheKey(lat, lon);
  const cached = CACHE.get(key);
  if (cached) return cached;

  return enqueue(key);
}

export function clearGeocodingCache(): void {
  CACHE.clear();
  INFLIGHT.forEach((controller) => controller.abort());
  INFLIGHT.clear();
  REQUEST_QUEUE.length = 0;
}
