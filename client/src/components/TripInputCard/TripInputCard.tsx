import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { NoticeBanner } from '@/components/shared/NoticeBanner';
import { PassengerStepper } from '@/components/shared/PassengerStepper';
import { ChevronDown, Clock, Loader2, MapPin, MessageSquare, Users } from 'lucide-react';
import type { TripInput } from '@/types/trip';
import {
  NYC_LAT_MAX,
  NYC_LAT_MIN,
  NYC_LON_MAX,
  NYC_LON_MIN,
  type ValidationErrors,
} from '@/utils/validators';
import type { ActivePin } from '@/components/TripMap/TripMap';
import { cn } from '@/lib/utils';

export interface FormState {
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

export interface AddressState {
  value: string;
  loading: boolean;
  error: boolean;
}

interface TripInputCardProps {
  values: FormState;
  errors: ValidationErrors;
  activePin: ActivePin;
  pickupAddress: AddressState;
  dropoffAddress: AddressState;
  disabled?: boolean;
  isLoading?: boolean;
  /** Natural-language parse lifecycle + messages (the parse itself runs in TripPlanner). */
  isParsing: boolean;
  describeError: string | null;
  describeNotice: string | null;
  onChange: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  onBlur: (field: keyof TripInput | 'datetime') => void;
  onDateTimeChange: (value: string) => void;
  onActivePinChange: (pin: ActivePin) => void;
  onLandmarkClick: (name: string) => void;
  onEstimateFromText: (description: string) => void;
  onRetryAddress: (side: 'pickup' | 'dropoff') => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

/** Quick-jump landmark chips — relocated from TripMap (PRD v4, Story 3.4). */
const QUICK_JUMP_LANDMARKS = [
  'times square',
  'jfk airport',
  'la guardia airport',
  'central park',
  'grand central',
  'wall street',
  'brooklyn bridge',
  'newark airport',
] as const;

const DESCRIPTION_SUGGESTIONS = [
  '2 people from Times Square to JFK Airport Friday at 6pm',
  '3 people from Grand Central to Rockefeller Center in the morning',
  'Evening ride from Wall Street to Times Square on Sunday',
  'From Penn Station to La Guardia Airport tomorrow at 7am',
];

function formatCoord(value: number | ''): string {
  return typeof value === 'number' ? value.toFixed(4) : '—';
}

interface LocationRowProps {
  label: string;
  /** Drives the manual-entry field names (pickup_lat/pickup_lon vs dropoff_*). */
  side: 'pickup' | 'dropoff';
  iconClass: string;
  address: AddressState;
  lat: number | '';
  lon: number | '';
  error?: string;
  lonError?: string;
  isActive: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onRetry: () => void;
  onCoordChange: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  onCoordBlur: (field: keyof TripInput | 'datetime') => void;
}

/**
 * Compact pickup/drop-off row (PRD v4, Story 4.1 #3): reverse-geocoded name when available,
 * coordinates as the secondary line. Clicking the row selects the same active pin the map's
 * floating switch uses, so rail and map stay in sync.
 *
 * Also hosts the PRD v5 Story 2.4 accessibility fallback: a collapsed-by-default
 * "Enter coordinates manually" disclosure with lat/lon number inputs, so a keyboard-only or
 * screen-reader user can set a location without ever touching the Leaflet map.
 */
function LocationRow({
  label,
  side,
  iconClass,
  address,
  lat,
  lon,
  error,
  lonError,
  isActive,
  disabled,
  onSelect,
  onRetry,
  onCoordChange,
  onCoordBlur,
}: LocationRowProps) {
  const [manualOpen, setManualOpen] = useState(false);

  const latField = side === 'pickup' ? 'pickup_lat' : 'dropoff_lat';
  const lonField = side === 'pickup' ? 'pickup_lon' : 'dropoff_lon';
  const latInputId = `${side}-manual-lat`;
  const lonInputId = `${side}-manual-lon`;
  const panelId = `${side}-manual-entry`;

  const primaryLine = address.loading
    ? 'Loading address…'
    : address.error
      ? 'Address unavailable'
      : address.value || 'Not set yet';

  const rowError = error || lonError;

  return (
    <div
      className={cn(
        'rounded-md border transition-colors hover:border-primary',
        isActive && 'bg-primary/5 border-primary'
      )}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        <MapPin className={cn('mt-1 h-4 w-4 shrink-0', iconClass)} />
        <button
          type="button"
          className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
          onClick={!disabled ? onSelect : undefined}
          disabled={disabled}
          aria-pressed={isActive}
        >
          <span className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            {isActive && <span className="text-[10px] text-primary">placing on map</span>}
          </span>
          <span className="block truncate text-sm text-foreground">{primaryLine}</span>
          <span className="block truncate font-mono text-[11px] text-muted-foreground">
            {formatCoord(lat)}, {formatCoord(lon)}
          </span>
          {!manualOpen && rowError && (
            <span role="alert" className="mt-0.5 block text-xs text-destructive">
              {rowError}
            </span>
          )}
        </button>
        {address.error && !address.loading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 h-6 px-2 text-xs"
            onClick={onRetry}
          >
            Retry
          </Button>
        )}
      </div>

      {/* Accessible manual-entry fallback (PRD v5, Story 2.4) */}
      <div className="border-border/60 border-t px-3 py-1.5">
        <button
          type="button"
          className="flex w-full items-center gap-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-expanded={manualOpen}
          aria-controls={panelId}
          disabled={disabled}
          onClick={() => setManualOpen((open) => !open)}
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', manualOpen && 'rotate-180')}
            aria-hidden="true"
          />
          Enter coordinates manually
        </button>

        {manualOpen && (
          <div id={panelId} className="grid grid-cols-2 gap-2 pb-1.5 pt-1">
            <div className="space-y-1">
              <Label htmlFor={latInputId} className="text-xs">
                Latitude
              </Label>
              <Input
                id={latInputId}
                type="number"
                step="any"
                min={NYC_LAT_MIN}
                max={NYC_LAT_MAX}
                inputMode="decimal"
                placeholder="40.7580"
                value={lat === '' ? '' : lat}
                onChange={(e) =>
                  onCoordChange(latField, e.target.value === '' ? '' : Number(e.target.value))
                }
                onBlur={() => onCoordBlur(latField)}
                disabled={disabled}
                aria-invalid={Boolean(error)}
              />
              {error && (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor={lonInputId} className="text-xs">
                Longitude
              </Label>
              <Input
                id={lonInputId}
                type="number"
                step="any"
                min={NYC_LON_MIN}
                max={NYC_LON_MAX}
                inputMode="decimal"
                placeholder="-73.9855"
                value={lon === '' ? '' : lon}
                onChange={(e) =>
                  onCoordChange(lonField, e.target.value === '' ? '' : Number(e.target.value))
                }
                onBlur={() => onCoordBlur(lonField)}
                disabled={disabled}
                aria-invalid={Boolean(lonError)}
              />
              {lonError && (
                <p role="alert" className="text-xs text-destructive">
                  {lonError}
                </p>
              )}
            </div>
            <p className="col-span-2 font-mono text-[10.5px] text-muted-foreground">
              NYC bounds: lat {NYC_LAT_MIN}–{NYC_LAT_MAX}, lon {NYC_LON_MIN}–{NYC_LON_MAX}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The single always-visible trip input card (PRD v4, Epic 4) — replaces the old
 * manual/describe mode toggle. Top to bottom: describe box → landmark chips →
 * pickup/drop-off rows → date/time + passengers → submit. Form state itself stays lifted
 * in TripPlanner; this component only renders it and emits change events.
 */
export function TripInputCard({
  values,
  errors,
  activePin,
  pickupAddress,
  dropoffAddress,
  disabled,
  isLoading,
  isParsing,
  describeError,
  describeNotice,
  onChange,
  onBlur,
  onDateTimeChange,
  onActivePinChange,
  onLandmarkClick,
  onEstimateFromText,
  onRetryAddress,
  onSubmit,
}: TripInputCardProps) {
  const [description, setDescription] = useState('');

  return (
    <Card className="rounded-lg border border-t-2 border-border border-t-primary">
      <CardHeader className="flex-row items-center gap-2 space-y-0 pb-3">
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-lg font-semibold">Plan Your Trip</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* 1. Describe-your-trip (compact treatment — formerly its own card) */}
        <div className="space-y-2">
          <Label htmlFor="trip-description">Describe your trip</Label>
          <Textarea
            id="trip-description"
            placeholder='e.g. "3 people from Times Square to JFK airport Friday at 6pm"'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={disabled || isParsing}
            rows={2}
            className="resize-none"
          />
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {DESCRIPTION_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={disabled || isParsing}
                onClick={() => setDescription(suggestion)}
                className="text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-primary hover:underline disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {describeError && <ErrorBanner message={describeError} />}
          {describeNotice && <NoticeBanner message={describeNotice} />}

          <Button
            type="button"
            onClick={() => onEstimateFromText(description)}
            disabled={disabled || isParsing || !description.trim()}
            className="w-full"
          >
            {isParsing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing &amp; estimating…
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4" />
                Estimate from text
              </>
            )}
          </Button>
        </div>

        {/* 2. Landmark quick-jump chips (relocated from the map) */}
        <div className="space-y-2">
          <Label>Quick landmarks</Label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_JUMP_LANDMARKS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onLandmarkClick(name)}
                disabled={disabled}
                className="rounded-full border border-border bg-transparent px-2.5 py-1 font-mono text-[10.5px] capitalize text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Currently-selected pickup / drop-off */}
        <div className="space-y-2">
          <Label>Pickup &amp; drop-off</Label>
          <LocationRow
            label="Pickup"
            side="pickup"
            iconClass="text-pickup"
            address={pickupAddress}
            lat={values.pickup_lat}
            lon={values.pickup_lon}
            error={errors.pickup_lat}
            lonError={errors.pickup_lon}
            isActive={activePin === 'pickup'}
            disabled={disabled}
            onSelect={() => onActivePinChange('pickup')}
            onRetry={() => onRetryAddress('pickup')}
            onCoordChange={onChange}
            onCoordBlur={onBlur}
          />
          <LocationRow
            label="Drop-off"
            side="dropoff"
            iconClass="text-dropoff"
            address={dropoffAddress}
            lat={values.dropoff_lat}
            lon={values.dropoff_lon}
            error={errors.dropoff_lat}
            lonError={errors.dropoff_lon}
            isActive={activePin === 'dropoff'}
            disabled={disabled}
            onSelect={() => onActivePinChange('dropoff')}
            onRetry={() => onRetryAddress('dropoff')}
            onCoordChange={onChange}
            onCoordBlur={onBlur}
          />
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {/* 4. Date/time + passenger count (compact two-column row) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="datetime">Trip Date &amp; Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="datetime"
                  type="datetime-local"
                  value={values.datetime ?? ''}
                  onChange={(e) => onDateTimeChange(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker()}
                  onBlur={() => {
                    onBlur('hour');
                    onBlur('day_of_week_num');
                    onBlur('month');
                    onBlur('year');
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
              <Label htmlFor="passenger_count">Passengers</Label>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <PassengerStepper
                  value={values.passenger_count}
                  onChange={(v) => onChange('passenger_count', v)}
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

          {/* 5. Submit */}
          <Button type="submit" className="w-full" disabled={disabled || isLoading}>
            {isLoading ? 'Predicting…' : 'Predict Fare'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
