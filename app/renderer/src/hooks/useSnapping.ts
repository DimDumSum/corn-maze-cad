/**
 * useSnapping Hook - React hook for snapping functionality
 * Provides snap detection and guide line generation for drawing tools
 */

import { useMemo, useCallback } from 'react';
import { useUiStore } from '../stores/uiStore';
import { useDesignStore } from '../stores/designStore';
import { SnapEngine } from '../snapping/SnapEngine';
import type { SnapResult } from '../snapping/SnapEngine';
import type { GuideLine } from '../snapping/SnapVisuals';
import {
  findAlignmentGuides,
  findExtensionGuides,
  findPerpendicularGuides,
} from '../snapping/SnapVisuals';

/**
 * Hook to integrate snapping with the tool system
 */
export function useSnapping() {
  const { snapToGrid, gridSize, showSnapIndicators } = useUiStore();
  const { field, designElements } = useDesignStore();
  const camera = useUiStore((s) => s.camera);

  // Create snap engine (memoized by dependencies)
  const snapEngine = useMemo(
    () =>
      new SnapEngine({
        gridSize,
        tolerance: 10, // 10 screen pixels
        camera,
      }),
    [gridSize, camera]
  );

  // Collect all element points for alignment guides
  const allElementPoints = useMemo((): [number, number][] => {
    const points: [number, number][] = [];

    for (const element of designElements) {
      for (const point of element.points) {
        points.push(point);
      }
    }

    return points;
  }, [designElements]);

  // Collect all line segments for extension/perpendicular guides
  const allSegments = useMemo((): Array<[[number, number], [number, number]]> => {
    const segments: Array<[[number, number], [number, number]]> = [];

    for (const element of designElements) {
      const pts = element.points;
      for (let i = 0; i < pts.length - 1; i++) {
        segments.push([pts[i], pts[i + 1]]);
      }
      // For closed shapes, add the closing segment
      if (element.closed && pts.length > 2) {
        segments.push([pts[pts.length - 1], pts[0]]);
      }
    }

    return segments;
  }, [designElements]);

  // Convert design elements to geometries for snap engine
  const geometries = useMemo(() => {
    const geoms: any[] = [];

    // Add field boundary
    if (field?.geometry) {
      geoms.push(field.geometry);
    }

    // Convert design elements to LineString geometries
    for (const element of designElements) {
      if (element.points.length >= 2) {
        geoms.push({
          type: element.closed ? 'Polygon' : 'LineString',
          coordinates: element.closed
            ? [[...element.points, element.points[0]]]
            : element.points,
        });
      }
    }

    return geoms;
  }, [field, designElements]);

  // Find snap point for the given world position
  const findSnap = useCallback(
    (worldPos: [number, number]): SnapResult | null => {
      if (!snapToGrid) return null;

      // Find the best snap including the new center type
      return snapEngine.findSnap(worldPos, geometries, [
        'endpoint',
        'midpoint',
        'center',
        'grid',
        'intersection',
      ]);
    },
    [snapToGrid, geometries, snapEngine]
  );

  // Find guide lines for the given cursor position
  const findGuides = useCallback(
    (worldPos: [number, number]): GuideLine[] => {
      if (!showSnapIndicators) return [];

      const worldTolerance = 10 / camera.scale;
      const guides: GuideLine[] = [];

      // Find alignment guides (horizontal/vertical)
      const alignmentGuides = findAlignmentGuides(worldPos, allElementPoints, worldTolerance);
      guides.push(...alignmentGuides);

      // Find extension guides
      const extensionGuides = findExtensionGuides(worldPos, allSegments, worldTolerance);
      guides.push(...extensionGuides);

      // Find perpendicular guides
      const perpGuides = findPerpendicularGuides(worldPos, allSegments, worldTolerance);
      guides.push(...perpGuides);

      return guides;
    },
    [showSnapIndicators, camera.scale, allElementPoints, allSegments]
  );

  return { findSnap, findGuides, showSnapIndicators };
}
