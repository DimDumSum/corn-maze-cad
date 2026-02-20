/**
 * Snap Engine - Intelligent snapping system for precise drawing
 */

import type { Camera } from '../../../shared/types';

export type SnapType = 'endpoint' | 'midpoint' | 'center' | 'grid' | 'intersection';

export interface SnapResult {
  point: [number, number];
  type: SnapType;
  distance: number; // screen pixels to original point
}

interface SnapEngineOptions {
  gridSize: number;
  tolerance: number; // screen pixels, default 10
  camera: Camera;
}

export class SnapEngine {
  private gridSize: number;
  private tolerance: number;
  private camera: Camera;

  constructor(options: SnapEngineOptions) {
    this.gridSize = options.gridSize;
    this.tolerance = options.tolerance;
    this.camera = options.camera;
  }

  /**
   * Find the best snap point for the given world position
   */
  findSnap(
    worldPos: [number, number],
    geometries: any[],
    enabledTypes: SnapType[]
  ): SnapResult | null {
    const candidates: SnapResult[] = [];

    // Convert tolerance from screen pixels to world units
    const worldTolerance = this.tolerance / this.camera.scale;

    // Check each snap type in priority order
    if (enabledTypes.includes('endpoint')) {
      const endpointSnap = this.findEndpointSnap(worldPos, geometries, worldTolerance);
      if (endpointSnap) candidates.push(endpointSnap);
    }

    if (enabledTypes.includes('midpoint')) {
      const midpointSnap = this.findMidpointSnap(worldPos, geometries, worldTolerance);
      if (midpointSnap) candidates.push(midpointSnap);
    }

    if (enabledTypes.includes('center')) {
      const centerSnap = this.findCenterSnap(worldPos, geometries, worldTolerance);
      if (centerSnap) candidates.push(centerSnap);
    }

    if (enabledTypes.includes('intersection')) {
      const intersectionSnap = this.findIntersectionSnap(worldPos, geometries, worldTolerance);
      if (intersectionSnap) candidates.push(intersectionSnap);
    }

    if (enabledTypes.includes('grid')) {
      const gridSnap = this.findGridSnap(worldPos, worldTolerance);
      if (gridSnap) candidates.push(gridSnap);
    }

    // Return the closest snap, or null if none found
    if (candidates.length === 0) return null;

    return candidates.reduce((closest, current) =>
      current.distance < closest.distance ? current : closest
    );
  }

  /**
   * Find snap to endpoints (vertices)
   */
  private findEndpointSnap(
    worldPos: [number, number],
    geometries: any[],
    worldTolerance: number
  ): SnapResult | null {
    let closestPoint: [number, number] | null = null;
    let closestDistance = Infinity;

    for (const geometry of geometries) {
      if (!geometry) continue;

      const vertices = this.getVertices(geometry);
      for (const vertex of vertices) {
        const dist = this.distance(worldPos, vertex);
        if (dist < worldTolerance && dist < closestDistance) {
          closestDistance = dist;
          closestPoint = vertex;
        }
      }
    }

    if (closestPoint) {
      return {
        point: closestPoint,
        type: 'endpoint',
        distance: closestDistance * this.camera.scale, // Convert back to screen pixels
      };
    }

    return null;
  }

  /**
   * Find snap to midpoints of line segments
   */
  private findMidpointSnap(
    worldPos: [number, number],
    geometries: any[],
    worldTolerance: number
  ): SnapResult | null {
    let closestPoint: [number, number] | null = null;
    let closestDistance = Infinity;

    for (const geometry of geometries) {
      if (!geometry) continue;

      const vertices = this.getVertices(geometry);

      // Check midpoints of all segments
      for (let i = 0; i < vertices.length - 1; i++) {
        const midpoint = this.getMidpoint(vertices[i], vertices[i + 1]);
        const dist = this.distance(worldPos, midpoint);

        if (dist < worldTolerance && dist < closestDistance) {
          closestDistance = dist;
          closestPoint = midpoint;
        }
      }
    }

    if (closestPoint) {
      return {
        point: closestPoint,
        type: 'midpoint',
        distance: closestDistance * this.camera.scale,
      };
    }

    return null;
  }

  /**
   * Find snap to center of shapes (bounding box center)
   */
  private findCenterSnap(
    worldPos: [number, number],
    geometries: any[],
    worldTolerance: number
  ): SnapResult | null {
    let closestPoint: [number, number] | null = null;
    let closestDistance = Infinity;

    for (const geometry of geometries) {
      if (!geometry) continue;

      const vertices = this.getVertices(geometry);
      if (vertices.length === 0) continue;

      // Calculate bounding box center
      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;

      for (const [x, y] of vertices) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      const center: [number, number] = [(minX + maxX) / 2, (minY + maxY) / 2];
      const dist = this.distance(worldPos, center);

      if (dist < worldTolerance && dist < closestDistance) {
        closestDistance = dist;
        closestPoint = center;
      }
    }

    if (closestPoint) {
      return {
        point: closestPoint,
        type: 'center',
        distance: closestDistance * this.camera.scale,
      };
    }

    return null;
  }

  /**
   * Find snap to grid intersections
   */
  private findGridSnap(
    worldPos: [number, number],
    worldTolerance: number
  ): SnapResult | null {
    const [x, y] = worldPos;

    // Snap to nearest grid intersection
    const snappedX = Math.round(x / this.gridSize) * this.gridSize;
    const snappedY = Math.round(y / this.gridSize) * this.gridSize;

    const gridPoint: [number, number] = [snappedX, snappedY];
    const dist = this.distance(worldPos, gridPoint);

    if (dist < worldTolerance) {
      return {
        point: gridPoint,
        type: 'grid',
        distance: dist * this.camera.scale,
      };
    }

    return null;
  }

  /**
   * Find snap to line intersections
   */
  private findIntersectionSnap(
    worldPos: [number, number],
    geometries: any[],
    worldTolerance: number
  ): SnapResult | null {
    let closestPoint: [number, number] | null = null;
    let closestDistance = Infinity;

    // Extract all line segments
    const segments: Array<[[number, number], [number, number]]> = [];
    for (const geometry of geometries) {
      if (!geometry) continue;

      const vertices = this.getVertices(geometry);
      for (let i = 0; i < vertices.length - 1; i++) {
        segments.push([vertices[i], vertices[i + 1]]);
      }
    }

    // Check all pairs of segments for intersections
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const intersection = this.findLineIntersection(
          segments[i][0],
          segments[i][1],
          segments[j][0],
          segments[j][1]
        );

        if (intersection) {
          const dist = this.distance(worldPos, intersection);
          if (dist < worldTolerance && dist < closestDistance) {
            closestDistance = dist;
            closestPoint = intersection;
          }
        }
      }
    }

    if (closestPoint) {
      return {
        point: closestPoint,
        type: 'intersection',
        distance: closestDistance * this.camera.scale,
      };
    }

    return null;
  }

  /**
   * Find intersection point of two line segments (if it exists)
   */
  private findLineIntersection(
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
    p4: [number, number]
  ): [number, number] | null {
    const [x1, y1] = p1;
    const [x2, y2] = p2;
    const [x3, y3] = p3;
    const [x4, y4] = p4;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    // Lines are parallel
    if (Math.abs(denom) < 1e-10) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    // Check if intersection is within both segments
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const x = x1 + t * (x2 - x1);
      const y = y1 + t * (y2 - y1);
      return [x, y];
    }

    return null;
  }

  /**
   * Calculate Euclidean distance between two points
   */
  private distance(p1: [number, number], p2: [number, number]): number {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate midpoint of a line segment
   */
  private getMidpoint(p1: [number, number], p2: [number, number]): [number, number] {
    return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  }

  /**
   * Extract all vertices from a GeoJSON geometry
   */
  private getVertices(geometry: any): [number, number][] {
    if (!geometry || !geometry.type) return [];

    switch (geometry.type) {
      case 'Point':
        return [geometry.coordinates];

      case 'LineString':
        return geometry.coordinates;

      case 'Polygon':
        // Return exterior ring vertices
        return geometry.coordinates[0];

      case 'MultiPoint':
        return geometry.coordinates;

      case 'MultiLineString':
        return geometry.coordinates.flat();

      case 'MultiPolygon':
        // Return vertices from all exterior rings
        return geometry.coordinates.map((poly: any) => poly[0]).flat();

      default:
        return [];
    }
  }
}
