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

/**
 * Save project to file
 */
export async function saveProject(data: object): Promise<{ success: boolean; error?: string }> {
  // This is handled via Electron IPC - just a type helper
  return { success: true };
}

/**
 * Load project from file
 */
export async function loadProject(): Promise<{ success: boolean; data?: object; error?: string }> {
  // This is handled via Electron IPC - just a type helper
  return { success: true };
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
