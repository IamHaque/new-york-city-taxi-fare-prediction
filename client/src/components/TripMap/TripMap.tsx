import { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/ThemeProvider';
import { LANDMARK_COORDINATES } from '@/utils/landmarks';
import { NYC_LAT_MAX, NYC_LAT_MIN, NYC_LON_MAX, NYC_LON_MIN } from '@/utils/validators';
import { dropoffIcon, pickupIcon } from './Mapicons';
import { reverseGeocode } from '@/utils/geocoding';

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

const NYC_BOUNDS: L.LatLngBoundsExpression = [
  [NYC_LAT_MIN, NYC_LON_MIN],
  [NYC_LAT_MAX, NYC_LON_MAX],
];

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

function MapClickHandler({ onClick }: { onClick: (coord: Coordinate) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

function FitBoundsHandler({
  pickup,
  dropoff,
}: {
  pickup: Coordinate | null;
  dropoff: Coordinate | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (pickup && dropoff && map) {
      const bounds = L.latLngBounds([
        [pickup.lat, pickup.lon],
        [dropoff.lat, dropoff.lon],
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [pickup, dropoff, map]);

  return null;
}

export function TripMap({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  disabled,
}: TripMapProps) {
  const { theme } = useTheme();
  const [activePin, setActivePin] = useState<'pickup' | 'dropoff'>('pickup');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupAddressLoading, setPickupAddressLoading] = useState(false);
  const [dropoffAddressLoading, setDropoffAddressLoading] = useState(false);
  const [pickupAddressError, setPickupAddressError] = useState(false);
  const [dropoffAddressError, setDropoffAddressError] = useState(false);

  const fetchAddress = useCallback(async (coord: Coordinate, isPickup: boolean) => {
    if (isPickup) {
      setPickupAddressLoading(true);
      setPickupAddressError(false);
    } else {
      setDropoffAddressLoading(true);
      setDropoffAddressError(false);
    }

    try {
      const addr = await reverseGeocode(coord.lat, coord.lon);
      if (isPickup) {
        setPickupAddress(addr);
      } else {
        setDropoffAddress(addr);
      }
    } catch {
      if (isPickup) {
        setPickupAddressError(true);
      } else {
        setDropoffAddressError(true);
      }
    } finally {
      if (isPickup) {
        setPickupAddressLoading(false);
      } else {
        setDropoffAddressLoading(false);
      }
    }
  }, []);

  const handleMapClick = useCallback(
    async (coord: Coordinate) => {
      if (disabled) return;
      if (activePin === 'pickup') {
        onPickupChange(coord);
        await fetchAddress(coord, true);
      } else {
        onDropoffChange(coord);
        await fetchAddress(coord, false);
      }
    },
    [activePin, disabled, onPickupChange, onDropoffChange, fetchAddress]
  );

  async function handleLandmarkClick(name: string) {
    if (disabled) return;
    const coords = LANDMARK_COORDINATES[name];
    if (!coords) return;
    const coord: Coordinate = { lat: coords[0], lon: coords[1] };
    if (activePin === 'pickup') {
      onPickupChange(coord);
      await fetchAddress(coord, true);
    } else {
      onDropoffChange(coord);
      await fetchAddress(coord, false);
    }
  }

  async function handleMarkerDragEnd(
    e: L.LeafletEvent,
    onChange: (coord: Coordinate) => void,
    isPickup: boolean
  ) {
    const marker = e.target as L.Marker;
    const pos = marker.getLatLng();
    const coord = { lat: pos.lat, lon: pos.lng };
    onChange(coord);
    await fetchAddress(coord, isPickup);
  }

  const handleRetryAddress = useCallback(
    async (isPickup: boolean) => {
      const coord = isPickup ? pickup : dropoff;
      if (!coord) return;
      await fetchAddress(coord, isPickup);
    },
    [pickup, dropoff, fetchAddress]
  );

  const tileUrl =
    theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_40hw_1_a2904f9235369bdd56f8c34e'
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
          style={{ height: '400px', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer url={tileUrl} attribution={tileAttribution} />
          <MapClickHandler onClick={handleMapClick} />
          <FitBoundsHandler pickup={pickup} dropoff={dropoff} />

          {pickup && (
            <Marker
              position={[pickup.lat, pickup.lon]}
              icon={pickupIcon}
              draggable={!disabled}
              eventHandlers={{
                dragend: (e) => handleMarkerDragEnd(e, onPickupChange, true),
              }}
            />
          )}
          {dropoff && (
            <Marker
              position={[dropoff.lat, dropoff.lon]}
              icon={dropoffIcon}
              draggable={!disabled}
              eventHandlers={{
                dragend: (e) => handleMarkerDragEnd(e, onDropoffChange, false),
              }}
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

      <div className="space-y-2 text-sm">
        <div className="flex min-w-0 items-start gap-2">
          <span className="shrink-0 font-medium text-primary">Pickup:</span>
          <span className="flex-1 truncate text-muted-foreground">
            {pickupAddressLoading ? (
              'Loading address...'
            ) : pickupAddressError ? (
              <span className="flex items-center gap-1.5">
                <span>Address unavailable</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 py-0 text-xs"
                  onClick={() => handleRetryAddress(true)}
                >
                  Retry
                </Button>
              </span>
            ) : (
              pickupAddress || 'Click map to set'
            )}
          </span>
        </div>
        <div className="flex min-w-0 items-start gap-2">
          <span className="shrink-0 font-medium text-destructive">Dropoff:</span>
          <span className="flex-1 truncate text-muted-foreground">
            {dropoffAddressLoading ? (
              'Loading address...'
            ) : dropoffAddressError ? (
              <span className="flex items-center gap-1.5">
                <span>Address unavailable</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 py-0 text-xs"
                  onClick={() => handleRetryAddress(false)}
                >
                  Retry
                </Button>
              </span>
            ) : (
              dropoffAddress || 'Click map to set'
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
