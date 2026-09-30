import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { ParsedTripDetails, PredictionResult, TripInput } from '@/types/trip';
import { validateTripInputs, type ValidationErrors } from '@/utils/validators';
import { composeDateTime, decomposeDateTime } from '@/utils/dateTimeUtils';
import { enrichParsedTripWithCoordinates, resolveLandmark } from '@/utils/landmarks';
import { nearestLandmark, type Coordinate } from '@/utils/geo';
import { reverseGeocode } from '@/utils/geocoding';
import { parseTrip } from '@/api/fareApi';
import { useFarePrediction } from '@/hooks/useFarePrediction';
import { TripMap, type ActivePin } from '@/components/TripMap/TripMap';
import {
  TripInputCard,
  type AddressState,
  type FormState,
} from '@/components/TripInputCard/TripInputCard';
import { FareResultCard } from '@/components/FareResultCard/FareResultCard';
import {
  RecentEstimatesCard,
  type RecentEstimate,
} from '@/components/RecentEstimatesCard/RecentEstimatesCard';
import type { ChartContext } from '@/types/charts';

function toTripInputPartial(state: FormState): Partial<TripInput> {
  return {
    pickup_lat: state.pickup_lat === '' ? undefined : state.pickup_lat,
    pickup_lon: state.pickup_lon === '' ? undefined : state.pickup_lon,
    dropoff_lat: state.dropoff_lat === '' ? undefined : state.dropoff_lat,
    dropoff_lon: state.dropoff_lon === '' ? undefined : state.dropoff_lon,
    hour: state.hour === '' ? undefined : state.hour,
    day_of_week_num: state.day_of_week_num === '' ? undefined : state.day_of_week_num,
    month: state.month === '' ? undefined : state.month,
    year: state.year === '' ? undefined : state.year,
    passenger_count: state.passenger_count,
  };
}

function formStateToTripInput(state: FormState): TripInput {
  return {
    pickup_lat: state.pickup_lat as number,
    pickup_lon: state.pickup_lon as number,
    dropoff_lat: state.dropoff_lat as number,
    dropoff_lon: state.dropoff_lon as number,
    hour: state.hour as number,
    day_of_week_num: state.day_of_week_num as number,
    month: state.month as number,
    year: state.year as number,
    passenger_count: state.passenger_count,
  };
}

/** Valid ints only (mirrors validateTripInputs' ranges); anything else — null, '' , 0-out-of-
 * range, NaN from a bad response — comes back null instead of poisoning the form. */
function validInt(value: number | null | undefined, low: number, high: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high
    ? Math.trunc(value)
    : null;
}

/**
 * Maps a /parse-trip response onto full form state.
 *
 * Invariants (PRD v5 follow-up):
 *  - The datetime input is ALWAYS rebuilt from the final hour/dow/month/year values via
 *    composeDateTime, so it can never disagree with the decomposed fields next to it.
 *  - Valid time fields in the response win; fields it didn't carry keep `current` values
 *    (falling back to now when `current` holds an empty/invalid entry).
 *  - A response with NO usable time resets the time fields to now instead of leaving the
 *    previous trip's time on screen.
 */
function parsedTripToFormState(parsed: ParsedTripDetails, current: FormState): FormState {
  const hour = validInt(parsed.hour, 0, 23);
  const dayOfWeekNum = validInt(parsed.day_of_week_num, 0, 6);
  const month = validInt(parsed.month, 1, 12);
  const year = validInt(parsed.year, 1900, 2100);

  const nowFields = getDefaultTimeFields();
  const hasAnyTime = hour !== null || dayOfWeekNum !== null || month !== null || year !== null;

  const merged: Pick<TripInput, 'hour' | 'day_of_week_num' | 'month' | 'year'> = hasAnyTime
    ? {
        hour: hour ?? (typeof current.hour === 'number' ? current.hour : nowFields.hour),
        day_of_week_num:
          dayOfWeekNum ??
          (typeof current.day_of_week_num === 'number'
            ? current.day_of_week_num
            : nowFields.day_of_week_num),
        month: month ?? (typeof current.month === 'number' ? current.month : nowFields.month),
        year: year ?? (typeof current.year === 'number' ? current.year : nowFields.year),
      }
    : nowFields; // reset: no usable time in the response -> current date/time

  return {
    pickup_lat: parsed.pickup_lat ?? '',
    pickup_lon: parsed.pickup_lon ?? '',
    dropoff_lat: parsed.dropoff_lat ?? '',
    dropoff_lon: parsed.dropoff_lon ?? '',
    datetime: composeDateTime(merged.year, merged.month, merged.day_of_week_num, merged.hour),
    ...merged,
    passenger_count: validInt(parsed.passenger_count, 1, 6) ?? current.passenger_count,
  };
}

/** Rebuilds full form state (incl. the datetime input) from a stored recent-estimate input. */
function tripToFormState(trip: TripInput): FormState {
  return {
    pickup_lat: trip.pickup_lat,
    pickup_lon: trip.pickup_lon,
    dropoff_lat: trip.dropoff_lat,
    dropoff_lon: trip.dropoff_lon,
    datetime: composeDateTime(trip.year, trip.month, trip.day_of_week_num, trip.hour),
    hour: trip.hour,
    day_of_week_num: trip.day_of_week_num,
    month: trip.month,
    year: trip.year,
    passenger_count: trip.passenger_count,
  };
}

function getDefaultDatetime(): string {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
  return now.toISOString().slice(0, 16);
}

function getDefaultTimeFields(): Pick<TripInput, 'hour' | 'day_of_week_num' | 'month' | 'year'> {
  return decomposeDateTime(getDefaultDatetime());
}

const EMPTY_ADDRESS: AddressState = { value: '', loading: false, error: false };

/** Human labels for assumed_time_fields keys in the /parse-trip disclosure notice. */
const TIME_FIELD_LABELS: Record<string, string> = {
  hour: 'hour',
  day_of_week_num: 'day of week',
  month: 'month',
  year: 'year',
};

/**
 * Session-history ceiling for recent estimates — the card shows the first few inline and the
 * rest behind "See more", but never stores more than this (list is session-only, newest first).
 */
const MAX_RECENT_ESTIMATES = 50;

/** Two estimates are "the same trip" when every model input matches (labels/fare/time may differ). */
function tripsEqual(a: TripInput, b: TripInput): boolean {
  return (
    a.pickup_lat === b.pickup_lat &&
    a.pickup_lon === b.pickup_lon &&
    a.dropoff_lat === b.dropoff_lat &&
    a.dropoff_lon === b.dropoff_lon &&
    a.hour === b.hour &&
    a.day_of_week_num === b.day_of_week_num &&
    a.month === b.month &&
    a.year === b.year &&
    a.passenger_count === b.passenger_count
  );
}

/**
 * TripPlanner - the app's two-column, map-as-hero shell (PRD v4, Epic 2).
 *
 * Owns every piece of state the old TripDetails.tsx held (form values/errors/touched,
 * prediction lifecycle, parsed-trip prefill) plus the state Epics 3-6 lifted up: the active
 * pin (shared by the map's floating switch and the rail's location rows), reverse-geocoded
 * addresses, and the session-only recent-estimates list. Children are presentational and
 * emit events; this component wires them together.
 */
interface TripPlannerProps {
  /** Reports the live trip context ("your hour" + predicted fare) up to App for the insights
   * dashboard's average-fare-by-hour chart, which renders below this planner. */
  onChartContextChange?: (context: ChartContext) => void;
}

export function TripPlanner({ onChartContextChange }: TripPlannerProps) {
  const { predict, applyResult, isLoading, error, result } = useFarePrediction();

  const defaultTimeFields = getDefaultTimeFields();

  const [values, setValues] = useState<FormState>({
    pickup_lat: '',
    pickup_lon: '',
    dropoff_lat: '',
    dropoff_lon: '',
    datetime: getDefaultDatetime(),
    hour: defaultTimeFields.hour,
    day_of_week_num: defaultTimeFields.day_of_week_num,
    month: defaultTimeFields.month,
    year: defaultTimeFields.year,
    passenger_count: 1,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof TripInput | 'datetime', boolean>>>(
    {}
  );

  const [activePin, setActivePin] = useState<ActivePin>('pickup');
  const [pickupAddress, setPickupAddress] = useState<AddressState>(EMPTY_ADDRESS);
  const [dropoffAddress, setDropoffAddress] = useState<AddressState>(EMPTY_ADDRESS);

  const [isParsing, setIsParsing] = useState(false);
  const [describeError, setDescribeError] = useState<string | null>(null);
  const [describeNotice, setDescribeNotice] = useState<string | null>(null);

  const [lastTrip, setLastTrip] = useState<TripInput | null>(null);
  const [recentEstimates, setRecentEstimates] = useState<RecentEstimate[]>([]);

  const pickupCoord: Coordinate | null =
    values.pickup_lat !== '' && values.pickup_lon !== ''
      ? { lat: values.pickup_lat, lon: values.pickup_lon }
      : null;
  const dropoffCoord: Coordinate | null =
    values.dropoff_lat !== '' && values.dropoff_lon !== ''
      ? { lat: values.dropoff_lat, lon: values.dropoff_lon }
      : null;

  // ---- Reverse geocoding (address labels) -------------------------------------
  // Fetched reactively whenever a pin's coordinates change, so every path that sets a pin
  // (map click, drag, landmark chip, text parse, recent-estimate reselect) gets a label,
  // and clearing a pin clears its label. Sequence guards drop out-of-order responses.

  const pickupGeoSeq = useRef(0);
  const dropoffGeoSeq = useRef(0);

  const fetchPickupAddress = useCallback(async (coord: Coordinate) => {
    const seq = ++pickupGeoSeq.current;
    setPickupAddress((prev) => ({ ...prev, loading: true, error: false }));
    try {
      const addr = await reverseGeocode(coord.lat, coord.lon);
      if (seq !== pickupGeoSeq.current) return;
      setPickupAddress({ value: addr, loading: false, error: false });
    } catch {
      if (seq === pickupGeoSeq.current) {
        setPickupAddress((prev) => ({ ...prev, loading: false, error: true }));
      }
    }
  }, []);

  const fetchDropoffAddress = useCallback(async (coord: Coordinate) => {
    const seq = ++dropoffGeoSeq.current;
    setDropoffAddress((prev) => ({ ...prev, loading: true, error: false }));
    try {
      const addr = await reverseGeocode(coord.lat, coord.lon);
      if (seq !== dropoffGeoSeq.current) return;
      setDropoffAddress({ value: addr, loading: false, error: false });
    } catch {
      if (seq === dropoffGeoSeq.current) {
        setDropoffAddress((prev) => ({ ...prev, loading: false, error: true }));
      }
    }
  }, []);

  const pickupLat = values.pickup_lat;
  const pickupLon = values.pickup_lon;
  const dropoffLat = values.dropoff_lat;
  const dropoffLon = values.dropoff_lon;

  useEffect(() => {
    if (pickupLat === '' || pickupLon === '') {
      pickupGeoSeq.current += 1; // invalidate any in-flight lookup for the old pin
      setPickupAddress(EMPTY_ADDRESS);
      return;
    }
    void fetchPickupAddress({ lat: pickupLat, lon: pickupLon });
  }, [pickupLat, pickupLon, fetchPickupAddress]);

  useEffect(() => {
    if (dropoffLat === '' || dropoffLon === '') {
      dropoffGeoSeq.current += 1;
      setDropoffAddress(EMPTY_ADDRESS);
      return;
    }
    void fetchDropoffAddress({ lat: dropoffLat, lon: dropoffLon });
  }, [dropoffLat, dropoffLon, fetchDropoffAddress]);

  function handleRetryAddress(side: 'pickup' | 'dropoff') {
    const coord = side === 'pickup' ? pickupCoord : dropoffCoord;
    if (!coord) return;
    if (side === 'pickup') void fetchPickupAddress(coord);
    else void fetchDropoffAddress(coord);
  }

  // ---- Recent estimates -------------------------------------------------------

  function appendRecentEstimate(trip: TripInput, prediction: PredictionResult) {
    const pickupLabel =
      pickupAddress.value ||
      nearestLandmark({ lat: trip.pickup_lat, lon: trip.pickup_lon }) ||
      'Custom pin';
    const dropoffLabel =
      dropoffAddress.value ||
      nearestLandmark({ lat: trip.dropoff_lat, lon: trip.dropoff_lon }) ||
      'Custom pin';

    const item: RecentEstimate = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      pickupLabel,
      dropoffLabel,
      fare_amount: prediction.fare_amount,
      distance_km: prediction.distance_km,
      submittedAt: Date.now(),
      trip,
    };
    // Upsert by payload: re-estimating the same trip (Predict Fare twice, re-parsing the same
    // description, clicking an existing recent row, drag back to a previous spot, retry)
    // refreshes that entry — fresh fare/time — and moves it to the top instead of duplicating.
    setRecentEstimates((prev) =>
      [item, ...prev.filter((existing) => !tripsEqual(existing.trip, trip))].slice(
        0,
        MAX_RECENT_ESTIMATES
      )
    );
  }

  function handleSelectRecent(item: RecentEstimate) {
    if (isLoading) return;
    const formState = tripToFormState(item.trip);
    setValues(formState);
    setErrors({});
    setTouched({});
    void runEstimate(formState);
  }

  // ---- Estimate plumbing ------------------------------------------------------

  /**
   * The single "run the fare model" path shared by submit, drag-re-estimate, text-parse
   * auto-estimate, and recent-estimate reselect (PRD v4 Stories 4.2, 4.3, 6.1).
   */
  async function runEstimate(base: FormState): Promise<boolean> {
    if (isLoading) return false;

    const validation = validateTripInputs(toTripInputPartial(base));
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return false;
    }

    const trip = formStateToTripInput(base);
    setLastTrip(trip);
    const prediction = await predict(trip);
    if (prediction) appendRecentEstimate(trip, prediction);
    return prediction !== null;
  }

  async function handleRetry() {
    if (!lastTrip || isLoading) return;
    const prediction = await predict(lastTrip);
    if (prediction) appendRecentEstimate(lastTrip, prediction);
  }

  // ---- Pin changes (map click / drag / clear / landmark chip) -----------------

  function handlePickupChange(coord: Coordinate | null, reestimate?: boolean) {
    // Functional update: never clobbers other fields, even if this fires in the same batch
    // as another setValues (the old spread-of-stale-values bug behind "Clear pins" only
    // clearing the dropoff).
    setValues((prev) =>
      coord
        ? { ...prev, pickup_lat: coord.lat, pickup_lon: coord.lon }
        : { ...prev, pickup_lat: '', pickup_lon: '' }
    );
    if (coord) setTouched((prev) => ({ ...prev, pickup_lat: true, pickup_lon: true }));

    const next: FormState = coord
      ? { ...values, pickup_lat: coord.lat, pickup_lon: coord.lon }
      : { ...values, pickup_lat: '', pickup_lon: '' };
    setErrors(validateTripInputs(toTripInputPartial(next)));

    // Drag → re-estimate only when both pins exist (Story 4.3's gate); a plain click or a
    // clear just updates the pins and waits for an explicit submit.
    const bothPinsSet = next.pickup_lat !== '' && next.dropoff_lat !== '';
    if (reestimate && bothPinsSet) void runEstimate(next);
  }

  function handleDropoffChange(coord: Coordinate | null, reestimate?: boolean) {
    setValues((prev) =>
      coord
        ? { ...prev, dropoff_lat: coord.lat, dropoff_lon: coord.lon }
        : { ...prev, dropoff_lat: '', dropoff_lon: '' }
    );
    if (coord) setTouched((prev) => ({ ...prev, dropoff_lat: true, dropoff_lon: true }));

    const next: FormState = coord
      ? { ...values, dropoff_lat: coord.lat, dropoff_lon: coord.lon }
      : { ...values, dropoff_lat: '', dropoff_lon: '' };
    setErrors(validateTripInputs(toTripInputPartial(next)));

    const bothPinsSet = next.pickup_lat !== '' && next.dropoff_lat !== '';
    if (reestimate && bothPinsSet) void runEstimate(next);
  }

  /**
   * "Clear pins" — one atomic setValues wiping BOTH sides (plus validation state), so the
   * pickup can't survive the clear the way it did when this went through two sequential
   * per-side handlers that each closed over the same stale `values`.
   */
  function handleClearPins() {
    if (isLoading) return;
    setValues((prev) => ({
      ...prev,
      pickup_lat: '',
      pickup_lon: '',
      dropoff_lat: '',
      dropoff_lon: '',
    }));
    setErrors({});
    setTouched({});
  }

  function handleLandmarkClick(name: string) {
    if (isLoading) return;
    const coords = resolveLandmark(name);
    if (!coords) return;
    const coord: Coordinate = { lat: coords[0], lon: coords[1] };
    if (activePin === 'pickup') handlePickupChange(coord);
    else handleDropoffChange(coord);
  }

  // ---- Describe-your-trip (text → parse → auto-estimate, Story 4.2) -----------

  async function handleEstimateFromText(description: string) {
    const trimmed = description.trim();
    if (!trimmed || isParsing) return;

    setIsParsing(true);
    setDescribeError(null);
    setDescribeNotice(null);

    try {
      const parsed = await parseTrip(trimmed);
      const enriched = enrichParsedTripWithCoordinates(parsed);

      // Prefill map + form BEFORE any early return, so the unresolved-landmark warning path
      // also fills what did parse. parsedTripToFormState rebuilds the datetime input from the
      // returned time fields, keeping the datetime string and the hour/dow/month/year fields
      // in lockstep (valid response -> updated; no usable time -> reset to now).
      const formState = parsedTripToFormState(enriched, values);
      setValues(formState);
      setErrors({});
      setTouched({});

      // Assumed-time disclosure (server listed every field it filled with the current date).
      const assumedFields = parsed.assumed_time_fields ?? [];
      const assumptionNote =
        assumedFields.length > 0
          ? `No time stated in the text - filled in with the current date/time for ${assumedFields
              .map((field) => TIME_FIELD_LABELS[field] ?? field)
              .join(', ')}.`
          : null;

      const pickupOk =
        typeof enriched.pickup_lat === 'number' && typeof enriched.pickup_lon === 'number';
      const dropoffOk =
        typeof enriched.dropoff_lat === 'number' && typeof enriched.dropoff_lon === 'number';

      if (!pickupOk || !dropoffOk) {
        // The real landmark-coverage limitation (PRD v4 §1): explain which side failed and
        // ask for a manual pin instead of silently doing nothing. Names can be null when the
        // description had no recognizable place for that side — say "pickup location" then
        // rather than printing the string "null". The client-built error supersedes the
        // server's `warning` here (it names the side AND the unrecognized text), so only the
        // assumption disclosure rides along in the notice.
        const missing: string[] = [];
        if (!pickupOk) {
          missing.push(
            parsed.pickup_landmark ? `pickup "${parsed.pickup_landmark}"` : 'pickup location'
          );
        }
        if (!dropoffOk) {
          missing.push(
            parsed.dropoff_landmark ? `drop-off "${parsed.dropoff_landmark}"` : 'drop-off location'
          );
        }
        setDescribeError(
          `Couldn't resolve the ${missing.join(' or the ')}. Place that pin on the map manually — the rest of your trip is filled in.`
        );
        if (assumptionNote) setDescribeNotice(assumptionNote);
        return;
      }

      // Both sides resolved: surface any server warning (only possible if the server and
      // client landmark tables disagree) plus the assumed-time disclosure — never both
      // warning texts at once.
      const notes: string[] = [];
      if (parsed.warning) notes.push(parsed.warning);
      if (assumptionNote) notes.push(assumptionNote);
      if (notes.length > 0) setDescribeNotice(notes.join(' '));

      const trip = formStateToTripInput(formState);
      setLastTrip(trip);

      if (typeof parsed.fare_amount === 'number' && typeof parsed.distance_km === 'number') {
        // /parse-trip already ran the model server-side — show it directly instead of a
        // redundant second /predict for the same trip.
        const prediction: PredictionResult = {
          fare_amount: parsed.fare_amount,
          distance_km: parsed.distance_km,
        };
        applyResult(prediction);
        appendRecentEstimate(trip, prediction);
      } else {
        // Both landmarks resolved but no fare came back — estimate immediately (Story 4.2).
        const prediction = await predict(trip);
        if (prediction) appendRecentEstimate(trip, prediction);
      }
    } catch (err) {
      setDescribeError(
        err instanceof Error
          ? err.message
          : 'Could not understand that trip description. Please fill the form manually.'
      );
    } finally {
      setIsParsing(false);
    }
  }

  // ---- Form field handlers (moved unchanged from TripDetails.tsx) -------------

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    const tripField = field as keyof TripInput;
    if (touched[tripField]) {
      const validation = validateTripInputs(toTripInputPartial({ ...values, [field]: value }));
      setErrors(validation);
    }
  }

  function handleBlur(field: keyof TripInput | 'datetime') {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const validation = validateTripInputs(toTripInputPartial(values));
    setErrors(validation);
  }

  function handleDateTimeChange(value: string) {
    setValues((prev) => ({ ...prev, datetime: value }));
    if (value) {
      const { hour, day_of_week_num, month, year } = decomposeDateTime(value);
      setValues((prev) => ({ ...prev, hour, day_of_week_num, month, year }));
      if (touched.hour || touched.day_of_week_num || touched.month || touched.year) {
        const validation = validateTripInputs(
          toTripInputPartial({ ...values, hour, day_of_week_num, month, year })
        );
        setErrors(validation);
      }
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validation = validateTripInputs(toTripInputPartial(values));

    const fieldsToTouch: Partial<Record<keyof TripInput | 'datetime', boolean>> = {};
    for (const key of Object.keys(validation) as (keyof TripInput)[]) {
      fieldsToTouch[key] = true;
    }

    const requiredFields: (keyof TripInput)[] = [
      'pickup_lat',
      'pickup_lon',
      'dropoff_lat',
      'dropoff_lon',
      'hour',
      'day_of_week_num',
      'month',
      'year',
    ];
    for (const key of requiredFields) {
      const val = values[key];
      if (val === '' || val === undefined) {
        fieldsToTouch[key] = true;
      }
    }

    setTouched((prev) => ({ ...prev, ...fieldsToTouch }));
    setErrors(validation);

    if (Object.keys(validation).length === 0) {
      void runEstimate(values);
    }
  }

  // ---- Parsed-trip prefill happens inline in handleEstimateFromText --------------

  const displayHour = typeof values.hour === 'number' ? values.hour : undefined;

  // Keep the insights dashboard's FareChart "Your trip" overlay in sync with this planner.
  useEffect(() => {
    onChartContextChange?.({
      currentHour: displayHour,
      predictedFare: result?.fare_amount,
    });
  }, [displayHour, result, onChartContextChange]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <TripMap
          pickup={pickupCoord}
          dropoff={dropoffCoord}
          onPickupChange={handlePickupChange}
          onDropoffChange={handleDropoffChange}
          onClearPins={handleClearPins}
          activePin={activePin}
          onActivePinChange={setActivePin}
          disabled={isLoading}
        />

        <div className="space-y-5">
          <TripInputCard
            values={values}
            errors={errors}
            activePin={activePin}
            pickupAddress={pickupAddress}
            dropoffAddress={dropoffAddress}
            disabled={isLoading}
            isLoading={isLoading}
            isParsing={isParsing}
            describeError={describeError}
            describeNotice={describeNotice}
            onChange={handleChange}
            onBlur={handleBlur}
            onDateTimeChange={handleDateTimeChange}
            onActivePinChange={setActivePin}
            onLandmarkClick={handleLandmarkClick}
            onEstimateFromText={(d) => void handleEstimateFromText(d)}
            onRetryAddress={handleRetryAddress}
            onSubmit={handleSubmit}
          />

          <FareResultCard
            result={result}
            isLoading={isLoading}
            error={error}
            trip={lastTrip}
            onRetry={lastTrip ? () => void handleRetry() : undefined}
          />

          <RecentEstimatesCard items={recentEstimates} onSelect={handleSelectRecent} />
        </div>
      </div>
    </div>
  );
}
