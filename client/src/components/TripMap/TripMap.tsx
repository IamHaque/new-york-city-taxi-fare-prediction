import { useEffect } from 'react';
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/ThemeProvider';
import { NYC_LAT_MAX, NYC_LAT_MIN, NYC_LON_MAX, NYC_LON_MIN } from '@/utils/validators';
import { haversineMiles, type Coordinate } from '@/utils/geo';
import { dropoffIcon, pickupIcon } from './Mapicons';

export type { Coordinate } from '@/utils/geo';

export type ActivePin = 'pickup' | 'dropoff';

interface TripMapProps {
  pickup: Coordinate | null;
  dropoff: Coordinate | null;
  /**
   * Widened from `(coord: Coordinate) => void` to allow null so a "Clear pins" action can
   * reset both sides through the same callback (PRD v4, Story 3.3).
   * `reestimate` is true only for marker drags — TripPlanner re-runs the fare estimate then,
   * while a plain map click just places the pin (Story 4.3).
   */
  onPickupChange: (coord: Coordinate | null, reestimate?: boolean) => void;
  onDropoffChange: (coord: Coordinate | null, reestimate?: boolean) => void;
  activePin: ActivePin;
  onActivePinChange: (pin: ActivePin) => void;
  disabled?: boolean;
}

const DEFAULT_CENTER: L.LatLngExpression = [40.758, -73.9855];
const DEFAULT_ZOOM = 11;

const NYC_BOUNDS: L.LatLngBoundsExpression = [
  [NYC_LAT_MIN, NYC_LON_MIN],
  [NYC_LAT_MAX, NYC_LON_MAX],
];

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

/** Resets the view to the default NYC center/zoom once both pins are gone ("Clear pins"). */
function ResetViewHandler({
  pickup,
  dropoff,
}: {
  pickup: Coordinate | null;
  dropoff: Coordinate | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!pickup && !dropoff && map) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, [pickup, dropoff, map]);

  return null;
}

export function TripMap({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  activePin,
  onActivePinChange,
  disabled,
}: TripMapProps) {
  const { theme } = useTheme();

  function handleMapClick(coord: Coordinate) {
    if (disabled) return;
    if (activePin === 'pickup') {
      onPickupChange(coord);
    } else {
      onDropoffChange(coord);
    }
  }

  function handleMarkerDragEnd(coord: Coordinate, onChange: TripMapProps['onPickupChange']) {
    if (disabled) return;
    onChange(coord, true);
  }

  function handleClearPins() {
    if (disabled) return;
    onPickupChange(null);
    onDropoffChange(null);
  }

  const tileUrl =
    theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_40hw_1_a2904f9235369bdd56f8c34e'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution =
    theme === 'dark'
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const hasPin = pickup !== null || dropoff !== null;
  const routeMiles = pickup && dropoff ? haversineMiles(pickup, dropoff) : null;

  const switchButtonClass = (isActive: boolean) =>
    isActive
      ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
      : 'border-border bg-transparent text-muted-foreground hover:border-primary hover:bg-background hover:text-foreground';

  return (
    <div className="relative h-[420px] overflow-hidden rounded-md border border-border lg:sticky lg:top-[5.5rem] lg:h-[calc(100vh-8rem)] lg:min-h-[560px]">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={10}
        maxBounds={NYC_BOUNDS}
        maxBoundsViscosity={1.0}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer url={tileUrl} attribution={tileAttribution} />
        <MapClickHandler onClick={handleMapClick} />
        <FitBoundsHandler pickup={pickup} dropoff={dropoff} />
        <ResetViewHandler pickup={pickup} dropoff={dropoff} />

        {pickup && (
          <Marker
            position={[pickup.lat, pickup.lon]}
            icon={pickupIcon}
            draggable={!disabled}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target as L.Marker;
                const pos = marker.getLatLng();
                handleMarkerDragEnd({ lat: pos.lat, lon: pos.lng }, onPickupChange);
              },
            }}
          />
        )}
        {dropoff && (
          <Marker
            position={[dropoff.lat, dropoff.lon]}
            icon={dropoffIcon}
            draggable={!disabled}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target as L.Marker;
                const pos = marker.getLatLng();
                handleMarkerDragEnd({ lat: pos.lat, lon: pos.lng }, onDropoffChange);
              },
            }}
          />
        )}
        {pickup && dropoff && routeMiles !== null && (
          <Polyline
            positions={[
              [pickup.lat, pickup.lon],
              [dropoff.lat, dropoff.lon],
            ]}
            pathOptions={{ color: 'var(--primary)', dashArray: '6 6', weight: 2 }}
          >
            <Tooltip permanent direction="center" className="distance-tooltip" opacity={1}>
              {routeMiles.toFixed(1)} mi
            </Tooltip>
          </Polyline>
        )}
      </MapContainer>

      {/* Floating pickup/dropoff switch — overlays the map instead of sitting above it */}
      <div className="bg-card/90 absolute left-3 top-3 z-[1000] flex gap-1 rounded-lg border border-border p-1 shadow-md backdrop-blur">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={switchButtonClass(activePin === 'pickup')}
          onClick={() => onActivePinChange('pickup')}
          disabled={disabled}
        >
          Set Pickup
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={switchButtonClass(activePin === 'dropoff')}
          onClick={() => onActivePinChange('dropoff')}
          disabled={disabled}
        >
          Set Dropoff
        </Button>
      </div>

      {/* Clear pins — same floating-pill treatment, only shown once there's something to clear */}
      {hasPin && (
        <div className="bg-card/90 absolute right-3 top-3 z-[1000] rounded-lg border border-border p-1 shadow-md backdrop-blur">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearPins}
            disabled={disabled}
          >
            Clear pins
          </Button>
        </div>
      )}
    </div>
  );
}
