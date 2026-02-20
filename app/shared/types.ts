/**
 * Shared TypeScript type definitions for Corn Maze CAD.
 *
 * Used by both Electron main process and React renderer for type safety.
 */

/**
 * GeoJSON-like geometry structure
 */
export interface GeometryData {
  exterior: [number, number][];
  interiors: [number, number][][];
}

/**
 * Field boundary with geometry and metadata
 */
export interface FieldBoundary {
  geometry: GeometryData;
  crs: string;              // e.g., "EPSG:32615"
  areaHectares: number;
  bounds?: [number, number, number, number];  // [minx, miny, maxx, maxy]
}

/**
 * Maze walls geometry
 */
export interface MazeWalls {
  walls: [number, number][][];  // Array of line segments
}

/**
 * Request to carve a path through maze walls
 */
export interface CarvePathRequest {
  points: [number, number][];
  width?: number;  // Default: 4.0 meters
}

/**
 * Validation result for boundary geometry
 */
export interface ValidationResult {
  is_valid: boolean;
  is_closed: boolean;
  area_m2: number;
  errors: string[];
  warnings: string[];
}

/**
 * Result from importing a boundary file
 */
export interface ImportResult {
  success: boolean;
  geometry?: GeometryData;
  crs?: string;
  source_crs?: string;
  source_format?: string;
  validation?: ValidationResult;
  bounds?: [number, number, number, number];
  area_hectares?: number;
  warnings?: string[];
  error?: string;
}

/**
 * Constraint settings for maze generation
 */
export interface ConstraintSettings {
  pathWidthMin: number;      // Minimum path width in meters
  wallWidthMin: number;      // Minimum wall width in meters
  maxDeadEnds?: number;      // Optional: limit dead ends
  difficultyTarget?: number; // Optional: 0.0 (easy) to 1.0 (hard)
}

/**
 * Supported GIS file format
 */
export interface FileFormat {
  format: string;
  name: string;
  extensions: string[];
  description: string;
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  path: string;
  files: string[];
  error?: string;
}

/**
 * Camera view state for canvas
 */
export interface Camera {
  x: number;
  y: number;
  scale: number;
}

/**
 * Path element drawn by user
 */
export interface PathElement {
  id: string;
  geometry: any;  // GeoJSON geometry
  createdAt: number;
}

/**
 * Command for undo/redo system
 */
export interface Command {
  id: string;
  name: string;         // Human-readable: "Carve Path", "Generate Maze", etc.
  timestamp: number;
  undo: () => void;
  redo: () => void;
}

// === LAYER SYSTEM ===

export interface Layer {
  id: string;
  name: string;
  type: 'boundary' | 'artwork' | 'maze' | 'solution' | 'dead_ends' | 'annotations' | 'signage' | 'aerial';
  visible: boolean;
  locked: boolean;
  opacity: number;
  color?: string;
  order: number;
}

// === ENTRANCE / EXIT ===

export interface EntranceExit {
  id: string;
  type: 'entrance' | 'exit' | 'emergency_exit';
  position: [number, number];
  label?: string;
}

// === DIFFICULTY PHASE ===

export interface DifficultyPhase {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  path: [number, number][];
  length: number;
  solvable: boolean;
}

// === CORN ROW GRID ===

export interface CornRowGrid {
  rowSpacing: number;
  crossPlanted: boolean;
  vLines: [number, number][][];
  hLines: [number, number][][];
}

// === AERIAL IMAGE UNDERLAY ===

export interface AerialUnderlay {
  imageData: string;
  bounds: { minx: number; miny: number; maxx: number; maxy: number };
  opacity: number;
  transform?: {
    scale_x: number;
    scale_y: number;
    offset_x: number;
    offset_y: number;
  };
}

// === FLOW SIMULATION ===

export interface FlowSimulationResult {
  bottlenecks: Array<{ x: number; y: number; visits: number }>;
  avg_solve_steps: number;
  completion_rate: number;
  total_visitors: number;
  completed: number;
}

// === GPS GUIDANCE ===

export interface GuidanceStatus {
  is_active: boolean;
  current_position: [number, number] | null;
  cut_path_length: number;
  total_path_length: number;
  completion_pct: number;
  segments_cut: number;
}
