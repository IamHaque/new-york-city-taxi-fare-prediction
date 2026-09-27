import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MapPin, Clock, Users, DollarSign } from 'lucide-react';
import type { TripInput, ParsedTripDetails, PredictionResult } from '@/types/trip';
import { validateTripInputs } from '@/utils/validators';
import { decomposeDateTime } from '@/utils/dateTimeUtils';
import { enrichParsedTripWithCoordinates } from '@/utils/landmarks';
import { PassengerStepper } from '@/components/shared/PassengerStepper';
import { InputModeToggle } from '@/components/shared/InputModeToggle';
import { NaturalLanguageInput } from '@/components/NaturalLanguageInput/NaturalLanguageInput';
import { TripMap, type Coordinate } from '@/components/TripMap/TripMap';
import { FareChartSection } from '@/components/FareChartSection/FareChartSection';
import { useTheme } from '@/context/ThemeProvider';

interface TripDetailsProps {
  onSubmit: (trip: TripInput) => void;
  disabled?: boolean;
  initialValues?: Partial<ParsedTripDetails>;
  mode: 'manual' | 'describe';
  onModeChange: (mode: 'manual' | 'describe') => void;
  onParsedTrip?: (trip: ParsedTripDetails) => void;
  result?: PredictionResult | null;
  isLoading?: boolean;
}

interface FormState {
  pickup_lat: number | '';
  pickup_lon: number | '';
  dropoff_lat: number | '';
  dropoff_lon: number | '';
  datetime: string;
  hour: number | '';
  day_of_week_num: number | '';
  month: number | '';
  year: number | '';
  passenger_count: number;
}

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

function parsedTripToFormState(parsed: ParsedTripDetails): FormState {
  const now = new Date();
  const date = new Date(now.getFullYear(), parsed.month - 1, 1);
  const targetJsDay = (parsed.day_of_week_num + 1) % 7;
  const firstDayJsDay = date.getDay();
  const offset = (targetJsDay - firstDayJsDay + 7) % 7;
  date.setDate(date.getDate() + offset);
  date.setHours(parsed.hour, 0, 0, 0);

  const datetime = date.toISOString().slice(0, 16);

  return {
    pickup_lat: parsed.pickup_lat ?? '',
    pickup_lon: parsed.pickup_lon ?? '',
    dropoff_lat: parsed.dropoff_lat ?? '',
    dropoff_lon: parsed.dropoff_lon ?? '',
    datetime,
    hour: parsed.hour,
    day_of_week_num: parsed.day_of_week_num,
    month: parsed.month,
    year: parsed.year,
    passenger_count: parsed.passenger_count,
  };
}

function getDefaultDatetime(): string {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
  return now.toISOString().slice(0, 16);
}

function getDefaultTimeFields(): Pick<FormState, 'hour' | 'day_of_week_num' | 'month' | 'year'> {
  return decomposeDateTime(getDefaultDatetime());
}

export function TripDetails({
  onSubmit,
  disabled,
  initialValues,
  mode,
  onModeChange,
  onParsedTrip,
  result,
  isLoading,
}: TripDetailsProps) {
  const { theme } = useTheme();
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
  const [errors, setErrors] = useState<Partial<Record<keyof TripInput, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof TripInput | 'datetime', boolean>>>({});

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      const enriched = enrichParsedTripWithCoordinates(initialValues as ParsedTripDetails);
      const formState = parsedTripToFormState(enriched);
      setValues(formState);
      setErrors({});
      setTouched({});
    }
  }, [initialValues]);

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

  function handlePickupMapChange(coord: Coordinate) {
    setValues((prev) => ({ ...prev, pickup_lat: coord.lat, pickup_lon: coord.lon }));
    setTouched((prev) => ({ ...prev, pickup_lat: true, pickup_lon: true }));
    const validation = validateTripInputs(
      toTripInputPartial({ ...values, pickup_lat: coord.lat, pickup_lon: coord.lon })
    );
    setErrors(validation);
  }

  function handleDropoffMapChange(coord: Coordinate) {
    setValues((prev) => ({ ...prev, dropoff_lat: coord.lat, dropoff_lon: coord.lon }));
    setTouched((prev) => ({ ...prev, dropoff_lat: true, dropoff_lon: true }));
    const validation = validateTripInputs(
      toTripInputPartial({ ...values, dropoff_lat: coord.lat, dropoff_lon: coord.lon })
    );
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
      const trip: TripInput = {
        pickup_lat: values.pickup_lat as number,
        pickup_lon: values.pickup_lon as number,
        dropoff_lat: values.dropoff_lat as number,
        dropoff_lon: values.dropoff_lon as number,
        hour: values.hour as number,
        day_of_week_num: values.day_of_week_num as number,
        month: values.month as number,
        year: values.year as number,
        passenger_count: values.passenger_count,
      };
      onSubmit(trip);
    }
  }

  const pickupCoord: Coordinate | null =
    values.pickup_lat !== '' && values.pickup_lon !== ''
      ? { lat: values.pickup_lat, lon: values.pickup_lon }
      : null;
  const dropoffCoord: Coordinate | null =
    values.dropoff_lat !== '' && values.dropoff_lon !== ''
      ? { lat: values.dropoff_lat, lon: values.dropoff_lon }
      : null;

  const hasResult = result !== undefined && result !== null;
  const displayHour = values.hour !== '' ? values.hour : undefined;

  return (
    <Card className="rounded-lg border border-t-2 border-border border-t-primary">
      <CardHeader className="flex flex-col items-start gap-3">
        <div className="flex w-full items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-2xl font-semibold">Trip Details</CardTitle>
        </div>
        <InputModeToggle mode={mode} onChange={onModeChange} disabled={disabled} />
      </CardHeader>
      <CardContent>
        {mode === 'manual' ? (
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="space-y-2">
              <Label>Pickup & Dropoff Location</Label>
              <TripMap
                pickup={pickupCoord}
                dropoff={dropoffCoord}
                onPickupChange={handlePickupMapChange}
                onDropoffChange={handleDropoffMapChange}
                disabled={disabled}
              />
              {(errors.pickup_lat || errors.pickup_lon) && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.pickup_lat || errors.pickup_lon}
                </p>
              )}
              {(errors.dropoff_lat || errors.dropoff_lon) && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.dropoff_lat || errors.dropoff_lon}
                </p>
              )}
            </div>

            {hasResult && result && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-6 w-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Predicted Fare</p>
                      <p className="font-mono text-2xl font-bold text-foreground">
                        ${result.fare_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 font-mono">
                      <MapPin className="h-3.5 w-3.5" />
                      {result.distance_km.toFixed(1)} km
                    </span>
                  </div>
                  <div className="hidden sm:block" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="datetime">Trip Date & Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="datetime"
                    type="datetime-local"
                    value={values.datetime ?? ''}
                    onChange={(e) => handleDateTimeChange(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker()}
                    onBlur={() => {
                      handleBlur('hour');
                      handleBlur('day_of_week_num');
                      handleBlur('month');
                      handleBlur('year');
                    }}
                    disabled={disabled}
                    className="w-full pl-10"
                  />
                </div>
                {(errors.hour || errors.day_of_week_num || errors.month || errors.year) && (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.hour || errors.day_of_week_num || errors.month || errors.year}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="passenger_count">Passenger Count</Label>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <PassengerStepper
                    value={values.passenger_count}
                    onChange={(v) => handleChange('passenger_count', v)}
                    disabled={disabled}
                  />
                </div>
                {errors.passenger_count && (
                  <p id="passenger_count_error" className="text-sm text-destructive" role="alert">
                    {errors.passenger_count}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button type="submit" className="w-full" disabled={disabled || isLoading}>
                {isLoading ? 'Predicting...' : 'Predict Fare'}
              </Button>
            </div>
          </form>
        ) : (
          <NaturalLanguageInput onParsedTrip={onParsedTrip ?? (() => {})} disabled={disabled} />
        )}

        <FareChartSection
          currentHour={displayHour}
          predictedFare={result?.fare_amount}
          theme={theme}
        />
      </CardContent>
    </Card>
  );
}