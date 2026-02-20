/**
 * API Client - Handles all backend communication
 */

import type { FieldBoundary, MazeWalls } from '../../../shared/types';

const API_BASE_URL = 'http://localhost:8000';

export interface ApiErrorResponse {
  error: string;
}

export type FieldResponse = FieldBoundary & { error?: string };
export type MazeResponse = MazeWalls & { error?: string };
export type ExportResponse = { success: boolean; path?: string; error?: string };

export interface KmlExportResponse {
  success: boolean;
  boundary_path?: string;
  walls_path?: string;
  wall_count?: number;
  error?: string;
}

export interface PngExportResponse {
  success: boolean;
  png_path?: string;
  json_path?: string;
  width_px?: number;
  height_px?: number;
  error?: string;
}

/**
 * Import field boundary from GPS data (demo mode)
 */
export async function importFieldDemo(): Promise<FieldResponse> {
  const response = await fetch(`${API_BASE_URL}/gis/import-gps-data?demo=true`);
  return response.json();
}

/**
 * Import field boundary from coordinates traced on satellite imagery.
 * @param coordinates Array of [lon, lat] pairs in WGS84
 */
export async function importSatelliteBoundary(coordinates: [number, number][]): Promise<FieldResponse> {
  const response = await fetch(`${API_BASE_URL}/gis/import-satellite-boundary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinates }),
  });
  return response.json();
}

/**
 * Import field boundary from file
 */
export async function importFieldFromFile(file: File): Promise<FieldResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/gis/import-boundary`, {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

/**
 * Generate maze with algorithm selection
 */
export type MazeAlgorithm = 'grid' | 'backtracker' | 'prims';

export async function generateMaze(
  spacing: number = 10.0,
  algorithm: MazeAlgorithm = 'backtracker',
  seed?: number,
): Promise<MazeResponse & { algorithm?: string }> {
  const params = new URLSearchParams({ spacing: String(spacing), algorithm });
  if (seed !== undefined) params.set('seed', String(seed));
  const response = await fetch(`${API_BASE_URL}/maze/generate?${params}`);
  return response.json();
}

/**
 * Get maze analysis metrics
 */
export interface MazeMetrics {
  total_wall_length: number;
  dead_end_count: number;
  junction_count: number;
  difficulty_score: number;
  path_count: number;
  field_area_m2: number;
  wall_density: number;
}

export async function getMazeMetrics(): Promise<MazeMetrics> {
  const response = await fetch(`${API_BASE_URL}/analysis/metrics`);
  return response.json();
}

/**
 * Find path through maze (A* pathfinding)
 */
export interface PathfindResult {
  solvable: boolean;
  path: [number, number][] | null;
  length: number;
}

export async function findPath(
  start: [number, number],
  goal: [number, number],
  resolution: number = 2.0,
): Promise<PathfindResult> {
  const response = await fetch(`${API_BASE_URL}/analysis/find-path`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start, goal, resolution }),
  });
  return response.json();
}

// === PROJECT SAVE/LOAD ===

export async function saveProject(projectData: object, filename?: string): Promise<{ success: boolean; path?: string; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/project/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectData, filename }),
  });
  return response.json();
}

export async function loadProject(filename: string): Promise<{ success: boolean; project?: any; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/project/load?filename=${encodeURIComponent(filename)}`, { method: 'POST' });
  return response.json();
}

export async function listProjects(): Promise<{ projects: Array<{ filename: string; name: string; savedAt: string }> }> {
  const response = await fetch(`${API_BASE_URL}/project/list`);
  return response.json();
}

export async function deleteProject(filename: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/project/delete?filename=${encodeURIComponent(filename)}`, { method: 'DELETE' });
  return response.json();
}

export async function autosave(projectData: object): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/project/autosave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectData }),
  });
  return response.json();
}

export async function checkAutosave(): Promise<{ exists: boolean; savedAt?: string }> {
  const response = await fetch(`${API_BASE_URL}/project/autosave/check`);
  return response.json();
}

export async function recoverAutosave(): Promise<{ success: boolean; project?: any }> {
  const response = await fetch(`${API_BASE_URL}/project/autosave/recover`, { method: 'POST' });
  return response.json();
}

/**
 * Carve path through maze
 */
export async function carvePath(
  points: [number, number][],
  width: number = 4.0
): Promise<MazeResponse> {
  const response = await fetch(`${API_BASE_URL}/geometry/carve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points, width }),
  });

  return response.json();
}

/**
 * Set maze walls state (for undo/redo sync)
 */
export async function setWalls(maze: MazeWalls | null): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/geometry/set-walls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walls: maze?.walls || [] }),
  });

  return response.json();
}

/**
 * Export shapefile
 */
export async function exportShapefile(): Promise<ExportResponse> {
  const response = await fetch(`${API_BASE_URL}/export/shapefile`);
  return response.json();
}

/**
 * Export KML files (boundary + walls) for MazeGPS
 */
export async function exportKml(
  name: string = 'maze',
  wallBuffer: number = 1.0,
): Promise<KmlExportResponse> {
  const params = new URLSearchParams({ name, wall_buffer: String(wallBuffer) });
  const response = await fetch(`${API_BASE_URL}/export/kml?${params}`);
  return response.json();
}

/**
 * Export georeferenced PNG + JSON sidecar
 */
export async function exportPng(
  name: string = 'maze_design',
  width: number = 800,
): Promise<PngExportResponse> {
  const params = new URLSearchParams({ name, width: String(width) });
  const response = await fetch(`${API_BASE_URL}/export/png?${params}`);
  return response.json();
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
}

// === Validation Types ===

export interface Violation {
  id: string;
  type: 'wall_width' | 'edge_buffer' | 'corner_radius';
  severity: 'error' | 'warning';
  message: string;
  location: [number, number];
  elementIds: string[];
  actualValue: number;
  requiredValue: number;
  highlightArea?: [number, number][] | null;
}

export interface ValidateRequest {
  elements: Array<{
    id: string;
    type: string;
    points: [number, number][];
    width: number;
    closed: boolean;
    rotation?: number;
  }>;
  maze?: { geometry?: unknown };
  field?: { geometry?: unknown; exterior?: [number, number][] };
  constraints: {
    wallWidthMin: number;
    edgeBuffer: number;
    pathWidthMin: number;
  };
}

export interface ValidateResponse {
  valid: boolean;
  violations: Violation[];
  summary: {
    wallWidth: number;
    edgeBuffer: number;
    total: number;
  };
}

export interface AutoFixRequest {
  elements: ValidateRequest['elements'];
  field?: ValidateRequest['field'];
  constraints: {
    wallWidthMin: number;
    edgeBuffer: number;
  };
}

export interface AutoFixResponse {
  elements: ValidateRequest['elements'];
  fixedCount: number;
  changes: Array<{ elementId: string; change: string }>;
}

/**
 * Validate design elements against constraints
 */
export async function validateDesign(req: ValidateRequest): Promise<ValidateResponse> {
  const response = await fetch(`${API_BASE_URL}/geometry/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return response.json();
}

/**
 * Auto-fix constraint violations
 */
export async function autoFixDesign(req: AutoFixRequest): Promise<AutoFixResponse> {
  const response = await fetch(`${API_BASE_URL}/geometry/auto-fix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return response.json();
}

/**
 * Carve all design elements in batch
 */
export async function carveBatch(
  elements: ValidateRequest['elements'],
  maze?: { geometry?: unknown }
): Promise<{ maze: MazeWalls | null; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/geometry/carve-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ elements, maze }),
  });
  return response.json();
}

// === NEW EXPORT FORMATS ===

export async function exportGpx(name: string = 'maze', includeWalls: boolean = true): Promise<{ success: boolean; path?: string; error?: string }> {
  const params = new URLSearchParams({ name, include_walls: String(includeWalls) });
  const response = await fetch(`${API_BASE_URL}/export/gpx?${params}`);
  return response.json();
}

export async function exportDxf(name: string = 'maze_design'): Promise<{ success: boolean; path?: string; error?: string }> {
  const params = new URLSearchParams({ name });
  const response = await fetch(`${API_BASE_URL}/export/dxf?${params}`);
  return response.json();
}

export async function exportPrintableMap(title: string = 'Corn Maze', showSolution: boolean = false, widthPx: number = 2400): Promise<{ success: boolean; path?: string; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/export/printable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, show_solution: showSolution, width_px: widthPx }),
  });
  return response.json();
}

export async function exportPrescriptionMap(seedRateCorn: number = 38000, seedRatePath: number = 0, pathWidth: number = 2.5): Promise<{ success: boolean; geojson_path?: string; png_path?: string; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/export/prescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seed_rate_corn: seedRateCorn, seed_rate_path: seedRatePath, path_width: pathWidth }),
  });
  return response.json();
}

// === ENTRANCE / EXIT MANAGEMENT ===

export async function setEntrancesExits(entrances: [number, number][], exits: [number, number][]): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/analysis/set-entrances-exits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entrances, exits }),
  });
  return response.json();
}

export async function getEntrancesExits(): Promise<{ entrances: [number, number][]; exits: [number, number][] }> {
  const response = await fetch(`${API_BASE_URL}/analysis/entrances-exits`);
  return response.json();
}

export async function verifySolvable(resolution: number = 2.0): Promise<{ all_solvable: boolean; results: any[] }> {
  const response = await fetch(`${API_BASE_URL}/analysis/verify-solvable?resolution=${resolution}`, { method: 'POST' });
  return response.json();
}

// === EMERGENCY EXITS ===

export async function setEmergencyExits(positions: [number, number][]): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/analysis/set-emergency-exits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positions }),
  });
  return response.json();
}

export async function analyzeEmergencyCoverage(maxDistance: number = 50): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/analysis/analyze-emergency-coverage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_distance: maxDistance }),
  });
  return response.json();
}

export async function suggestEmergencyExits(maxDistance: number = 50): Promise<{ suggestions: [number, number][] }> {
  const response = await fetch(`${API_BASE_URL}/analysis/suggest-emergency-exits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_distance: maxDistance }),
  });
  return response.json();
}

// === CONSTRAINT VALIDATION ===

export async function validateConstraints(params: {
  min_path_width?: number;
  min_wall_width?: number;
  inter_path_buffer?: number;
  edge_buffer?: number;
  max_dead_end_length?: number;
  corn_row_spacing?: number;
} = {}): Promise<{ valid: boolean; violation_count: number; violations: any[]; summary: any }> {
  const response = await fetch(`${API_BASE_URL}/analysis/validate-constraints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return response.json();
}

// === FLOW SIMULATION ===

export async function simulateFlow(numVisitors: number = 100, resolution: number = 2.0, seed?: number): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/analysis/simulate-flow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ num_visitors: numVisitors, resolution, seed }),
  });
  return response.json();
}

// === DIFFICULTY PHASES ===

export async function getDifficultyPhases(numPhases: number = 3, resolution: number = 2.0): Promise<{ phases: any[]; all_solvable: boolean }> {
  const response = await fetch(`${API_BASE_URL}/analysis/difficulty-phases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ num_phases: numPhases, resolution }),
  });
  return response.json();
}

// === DRONE PHOTO ALIGNMENT ===

export async function alignDronePhoto(imageData: string, controlPoints?: any[]): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/analysis/align-drone-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_data: imageData, control_points: controlPoints }),
  });
  return response.json();
}

// === MAZEGPS IMPORT ===

export async function importMazeGPSData(trackingData: any[]): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/analysis/import-mazegps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tracking_data: trackingData }),
  });
  return response.json();
}

// === CORN ROW GRID ===

export async function computeCornRowGrid(rowSpacing: number = 0.762, crossPlanted: boolean = true): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/analysis/corn-row-grid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ row_spacing: rowSpacing, cross_planted: crossPlanted }),
  });
  return response.json();
}

// === PLANTER-BASED ROW GRID ===

export async function computePlanterGrid(
  planterRows: number = 16,
  spacingInches: number = 30,
  directionDeg: number = 0,
  headlands: number = 2,
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/analysis/planter-grid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planter_rows: planterRows,
      spacing_inches: spacingInches,
      direction_deg: directionDeg,
      headlands: headlands,
    }),
  });
  return response.json();
}

// === GPS GUIDANCE ===

export async function startGuidance(pathWidth: number = 2.4): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/guidance/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pathWidth }),
  });
  return response.json();
}

export async function stopGuidance(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/guidance/stop`, { method: 'POST' });
  return response.json();
}

export async function getGuidanceStatus(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/guidance/status`);
  return response.json();
}

export async function updateGuidancePosition(lat: number, lon: number, accuracy: number = 5, heading: number = 0): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/guidance/update-position`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lon, accuracy, heading }),
  });
  return response.json();
}

export async function markCut(startX: number, startY: number, endX: number, endY: number): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/guidance/mark-cut`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startX, startY, endX, endY }),
  });
  return response.json();
}

export async function suggestNextPath(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/guidance/next-path`);
  return response.json();
}
