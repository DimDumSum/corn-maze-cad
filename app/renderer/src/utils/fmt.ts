/**
 * Convenience measurement formatters that read the unit system
 * from the settings store automatically.
 *
 * Import these in tool overlays and UI components instead of
 * calling formatLength(value, system) directly.
 */

import { useSettingsStore } from '../stores/settingsStore';
import {
  formatLength,
  formatShortLength,
  formatCoord,
  formatArea,
  lengthUnit,
  fromMeters,
  toMeters,
} from './units';
import type { UnitSystem } from './units';

function sys(): UnitSystem {
  return useSettingsStore.getState().unitSystem;
}

/** Format a length: "12.34 m" or "40.49 ft" */
export function fmtLen(meters: number, decimals = 2): string {
  return formatLength(meters, sys(), decimals);
}

/** Format a short length (1 decimal): "4.0 m" or "13.1 ft" */
export function fmtShort(meters: number): string {
  return formatShortLength(meters, sys());
}

/** Format a coordinate value (number only, no unit): "12.34" */
export function fmtCoord(meters: number): string {
  return formatCoord(meters, sys());
}

/** Format an area: "2.50 ha" or "6.18 ac" */
export function fmtArea(m2: number): string {
  return formatArea(m2, sys());
}

/** Get current length unit label: "m" or "ft" */
export function fmtUnit(): string {
  return lengthUnit(sys());
}

/** Convert display-unit value → internal meters */
export function fmtToMeters(displayValue: number): number {
  return toMeters(displayValue, sys());
}

/** Convert internal meters → display-unit value */
export function fmtFromMeters(meters: number): number {
  return fromMeters(meters, sys());
}

// Re-export for convenience
export { formatLength, formatArea, lengthUnit, fromMeters, toMeters };
export type { UnitSystem };
