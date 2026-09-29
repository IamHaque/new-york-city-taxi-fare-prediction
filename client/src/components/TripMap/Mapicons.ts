import L from 'leaflet';

/**
 * Builds a custom colored pin DivIcon from inline SVG, rather than using Leaflet's default
 * marker images. This deliberately sidesteps the well-known Leaflet+bundler "broken default
 * marker icon" issue (missing marker-icon.png/marker-shadow.png after bundling) entirely, since
 * we never reference Leaflet's bundled marker image assets at all.
 *
 * The fill color is passed as a literal CSS var() reference (e.g. "var(--primary)"), which
 * resolves correctly because this HTML is injected into the real DOM — the browser's normal
 * CSS cascade applies, so the pin automatically re-colors when the app's light/dark theme
 * class changes, with no need to regenerate the icon on theme toggle.
 */
function createPinIcon(cssColorVar: string): L.DivIcon {
  const html = `
    <div style="width: 28px; height: 28px; transform: translateY(-6px);">
      <svg width="28" height="28" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 0C7.03 0 3 4.03 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-4.97-4.03-9-9-9z"
          fill="${cssColorVar}"
          stroke="white"
          stroke-width="1.5"
        />
        <circle cx="12" cy="9" r="3.25" fill="white" />
      </svg>
    </div>
  `;

  return L.divIcon({
    html,
    className: '', // clears Leaflet's default marker CSS class so it doesn't add its own background/border
    iconSize: [28, 28],
    iconAnchor: [14, 28], // bottom tip of the pin points exactly at the coordinate
  });
}

export const pickupIcon = createPinIcon('var(--pickup)');
export const dropoffIcon = createPinIcon('var(--dropoff)');
