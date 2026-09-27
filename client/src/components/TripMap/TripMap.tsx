import { useCallback, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from 'react-leaflet';
import type * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/ThemeProvider';
import { LANDMARK_COORDINATES } from '@/utils/landmarks';
import { NYC_LAT_MAX, NYC_LAT_MIN, NYC_LON_MAX, NYC_LON_MIN } from '@/utils/validators';
import { dropoffIcon, pickupIcon } from './Mapicons';

export interface Coordinate {
  lat: number;
  lon: number;
}

interface TripMapProps {
  pickup: Coordinate | null;
  dropoff: Coordinate | null;
  onPickupChange: (coord: Coordinate) => void;
  onDropoffChange: (coord: Coordinate) => void;
  disabled?: boolean;
}

// Reuses the EXACT same bounding box validateTripInputs already checks against (utils/validators.ts)
// — the map physically cannot be panned or clicked outside this box, so it enforces the same
// constraint the backend model was trained within by construction, rather than needing a second,
// separately-maintained bounds check here.
const NYC_BOUNDS: L.LatLngBoundsExpression = [
  [NYC_LAT_MIN, NYC_LON_MIN],
  [NYC_LAT_MAX, NYC_LON_MAX],
];

// A curated, non-overwhelming subset of the full LANDMARK_COORDINATES table (utils/landmarks.ts)
// — shown as quick-jump chips so users aren't stuck hunting around the map for common locations.
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

/** Invisible helper component — the standard react-leaflet pattern for hooking into map events. */
function MapClickHandler({ onClick }: { onClick: (coord: Coordinate) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

/**
 * TripMap - free OpenStreetMap-based map that replaces manual latitude/longitude text entry.
 * Click the map (or drag an existing pin) to set pickup/dropoff locations directly, instead of
 * typing 6-decimal coordinates by hand. "Set Pickup"/"Set Dropoff" determines which pin the next
 * click or landmark-chip selection updates; placing a pickup pin auto-advances to dropoff.
 */
export function TripMap({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  disabled,
}: TripMapProps) {
  const { theme } = useTheme();
  const [activePin, setActivePin] = useState<'pickup' | 'dropoff'>('pickup');

  const handleMapClick = useCallback(
    (coord: Coordinate) => {
      if (disabled) return;
      if (activePin === 'pickup') {
        onPickupChange(coord);
        setActivePin('dropoff'); // auto-advance so the very next click sets dropoff
      } else {
        onDropoffChange(coord);
      }
    },
    [activePin, disabled, onPickupChange, onDropoffChange]
  );

  function handleLandmarkClick(name: string) {
    if (disabled) return;
    const coords = LANDMARK_COORDINATES[name];
    if (!coords) return;
    const coord: Coordinate = { lat: coords[0], lon: coords[1] };
    if (activePin === 'pickup') {
      onPickupChange(coord);
      setActivePin('dropoff');
    } else {
      onDropoffChange(coord);
    }
  }

  function handleMarkerDragEnd(e: L.LeafletEvent, onChange: (coord: Coordinate) => void) {
    const marker = e.target as L.Marker;
    const pos = marker.getLatLng();
    onChange({ lat: pos.lat, lon: pos.lng });
  }

  // CARTO's free dark-tile basemap in dark mode, standard OSM tiles in light mode. Both are free
  // and require no API key — only attribution, which stays visible below via the `attribution`
  // prop. Matches the map's palette to the app's active theme rather than always showing a bright
  // tile set that would clash with a dark UI.
  const tileUrl =
    theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_40hw_1_a2904f9235369bdd56f8c34e'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution =
    theme === 'dark'
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={activePin === 'pickup' ? 'bg-primary/15 border-primary text-primary' : ''}
          onClick={() => setActivePin('pickup')}
          disabled={disabled}
        >
          Set Pickup
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={
            activePin === 'dropoff' ? 'bg-destructive/15 border-destructive text-destructive' : ''
          }
          onClick={() => setActivePin('dropoff')}
          disabled={disabled}
        >
          Set Dropoff
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <MapContainer
          center={[40.758, -73.9855]}
          zoom={11}
          minZoom={10}
          maxBounds={NYC_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: '320px', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer url={tileUrl} attribution={tileAttribution} />
          <MapClickHandler onClick={handleMapClick} />

          {pickup && (
            <Marker
              position={[pickup.lat, pickup.lon]}
              icon={pickupIcon}
              draggable={!disabled}
              eventHandlers={{ dragend: (e) => handleMarkerDragEnd(e, onPickupChange) }}
            />
          )}
          {dropoff && (
            <Marker
              position={[dropoff.lat, dropoff.lon]}
              icon={dropoffIcon}
              draggable={!disabled}
              eventHandlers={{ dragend: (e) => handleMarkerDragEnd(e, onDropoffChange) }}
            />
          )}
          {pickup && dropoff && (
            <Polyline
              positions={[
                [pickup.lat, pickup.lon],
                [dropoff.lat, dropoff.lon],
              ]}
              pathOptions={{ color: 'var(--primary)', dashArray: '6 6', weight: 2 }}
            />
          )}
        </MapContainer>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_JUMP_LANDMARKS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => handleLandmarkClick(name)}
            disabled={disabled}
            className="rounded-full border border-border bg-transparent px-2.5 py-1 font-mono text-[10.5px] capitalize text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 font-mono text-xs text-muted-foreground">
        <div>
          <span className="text-primary">Pickup:</span>{' '}
          {pickup
            ? `${pickup.lat.toFixed(6)}, ${pickup.lon.toFixed(6)}`
            : 'not set — click the map'}
        </div>
        <div>
          <span className="text-destructive">Dropoff:</span>{' '}
          {dropoff
            ? `${dropoff.lat.toFixed(6)}, ${dropoff.lon.toFixed(6)}`
            : 'not set — click the map'}
        </div>
      </div>
    </div>
  );
}
