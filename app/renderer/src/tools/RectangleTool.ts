/**
 * Rectangle Tool - Professional SketchUp-style rectangular path drawing
 * Click and drag to draw rectangle with snapping
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useUiStore } from '../stores/uiStore';
import { useConstraintStore } from '../stores/constraintStore';
import { useDesignStore } from '../stores/designStore';
import { SnapEngine } from '../snapping/SnapEngine';
import {
  findAlignmentGuides,
  findExtensionGuides,
  findPerpendicularGuides,
} from '../snapping/SnapVisuals';

// Rectangle tool fill mode state
interface RectangleToolState {
  fillMode: 'filled' | 'outline';
}

function getRectangleState(): RectangleToolState {
  const state = (useUiStore.getState() as any).rectangleToolState;
  if (!state) {
    useUiStore.setState({
      rectangleToolState: { fillMode: 'outline' },
    } as any);
    return { fillMode: 'outline' };
  }
  return state;
}

function updateRectangleState(updates: Partial<RectangleToolState>) {
  const current = getRectangleState();
  useUiStore.setState({
    rectangleToolState: { ...current, ...updates },
  } as any);
}

/** Toggle between filled and outline carve modes */
export function rectangleToolToggleFillMode() {
  const state = getRectangleState();
  const newMode = state.fillMode === 'filled' ? 'outline' : 'filled';
  updateRectangleState({ fillMode: newMode });
  if (import.meta.env.DEV) {
    console.log('[RectangleTool] Fill mode:', newMode);
  }
}

// Helper to apply snapping to a world position with guide lines
function applySnap(worldPos: [number, number]): [number, number] {
  const { snapToGrid, gridSize, camera, setCurrentSnap, setCurrentGuides, showSnapIndicators } = useUiStore.getState();
  const { field, designElements } = useDesignStore.getState();

  if (!snapToGrid) {
    setCurrentSnap(null);
    setCurrentGuides([]);
    return worldPos;
  }

  // Create snap engine
  const snapEngine = new SnapEngine({
    gridSize,
    tolerance: 10,
    camera,
  });

  // Collect geometries (field + design elements)
  const geometries: any[] = [];
  if (field?.geometry) geometries.push(field.geometry);

  for (const element of designElements) {
    if (element.points.length >= 2) {
      geometries.push({
        type: element.closed ? 'Polygon' : 'LineString',
        coordinates: element.closed
          ? [[...element.points, element.points[0]]]
          : element.points,
      });
    }
  }

  // Find snap (including center type)
  const snap = snapEngine.findSnap(worldPos, geometries, [
    'endpoint',
    'midpoint',
    'center',
    'grid',
    'intersection',
  ]);

  setCurrentSnap(snap);

  // Find guide lines if enabled
  if (showSnapIndicators) {
    const worldTolerance = 10 / camera.scale;
    const guides = [];

    const allPoints: [number, number][] = [];
    const allSegments: Array<[[number, number], [number, number]]> = [];

    for (const element of designElements) {
      for (const point of element.points) {
        allPoints.push(point);
      }
      const pts = element.points;
      for (let i = 0; i < pts.length - 1; i++) {
        allSegments.push([pts[i], pts[i + 1]]);
      }
      if (element.closed && pts.length > 2) {
        allSegments.push([pts[pts.length - 1], pts[0]]);
      }
    }

    guides.push(...findAlignmentGuides(worldPos, allPoints, worldTolerance));
    guides.push(...findExtensionGuides(worldPos, allSegments, worldTolerance));
    guides.push(...findPerpendicularGuides(worldPos, allSegments, worldTolerance));

    setCurrentGuides(guides);
  } else {
    setCurrentGuides([]);
  }

  return snap ? snap.point : worldPos;
}

export const RectangleTool: Tool = {
  name: 'rectangle',
  cursor: 'crosshair',
  hint: 'Click and drag to draw rectangle. Tab = Toggle fill/outline. Shift = Square. Escape = Cancel.',

  onMouseDown: (e: MouseEvent, worldPos: [number, number]) => {
    const snappedPos = applySnap(worldPos);
    const { startDrawing } = useUiStore.getState();

    if (import.meta.env.DEV) {
      console.log('[RectangleTool] onMouseDown - starting position:', snappedPos);
    }

    startDrawing(snappedPos);
  },

  onMouseMove: (e: MouseEvent, worldPos: [number, number]) => {
    const { isDrawing, updateDrawing } = useUiStore.getState();

    // Always update snapping preview
    applySnap(worldPos);

    if (isDrawing) {
      // Use raw worldPos for smooth preview (no snapping during drag)
      updateDrawing(worldPos);
    }
  },

  onMouseUp: (_e: MouseEvent, worldPos: [number, number]) => {
    const snappedPos = applySnap(worldPos);
    const { isDrawing, currentPath, endDrawing } = useUiStore.getState();

    if (isDrawing && currentPath.length > 0) {
      const [x1, y1] = currentPath[0];
      const [x2, y2] = snappedPos;

      if (import.meta.env.DEV) {
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        console.log('[RectangleTool] onMouseUp - final rectangle dimensions:', { width: width.toFixed(2), height: height.toFixed(2), start: [x1, y1], end: [x2, y2] });
      }

      // Create rectangle as a closed LineString (5 points)
      const rectanglePath: [number, number][] = [
        [x1, y1],
        [x2, y1],
        [x2, y2],
        [x1, y2],
        [x1, y1], // Close the rectangle
      ];

      const { pathWidthMin } = useConstraintStore.getState();
      const { fillMode } = getRectangleState();
      const isFilled = fillMode === 'filled';

      // Add to design store (instant, no network call)
      const { addDesignElement } = useDesignStore.getState();
      addDesignElement({
        type: 'rectangle',
        points: rectanglePath,
        width: isFilled ? 0 : (pathWidthMin || 4.0),
        closed: isFilled,
      });

      if (import.meta.env.DEV) {
        console.log('[RectangleTool] Rectangle added to design, ready for validation');
      }
    }

    endDrawing();
  },

  onMouseLeave: () => {
    const { endDrawing, setCurrentSnap, setCurrentGuides } = useUiStore.getState();
    endDrawing();
    setCurrentSnap(null);
    setCurrentGuides([]);
  },

  renderOverlay: (ctx: CanvasRenderingContext2D, camera: Camera) => {
    const { isDrawing, currentPath } = useUiStore.getState();
    const { pathWidthMin } = useConstraintStore.getState();
    const { fillMode } = getRectangleState();
    const isFilled = fillMode === 'filled';

    // === Fill mode badge (always visible when tool is active) ===
    ctx.save();
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const badge = isFilled ? 'Filled' : 'Outline';
    const badgeColor = isFilled ? '#cc3333' : '#ff6600';
    const badgeWidth = ctx.measureText(badge).width + 16;
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.roundRect(10, 52, badgeWidth, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(badge, 18, 56);
    ctx.restore();

    if (isDrawing && currentPath.length > 0) {
      ctx.save();

      // Transform to world coordinates
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.scale, -camera.scale);

      const [x1, y1] = currentPath[0];
      const [x2, y2] = currentPath[currentPath.length - 1];

      const width = x2 - x1;
      const height = y2 - y1;

      if (isFilled) {
        // === FILLED MODE: Show solid fill preview ===
        ctx.fillStyle = 'rgba(204, 51, 51, 0.2)';
        ctx.fillRect(x1, y1, width, height);

        ctx.strokeStyle = '#cc3333';
        ctx.lineWidth = 2 / camera.scale;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x1, y2);
        ctx.closePath();
        ctx.stroke();
      } else {
        // === OUTLINE MODE: Show path width preview ===
        ctx.strokeStyle = 'rgba(255, 102, 0, 0.2)';
        ctx.lineWidth = pathWidthMin || 4.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x1, y2);
        ctx.closePath();
        ctx.stroke();

        // Centerline
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 2 / camera.scale;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x1, y2);
        ctx.closePath();
        ctx.stroke();
      }

      // === Corner points ===
      ctx.fillStyle = isFilled ? '#cc3333' : '#ff6600';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / camera.scale;

      const corners = [
        [x1, y1],
        [x2, y1],
        [x2, y2],
        [x1, y2],
      ];

      for (const [x, y] of corners) {
        ctx.beginPath();
        ctx.arc(x, y, 5 / camera.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // === Dimension labels ===
      const absWidth = Math.abs(width);
      const absHeight = Math.abs(height);

      ctx.save();
      ctx.scale(1 / camera.scale, -1 / camera.scale);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.font = 'bold 14px Arial';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      const dimensionLabel = `${absWidth.toFixed(2)} m × ${absHeight.toFixed(2)} m`;
      const centerX = (x1 + x2) / 2;
      const centerY = (y1 + y2) / 2;
      const labelX = centerX * camera.scale;
      const labelY = -(centerY * camera.scale) - 8;

      ctx.strokeText(dimensionLabel, labelX, labelY);
      ctx.fillText(dimensionLabel, labelX, labelY);
      ctx.restore();
      ctx.restore();
    }
  },
};
