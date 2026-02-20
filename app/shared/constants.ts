/**
 * Shared constants for Corn Maze CAD.
 *
 * Used by both Electron main process and React renderer.
 */

import type { ConstraintSettings } from './types';

/**
 * Default constraint values for maze generation
 */
export const DEFAULT_CONSTRAINTS = {
  pathWidthMin: 3.0,    // 3 meters minimum path width
  wallWidthMin: 2.0,    // 2 meters minimum wall width
  cornerRadius: 1.5,    // 1.5 meters corner radius
  edgeBuffer: 3.0,      // 3 meters edge buffer
  maxDeadEnds: undefined,      // No limit on dead ends
  difficultyTarget: 0.5, // Medium difficulty
};

/**
 * Tool names for the canvas
 */
export type ToolName = 'select' | 'pan' | 'draw' | 'line' | 'rectangle' | 'eraser' | 'measure' | 'move' | 'circle' | 'arc' | 'text' | 'clipart' | 'flip';

/**
 * Supported GIS file formats
 */
export const SUPPORTED_FORMATS = [
  'kml',
  'kmz',
  'shp',
  'geojson',
  'json',
  'csv',
] as const;

export type SupportedFormat = typeof SUPPORTED_FORMATS[number];

/**
 * Default maze grid spacing in meters
 */
export const DEFAULT_GRID_SPACING = 10.0;

/**
 * Default path carving width in meters
 */
export const DEFAULT_PATH_WIDTH = 4.0;

/**
 * API endpoint base URL (for development)
 */
export const DEFAULT_API_URL = 'http://localhost:8000';

/**
 * Zoom limits for canvas
 */
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 10.0;
export const ZOOM_STEP = 0.1;

/**
 * Canvas size defaults
 */
export const CANVAS_DEFAULT_WIDTH = 1400;
export const CANVAS_DEFAULT_HEIGHT = 900;
