/**
 * Unit conversion and formatting utilities.
 *
 * Internal storage is always in meters / square meters.
 * Display units are converted on output based on user preference.
 */

export type UnitSystem = 'metric' | 'imperial';

// --- Conversion constants ---
const M_TO_FT = 3.28084;
const M2_TO_FT2 = M_TO_FT * M_TO_FT;
const M2_TO_ACRES = 1 / 4046.8564224;
const M2_TO_HA = 1 / 10000;

// --- Length formatting ---

/**
 * Format a length value from meters to the active unit system.
 * Returns e.g. "12.34 m" or "40.49 ft".
 */
export function formatLength(meters: number, system: UnitSystem, decimals = 2): string {
  if (system === 'imperial') {
    return `${(meters * M_TO_FT).toFixed(decimals)} ft`;
  }
  return `${meters.toFixed(decimals)} m`;
}

/**
 * Format a short length (constraint widths, brush sizes) with 1 decimal.
 */
export function formatShortLength(meters: number, system: UnitSystem): string {
  if (system === 'imperial') {
    return `${(meters * M_TO_FT).toFixed(1)} ft`;
  }
  return `${meters.toFixed(1)} m`;
}

/**
 * Return just the unit suffix for the active system.
 */
export function lengthUnit(system: UnitSystem): string {
  return system === 'imperial' ? 'ft' : 'm';
}

// --- Area formatting ---

/**
 * Format an area value from square meters to the active unit system.
 * Large areas → hectares / acres, small areas → m² / ft².
 */
export function formatArea(m2: number, system: UnitSystem): string {
  if (system === 'imperial') {
    const acres = m2 * M2_TO_ACRES;
    if (acres >= 0.1) {
      return `${acres.toFixed(2)} ac`;
    }
    return `${(m2 * M2_TO_FT2).toFixed(0)} ft²`;
  }
  const ha = m2 * M2_TO_HA;
  if (ha >= 0.01) {
    return `${ha.toFixed(2)} ha`;
  }
  return `${m2.toFixed(0)} m²`;
}

/**
 * Format area with both systems shown, e.g. "2.50 ha (6.18 ac)".
 */
export function formatAreaDual(m2: number): string {
  const ha = m2 * M2_TO_HA;
  const acres = m2 * M2_TO_ACRES;
  if (ha >= 0.01) {
    return `${ha.toFixed(2)} ha (${acres.toFixed(2)} ac)`;
  }
  return `${m2.toFixed(0)} m² (${(m2 * M2_TO_FT2).toFixed(0)} ft²)`;
}

// --- Coordinate formatting ---

/**
 * Format a coordinate value.
 */
export function formatCoord(meters: number, system: UnitSystem): string {
  if (system === 'imperial') {
    return (meters * M_TO_FT).toFixed(2);
  }
  return meters.toFixed(2);
}

// --- Input conversion (display unit → meters) ---

/**
 * Convert a display-unit length value to internal meters.
 */
export function toMeters(value: number, system: UnitSystem): number {
  if (system === 'imperial') {
    return value / M_TO_FT;
  }
  return value;
}

/**
 * Convert internal meters to display-unit value (for populating inputs).
 */
export function fromMeters(meters: number, system: UnitSystem): number {
  if (system === 'imperial') {
    return meters * M_TO_FT;
  }
  return meters;
}
