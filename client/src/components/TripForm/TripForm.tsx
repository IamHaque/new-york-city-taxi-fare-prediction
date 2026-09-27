import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import type { TripInput, ParsedTripDetails } from '@/types/trip';
import { validateTripInputs } from '@/utils/validators';
import { decomposeDateTime } from '@/utils/dateTimeUtils';
import { enrichParsedTripWithCoordinates } from '@/utils/landmarks';
import { PassengerStepper } from '@/components/shared/PassengerStepper';
import { InputModeToggle } from '@/components/shared/InputModeToggle';
import { NaturalLanguageInput } from '@/components/NaturalLanguageInput/NaturalLanguageInput';

interface TripFormProps {
  onSubmit: (trip: TripInput) => void;
  disabled?: boolean;
  initialValues?: Partial<ParsedTripDetails>;
  mode: 'manual' | 'describe';
  onModeChange: (mode: 'manual' | 'describe') => void;
  onParsedTrip?: (trip: ParsedTripDetails) => void;
}

/** Internal form state includes datetime-local string for the input */
interface FormState {
  pickup_lat: number | '';
  pickup_lon: number | '';
  dropoff_lat: number | '';
  dropoff_lon: number | '';
  datetime: string;
  hour: number | '';
  day_of_week_num: number | '';
  month: number | '';
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
    passenger_count: state.passenger_count,
  };
}

function parsedTripToFormState(parsed: ParsedTripDetails): FormState {
  // Convert hour, day_of_week_num, month to datetime-local string
  // We'll create a date in the current year with the given month/day
  const now = new Date();
  const date = new Date(now.getFullYear(), parsed.month - 1, 1); // First day of month
  // Find a day that matches the day_of_week_num (0=Mon)
  // day_of_week_num: 0=Mon, 1=Tue, ..., 6=Sun
  // JS getDay: 0=Sun, 1=Mon, ..., 6=Sat
  // So JS day = (day_of_week_num + 1) % 7
  const targetJsDay = (parsed.day_of_week_num + 1) % 7;
  const firstDayJsDay = date.getDay();
  const offset = (targetJsDay - firstDayJsDay + 7) % 7;
  date.setDate(date.getDate() + offset);
  date.setHours(parsed.hour, 0, 0, 0);

  const datetime = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM

  return {
    pickup_lat: parsed.pickup_lat ?? '',
    pickup_lon: parsed.pickup_lon ?? '',
    dropoff_lat: parsed.dropoff_lat ?? '',
    dropoff_lon: parsed.dropoff_lon ?? '',
    datetime,
    hour: parsed.hour,
    day_of_week_num: parsed.day_of_week_num,
    month: parsed.month,
    passenger_count: parsed.passenger_count,
  };
}

/**
 * TripForm - collects and validates trip input from the user.
 * Calls onSubmit(trip: TripInput) prop when valid; does NOT call the API itself.
 * Accepts initialValues from natural language parsing to pre-fill fields.
 * Supports two modes: 'manual' (coordinate fields) and 'describe' (natural language).
 * Validation errors only show for fields the user has interacted with (onBlur),
 * plus any empty required fields on submit.
 */
export function TripForm({
  onSubmit,
  disabled,
  initialValues,
  mode,
  onModeChange,
  onParsedTrip,
}: TripFormProps) {
  const [values, setValues] = useState<FormState>({
    pickup_lat: '',
    pickup_lon: '',
    dropoff_lat: '',
    dropoff_lon: '',
    datetime: '',
    hour: '',
    day_of_week_num: '',
    month: '',
    passenger_count: 1,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TripInput, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof TripInput | 'datetime', boolean>>>(
    {}
  );

  // Apply initial values when they change
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      const enriched = enrichParsedTripWithCoordinates(initialValues as ParsedTripDetails);
      const formState = parsedTripToFormState(enriched);
      setValues(formState);
      // Clear errors when new values are set
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

  function handleDateTimeChange(value: string) {
    setValues((prev) => ({ ...prev, datetime: value }));
    if (value) {
      const { hour, day_of_week_num, month } = decomposeDateTime(value);
      setValues((prev) => ({ ...prev, hour, day_of_week_num, month }));
      if (touched.hour || touched.day_of_week_num || touched.month) {
        const validation = validateTripInputs(
          toTripInputPartial({ ...values, hour, day_of_week_num, month })
        );
        setErrors(validation);
      }
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validation = validateTripInputs(toTripInputPartial(values));

    // Only mark empty/invalid fields as touched (not all fields)
    const fieldsToTouch: Partial<Record<keyof TripInput | 'datetime', boolean>> = {};

    // Mark fields with validation errors
    for (const key of Object.keys(validation) as (keyof TripInput)[]) {
      fieldsToTouch[key] = true;
    }

    // Also mark empty required fields
    const requiredFields: (keyof TripInput)[] = [
      'pickup_lat',
      'pickup_lon',
      'dropoff_lat',
      'dropoff_lon',
      'hour',
      'day_of_week_num',
      'month',
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
        passenger_count: values.passenger_count,
      };
      onSubmit(trip);
    }
  }

  // Level 2 card: primary surface with top accent border
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
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickup_lat">Pickup Latitude</Label>
                <Input
                  id="pickup_lat"
                  type="number"
                  step="0.000001"
                  placeholder="40.7580"
                  value={values.pickup_lat ?? ''}
                  onChange={(e) => handleChange('pickup_lat', parseFloat(e.target.value) || 0)}
                  onBlur={() => handleBlur('pickup_lat')}
                  disabled={disabled}
                  aria-invalid={!!errors.pickup_lat}
                  aria-describedby={errors.pickup_lat ? 'pickup_lat_error' : undefined}
                />
                {errors.pickup_lat && (
                  <p id="pickup_lat_error" className="text-sm text-destructive" role="alert">
                    {errors.pickup_lat}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_lon">Pickup Longitude</Label>
                <Input
                  id="pickup_lon"
                  type="number"
                  step="0.000001"
                  placeholder="-73.9855"
                  value={values.pickup_lon ?? ''}
                  onChange={(e) => handleChange('pickup_lon', parseFloat(e.target.value) || 0)}
                  onBlur={() => handleBlur('pickup_lon')}
                  disabled={disabled}
                  aria-invalid={!!errors.pickup_lon}
                  aria-describedby={errors.pickup_lon ? 'pickup_lon_error' : undefined}
                />
                {errors.pickup_lon && (
                  <p id="pickup_lon_error" className="text-sm text-destructive" role="alert">
                    {errors.pickup_lon}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dropoff_lat">Dropoff Latitude</Label>
                <Input
                  id="dropoff_lat"
                  type="number"
                  step="0.000001"
                  placeholder="40.6413"
                  value={values.dropoff_lat ?? ''}
                  onChange={(e) => handleChange('dropoff_lat', parseFloat(e.target.value) || 0)}
                  onBlur={() => handleBlur('dropoff_lat')}
                  disabled={disabled}
                  aria-invalid={!!errors.dropoff_lat}
                  aria-describedby={errors.dropoff_lat ? 'dropoff_lat_error' : undefined}
                />
                {errors.dropoff_lat && (
                  <p id="dropoff_lat_error" className="text-sm text-destructive" role="alert">
                    {errors.dropoff_lat}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dropoff_lon">Dropoff Longitude</Label>
                <Input
                  id="dropoff_lon"
                  type="number"
                  step="0.000001"
                  placeholder="-73.7781"
                  value={values.dropoff_lon ?? ''}
                  onChange={(e) => handleChange('dropoff_lon', parseFloat(e.target.value) || 0)}
                  onBlur={() => handleBlur('dropoff_lon')}
                  disabled={disabled}
                  aria-invalid={!!errors.dropoff_lon}
                  aria-describedby={errors.dropoff_lon ? 'dropoff_lon_error' : undefined}
                />
                {errors.dropoff_lon && (
                  <p id="dropoff_lon_error" className="text-sm text-destructive" role="alert">
                    {errors.dropoff_lon}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="datetime">Trip Date & Time</Label>
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
                }}
                disabled={disabled}
                className="w-full"
              />
              {(errors.hour || errors.day_of_week_num || errors.month) && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.hour || errors.day_of_week_num || errors.month}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="passenger_count">Passenger Count</Label>
              <PassengerStepper
                value={values.passenger_count}
                onChange={(v) => handleChange('passenger_count', v)}
                disabled={disabled}
              />
              {errors.passenger_count && (
                <p id="passenger_count_error" className="text-sm text-destructive" role="alert">
                  {errors.passenger_count}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={disabled}>
              Predict Fare
            </Button>
          </form>
        ) : (
          // Describe mode - NaturalLanguageInput embedded
          <NaturalLanguageInput onParsedTrip={onParsedTrip ?? (() => {})} disabled={disabled} />
        )}
      </CardContent>
    </Card>
  );
}
