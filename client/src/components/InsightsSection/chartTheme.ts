import type { CSSProperties } from 'react';

/**
 * Shared Recharts styling for the insights dashboard — all CSS custom properties from the
 * PRD v4 palette, so every chart repaints on theme switch (including the system-preference
 * case) without a theme prop.
 */

export const axisTick = {
  fontSize: 12,
  fill: 'var(--muted-foreground)',
};

export const tooltipStyle: CSSProperties = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
  padding: '10px 14px',
  fontSize: '13px',
  color: 'var(--popover-foreground)',
};

/** Compact axis labels: 1_500_000 → "1.5M", 240_000 → "240k". */
export function compactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${value}`;
}

export function formatRideTick(value: number | string): string {
  return typeof value === 'number' ? compactNumber(value) : String(value);
}

export function formatFareTick(value: number | string): string {
  return typeof value === 'number' ? `$${value}` : String(value);
}
