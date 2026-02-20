/**
 * Hit Testing Utilities - Detect clicks on geometries
 */

import type { PathElement } from '../../../shared/types';

export interface HitTestResult {
  id: string;
  type: 'path';
  distance: number;
}

/**
 * Check if point is near any path element
 */
export function hitTestPaths(
  worldPos: [number, number],
  pathElements: Map<string, PathElement>,
  tolerance: number
): HitTestResult | null {
  let closest: HitTestResult | null = null;
  let minDist = tolerance;

  for (const [id, element] of pathElements) {
    const dist = distanceToGeometry(worldPos, element.geometry);
    if (dist < minDist) {
      minDist = dist;
      closest = { id, type: 'path', distance: dist };
    }
  }

  return closest;
}

/**
 * Distance from point to geometry
 */
function distanceToGeometry(point: [number, number], geometry: any): number {
  if (geometry.type === 'LineString') {
    return distanceToLineString(point, geometry.coordinates);
  }

  if (geometry.type === 'Polygon') {
    if (pointInPolygon(point, geometry.coordinates[0])) {
      return 0;
    }
    return distanceToLineString(point, geometry.coordinates[0]);
  }

  if (geometry.type === 'MultiLineString') {
    let minDist = Infinity;
    for (const line of geometry.coordinates) {
      const d = distanceToLineString(point, line);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  return Infinity;
}

/**
 * Distance from point to line string
 */
function distanceToLineString(
  point: [number, number],
  coords: [number, number][]
): number {
  let minDist = Infinity;

  for (let i = 0; i < coords.length - 1; i++) {
    const d = distanceToSegment(point, coords[i], coords[i + 1]);
    if (d < minDist) minDist = d;
  }

  return minDist;
}

/**
 * Distance from point to line segment
 */
function distanceToSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return Math.hypot(p[0] - a[0], p[1] - a[1]);
  }

  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a[0] + t * dx;
  const projY = a[1] + t * dy;

  return Math.hypot(p[0] - projX, p[1] - projY);
}

/**
 * Check if point is inside polygon
 */
function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  let inside = false;
  const [x, y] = point;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if geometry intersects rectangle (for marquee selection)
 */
export function geometryIntersectsRect(
  geometry: any,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): boolean {
  const bounds = getGeometryBounds(geometry);

  // AABB intersection test
  return !(
    bounds.maxX < minX ||
    bounds.minX > maxX ||
    bounds.maxY < minY ||
    bounds.minY > maxY
  );
}

/**
 * Get bounding box of geometry
 */
export function getGeometryBounds(geometry: any): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  function processCoords(coords: any): void {
    if (typeof coords[0] === 'number') {
      minX = Math.min(minX, coords[0]);
      minY = Math.min(minY, coords[1]);
      maxX = Math.max(maxX, coords[0]);
      maxY = Math.max(maxY, coords[1]);
    } else {
      for (const c of coords) processCoords(c);
    }
  }

  if (geometry.coordinates) {
    processCoords(geometry.coordinates);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Draw geometry outline on canvas
 */
export function drawGeometryOutline(
  ctx: CanvasRenderingContext2D,
  geometry: any
): void {
  ctx.beginPath();

  if (geometry.type === 'LineString') {
    const coords = geometry.coordinates;
    ctx.moveTo(coords[0][0], coords[0][1]);
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i][0], coords[i][1]);
    }
  } else if (geometry.type === 'Polygon') {
    for (const ring of geometry.coordinates) {
      ctx.moveTo(ring[0][0], ring[0][1]);
      for (let i = 1; i < ring.length; i++) {
        ctx.lineTo(ring[i][0], ring[i][1]);
      }
      ctx.closePath();
    }
  } else if (geometry.type === 'MultiLineString') {
    for (const line of geometry.coordinates) {
      ctx.moveTo(line[0][0], line[0][1]);
      for (let i = 1; i < line.length; i++) {
        ctx.lineTo(line[i][0], line[i][1]);
      }
    }
  }

  ctx.stroke();
}
