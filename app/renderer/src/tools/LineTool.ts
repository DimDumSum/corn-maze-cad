/**
 * Line Tool - Professional SketchUp-style polyline drawing
 * Click-to-place workflow: Click points to build polyline
 * Double-click or press Enter to finish
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

/**
 * Apply snapping to a world position and update guide lines
 */
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

  // Collect geometries for snapping (field + design elements)
  const geometries: any[] = [];
  if (field?.geometry) geometries.push(field.geometry);

  // Convert design elements to snap-compatible geometries
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

  // Find snap (including the new center type)
  const snap = snapEngine.findSnap(worldPos, geometries, [
    'endpoint',
    'midpoint',
    'center',
    'grid',
    'intersection',
  ]);

  setCurrentSnap(snap);

  // Find guide lines if snap indicators are enabled
  if (showSnapIndicators) {
    const worldTolerance = 10 / camera.scale;
    const guides = [];

    // Collect all element points for alignment guides
    const allPoints: [number, number][] = [];
    for (const element of designElements) {
      for (const point of element.points) {
        allPoints.push(point);
      }
    }

    // Collect all segments for extension/perpendicular guides
    const allSegments: Array<[[number, number], [number, number]]> = [];
    for (const element of designElements) {
      const pts = element.points;
      for (let i = 0; i < pts.length - 1; i++) {
        allSegments.push([pts[i], pts[i + 1]]);
      }
      if (element.closed && pts.length > 2) {
        allSegments.push([pts[pts.length - 1], pts[0]]);
      }
    }

    // Find all guide types
    guides.push(...findAlignmentGuides(worldPos, allPoints, worldTolerance));
    guides.push(...findExtensionGuides(worldPos, allSegments, worldTolerance));
    guides.push(...findPerpendicularGuides(worldPos, allSegments, worldTolerance));

    setCurrentGuides(guides);
  } else {
    setCurrentGuides([]);
  }

  return snap ? snap.point : worldPos;
}

/**
 * Constrain point to nearest 45° angle from last point
 */
function constrainToAngle(
  lastPoint: [number, number],
  newPoint: [number, number]
): [number, number] {
  const dx = newPoint[0] - lastPoint[0];
  const dy = newPoint[1] - lastPoint[1];
  const distance = Math.hypot(dx, dy);

  // Get angle and snap to nearest 45°
  const angle = Math.atan2(dy, dx);
  const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);

  return [
    lastPoint[0] + Math.cos(snappedAngle) * distance,
    lastPoint[1] + Math.sin(snappedAngle) * distance,
  ];
}

export const LineTool: Tool = {
  name: 'line',
  cursor: 'crosshair',
  hint: 'Click to place points. Double-click or Enter to finish. Shift = Constrain angles. Escape = Cancel.',

  onMouseDown: async (_e: MouseEvent, worldPos: [number, number]) => {
    const { angleConstraint } = useUiStore.getState();
    const { isDrawing, currentPath, startDrawing, updateDrawing } = useUiStore.getState();

    let snappedPos = applySnap(worldPos);

    // Apply angle constraint if Shift held and we have at least one point
    if (angleConstraint && currentPath.length > 0) {
      snappedPos = constrainToAngle(currentPath[currentPath.length - 1], snappedPos);
    }

    if (!isDrawing || currentPath.length === 0) {
      // First point - start new line
      if (import.meta.env.DEV) {
        console.log('[LineTool] onMouseDown - starting new line at:', snappedPos);
      }
      startDrawing(snappedPos);
    } else {
      // Add point to existing line
      if (import.meta.env.DEV) {
        console.log('[LineTool] onMouseDown - adding point to existing line, pathLength:', currentPath.length + 1, 'newPoint:', snappedPos);
      }
      updateDrawing(snappedPos);
    }

    // Store preview point for rendering
    useUiStore.setState({ previewPoint: null } as any);
  },

  onMouseMove: (_e: MouseEvent, worldPos: [number, number]) => {
    const { isDrawing, currentPath, angleConstraint } = useUiStore.getState();

    // Always update snapping preview (even when not drawing)
    let previewPos = applySnap(worldPos);

    if (!isDrawing || currentPath.length === 0) return;

    // Only apply angle constraint if Shift held
    if (angleConstraint) {
      previewPos = constrainToAngle(currentPath[currentPath.length - 1], previewPos);
    }

    // Store preview position (we'll use this for rendering)
    useUiStore.setState({ previewPoint: previewPos } as any);
  },

  onMouseUp: async (_e: MouseEvent, _worldPos: [number, number]) => {
    // Line tool uses click-to-place, not drag
  },

  onMouseLeave: () => {
    // Clear preview and snap indicators but don't cancel drawing
    useUiStore.setState({ previewPoint: null } as any);
    const { setCurrentSnap, setCurrentGuides } = useUiStore.getState();
    setCurrentSnap(null);
    setCurrentGuides([]);
  },

  renderOverlay: (ctx: CanvasRenderingContext2D, camera: Camera) => {
    const { isDrawing, currentPath } = useUiStore.getState();
    const { pathWidthMin } = useConstraintStore.getState();
    const previewPoint = (useUiStore.getState() as any).previewPoint;

    if (!isDrawing || currentPath.length === 0) return;

    ctx.save();

    // Transform to world coordinates
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    // === LAYER 1: Path width preview (semi-transparent) ===
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)'; // Light blue
    ctx.lineWidth = pathWidthMin || 4.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(currentPath[0][0], currentPath[0][1]);
    for (let i = 1; i < currentPath.length; i++) {
      ctx.lineTo(currentPath[i][0], currentPath[i][1]);
    }
    // Preview line to mouse
    if (previewPoint) {
      ctx.lineTo(previewPoint[0], previewPoint[1]);
    }
    ctx.stroke();

    // === LAYER 2: Centerline (solid, precise) ===
    ctx.strokeStyle = '#3b82f6'; // Solid blue
    ctx.lineWidth = 2 / camera.scale;

    ctx.beginPath();
    ctx.moveTo(currentPath[0][0], currentPath[0][1]);
    for (let i = 1; i < currentPath.length; i++) {
      ctx.lineTo(currentPath[i][0], currentPath[i][1]);
    }
    // Preview line to mouse
    if (previewPoint) {
      ctx.lineTo(previewPoint[0], previewPoint[1]);
    }
    ctx.stroke();

    // === LAYER 3: Placed points (green circles) ===
    ctx.fillStyle = '#22c55e'; // Green
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / camera.scale;

    for (const point of currentPath) {
      ctx.beginPath();
      ctx.arc(point[0], point[1], 5 / camera.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // === LAYER 4: Preview point (red circle) ===
    if (previewPoint) {
      ctx.fillStyle = '#ef4444'; // Red
      ctx.strokeStyle = '#ffffff';

      ctx.beginPath();
      ctx.arc(previewPoint[0], previewPoint[1], 5 / camera.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // === LAYER 5: Dimension labels ===
    ctx.save();
    ctx.scale(1 / camera.scale, 1 / camera.scale);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.font = 'bold 12px Arial';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Calculate and display segment lengths
    let totalLength = 0;
    for (let i = 1; i < currentPath.length; i++) {
      const [x1, y1] = currentPath[i - 1];
      const [x2, y2] = currentPath[i];
      const segmentLength = Math.hypot(x2 - x1, y2 - y1);
      totalLength += segmentLength;

      // Draw segment length label
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const labelX = midX * camera.scale;
      const labelY = midY * camera.scale - 8;
      const label = `${segmentLength.toFixed(2)} m`;

      ctx.strokeText(label, labelX, labelY);
      ctx.fillText(label, labelX, labelY);
    }

    // If there's a preview point, show the upcoming segment length
    if (previewPoint && currentPath.length > 0) {
      const lastPoint = currentPath[currentPath.length - 1];
      const previewLength = Math.hypot(
        previewPoint[0] - lastPoint[0],
        previewPoint[1] - lastPoint[1]
      );

      const midX = (lastPoint[0] + previewPoint[0]) / 2;
      const midY = (lastPoint[1] + previewPoint[1]) / 2;
      const labelX = midX * camera.scale;
      const labelY = midY * camera.scale - 8;
      const label = `${previewLength.toFixed(2)} m`;

      ctx.strokeText(label, labelX, labelY);
      ctx.fillText(label, labelX, labelY);

      // Add preview length to total
      totalLength += previewLength;
    }

    // Draw total length at the end point
    if (currentPath.length > 1 || previewPoint) {
      const endPoint = previewPoint || currentPath[currentPath.length - 1];
      const totalLabelX = endPoint[0] * camera.scale;
      const totalLabelY = endPoint[1] * camera.scale - 28;
      const totalLabel = `Total: ${totalLength.toFixed(2)} m`;

      ctx.font = 'bold 14px Arial';
      ctx.strokeText(totalLabel, totalLabelX, totalLabelY);
      ctx.fillText(totalLabel, totalLabelX, totalLabelY);
    }

    ctx.restore();

    ctx.restore();
  },
};

/**
 * Finish the current line and add to design
 */
export function lineToolFinish() {
  const { isDrawing, currentPath, endDrawing } = useUiStore.getState();

  if (import.meta.env.DEV) {
    console.log('[LineTool] lineToolFinish called - isDrawing:', isDrawing, 'pathLength:', currentPath.length);
  }

  if (!isDrawing || currentPath.length < 2) {
    if (import.meta.env.DEV) {
      console.log('[LineTool] lineToolFinish - invalid state, cancelling');
    }
    endDrawing();
    useUiStore.setState({ previewPoint: null } as any);
    return;
  }

  // Copy path data before clearing
  const pathCopy = [...currentPath] as [number, number][];
  const { pathWidthMin } = useConstraintStore.getState();

  // Add to design store (instant, no network call)
  const { addDesignElement } = useDesignStore.getState();
  addDesignElement({
    type: 'line',
    points: pathCopy,
    width: pathWidthMin || 4.0,
    closed: false,
  });

  if (import.meta.env.DEV) {
    console.log('[LineTool] Line added to design, ready for validation');
  }

  // INSTANT: Clear drawing state so user can draw next line immediately
  endDrawing();
  useUiStore.setState({ previewPoint: null } as any);
}

/**
 * Cancel the current line
 */
export function lineToolCancel() {
  const { cancelDrawing } = useUiStore.getState();
  cancelDrawing();
  useUiStore.setState({ previewPoint: null } as any);
}
