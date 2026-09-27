import { Polygon } from 'react-leaflet';
import type * as L from 'leaflet';

interface MapMaskProps {
  bounds: L.LatLngBoundsExpression;
}

type LatLngTuple = [number, number];

const WORLD_OUTER_RING: LatLngTuple[] = [
  [-90, -180],
  [90, -180],
  [90, 180],
  [-90, 180],
  [-90, -180],
];

function boundsToInnerRing(bounds: L.LatLngBoundsExpression): LatLngTuple[] {
  const [[latMin, lonMin], [latMax, lonMax]] = bounds as [LatLngTuple, LatLngTuple];
  // Counter-clockwise for hole (opposite of outer ring)
  return [
    [latMin, lonMin],
    [latMax, lonMin],
    [latMax, lonMax],
    [latMin, lonMax],
    [latMin, lonMin],
  ];
}

export function MapMask({ bounds }: MapMaskProps) {
  return (
    <Polygon
      positions={[WORLD_OUTER_RING, boundsToInnerRing(bounds)]}
      pathOptions={{
        fillColor: '#000',
        fillOpacity: 0.35,
        color: 'transparent',
        weight: 0,
        interactive: false,
      }}
    />
  );
}