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
export type ToolName = 'select' | 'pan' | 'draw' | 'line' | 'rectangle' | 'eraser' | 'restore' | 'measure' | 'move' | 'circle' | 'arc' | 'text' | 'clipart' | 'flip' | 'entrance' | 'exit' | 'emergency_exit' | 'solution_path' | 'dead_end' | 'planting_direction';

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
export const ZOOM_MIN = 0.01;
export const ZOOM_MAX = 200.0;
export const ZOOM_STEP = 0.1;

/**
 * Canvas size defaults
 */
export const CANVAS_DEFAULT_WIDTH = 1400;
export const CANVAS_DEFAULT_HEIGHT = 900;

/**
 * Corn row spacing options (meters)
 */
export const CORN_ROW_SPACING_30IN = 0.762;  // 30 inches
export const CORN_ROW_SPACING_36IN = 0.914;  // 36 inches

/**
 * Default inter-path buffer (6 corn rows at 30" spacing)
 */
export const DEFAULT_INTER_PATH_BUFFER = 4.572;  // 6 * 0.762

/**
 * Autosave interval in milliseconds (30 seconds)
 */
export const AUTOSAVE_INTERVAL_MS = 30000;

/**
 * Default layer definitions
 */
export const DEFAULT_LAYERS = [
  { id: 'boundary', name: 'Field Boundary', type: 'boundary' as const, visible: true, locked: true, opacity: 1, color: '#2e7d32', order: 0 },
  { id: 'aerial', name: 'Aerial Image', type: 'aerial' as const, visible: true, locked: true, opacity: 0.5, order: 1 },
  { id: 'maze', name: 'Maze Walls', type: 'maze' as const, visible: true, locked: false, opacity: 1, color: '#8B6914', order: 2 },
  { id: 'artwork', name: 'Artwork/Design', type: 'artwork' as const, visible: true, locked: false, opacity: 1, color: '#2563eb', order: 3 },
  { id: 'solution', name: 'Solution Path', type: 'solution' as const, visible: true, locked: false, opacity: 1, color: '#dc2626', order: 4 },
  { id: 'dead_ends', name: 'Dead Ends', type: 'dead_ends' as const, visible: true, locked: false, opacity: 0.7, color: '#f59e0b', order: 5 },
  { id: 'annotations', name: 'Annotations', type: 'annotations' as const, visible: true, locked: false, opacity: 1, color: '#7c3aed', order: 6 },
  { id: 'signage', name: 'Signage', type: 'signage' as const, visible: true, locked: false, opacity: 1, color: '#059669', order: 7 },
];
