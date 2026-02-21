/**
 * Draw Path Tool - Professional SketchUp-style freehand path drawing
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useUiStore } from '../stores/uiStore';
import { useConstraintStore } from '../stores/constraintStore';
import { useDesignStore } from '../stores/designStore';
import { SnapEngine } from '../snapping/SnapEngine';
import { fmtLen } from '../utils/fmt';

// Minimum distance in screen pixels between points (prevents too many points)
const MIN_POINT_DISTANCE_PX = 5;

/**
 * Convert world coordinates to screen coordinates
 */
function worldToScreen(
  worldPos: [number, number],
  camera: Camera
): [number, number] {
  return [
    worldPos[0] * camera.scale + camera.x,
    worldPos[1] * camera.scale + camera.y,
  ];
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

/**
 * Apply snapping to a world position
 */
function applySnap(worldPos: [number, number]): [number, number] {
  const { snapToGrid, gridSize, camera, setCurrentSnap } = useUiStore.getState();
  const { field } = useDesignStore.getState();

  if (!snapToGrid) {
    setCurrentSnap(null);
    return worldPos;
  }

  // Create snap engine
  const snapEngine = new SnapEngine({
    gridSize,
    tolerance: 10,
    camera,
  });

  // Collect geometries for snapping
  const geometries: any[] = [];
  if (field?.geometry) geometries.push(field.geometry);

  // Find snap
  const snap = snapEngine.findSnap(worldPos, geometries, [
    'endpoint',
    'midpoint',
    'grid',
    'intersection',
  ]);

  setCurrentSnap(snap);
  return snap ? snap.point : worldPos;
}

/**
 * Check if point is far enough from last point (in screen space)
 */
function shouldAddPoint(
  newWorldPos: [number, number],
  lastWorldPos: [number, number],
  camera: Camera
): boolean {
  const newScreen = worldToScreen(newWorldPos, camera);
  const lastScreen = worldToScreen(lastWorldPos, camera);

  const distance = Math.hypot(
    newScreen[0] - lastScreen[0],
    newScreen[1] - lastScreen[1]
  );

  return distance >= MIN_POINT_DISTANCE_PX;
}

export const DrawPathTool: Tool = {
  name: 'draw',
  cursor: 'crosshair',
  hint: 'Click and drag to draw freehand path. Hold Shift for 45° angles. Press Escape to cancel.',

  onMouseDown: (_e: MouseEvent, worldPos: [number, number]) => {
    const snappedPos = applySnap(worldPos);
    const { startDrawing } = useUiStore.getState();
    startDrawing(snappedPos);
  },

  onMouseMove: (_e: MouseEvent, worldPos: [number, number]) => {
    const {
      isDrawing,
      updateDrawing,
      currentPath,
      camera,
      angleConstraint,
    } = useUiStore.getState();

    if (!isDrawing || currentPath.length === 0) return;

    let newPos = worldPos;

    // Apply snapping
    newPos = applySnap(newPos);

    // Apply angle constraint if Shift is held
    if (angleConstraint && currentPath.length > 0) {
      const lastPoint = currentPath[currentPath.length - 1];
      newPos = constrainToAngle(lastPoint, newPos);
    }

    // Distance check - only add if moved enough (in screen space)
    const lastPoint = currentPath[currentPath.length - 1];
    if (shouldAddPoint(newPos, lastPoint, camera)) {
      updateDrawing(newPos);
    }
  },

  onMouseUp: (_e: MouseEvent, _worldPos: [number, number]) => {
    const { isDrawing, currentPath, clearPath } = useUiStore.getState();

    if (!isDrawing || currentPath.length < 2) {
      clearPath();
      return;
    }

    // Copy path data before clearing
    const pathCopy = [...currentPath] as [number, number][];
    const { pathWidthMin } = useConstraintStore.getState();

    // Add to design store (instant, no network call)
    const { addDesignElement } = useDesignStore.getState();
    addDesignElement({
      type: 'path',
      points: pathCopy,
      width: pathWidthMin || 4.0,
      closed: false,
    });

    if (import.meta.env.DEV) {
      console.log('[DrawPath] Path added to design, ready for validation');
    }

    // INSTANT: Clear drawing path so user can draw next path immediately
    clearPath();
  },

  onMouseLeave: () => {
    const { cancelDrawing, setCurrentSnap } = useUiStore.getState();
    cancelDrawing();
    setCurrentSnap(null);
  },

  renderOverlay: (ctx: CanvasRenderingContext2D, camera: Camera) => {
    const { isDrawing, currentPath } = useUiStore.getState();
    const { pathWidthMin } = useConstraintStore.getState();

    // Show path while drawing OR while processing (waiting for carve to complete)
    if (currentPath.length === 0) return;

    ctx.save();

    // Transform to world coordinates
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, -camera.scale);

    // Choose colors: Blue while drawing, Red while processing
    const isProcessing = !isDrawing && currentPath.length > 0;
    const widthColor = isProcessing ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)';
    const lineColor = isProcessing ? '#ef4444' : '#3b82f6';

    // === LAYER 1: Path width preview (semi-transparent) ===
    // Shows the actual carve width that will be applied
    ctx.strokeStyle = widthColor;
    ctx.lineWidth = pathWidthMin || 4.0; // Actual width in world units
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(currentPath[0][0], currentPath[0][1]);
    for (let i = 1; i < currentPath.length; i++) {
      ctx.lineTo(currentPath[i][0], currentPath[i][1]);
    }
    ctx.stroke();

    // === LAYER 2: Centerline (solid, precise) ===
    // Shows the exact path being drawn
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2 / camera.scale; // 2px on screen, scales with zoom

    ctx.beginPath();
    ctx.moveTo(currentPath[0][0], currentPath[0][1]);
    for (let i = 1; i < currentPath.length; i++) {
      ctx.lineTo(currentPath[i][0], currentPath[i][1]);
    }
    ctx.stroke();

    // === LAYER 3: Start point indicator (green) ===
    ctx.fillStyle = '#22c55e'; // Green
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / camera.scale;

    ctx.beginPath();
    ctx.arc(currentPath[0][0], currentPath[0][1], 5 / camera.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // === LAYER 4: Current point indicator ===
    const lastPoint = currentPath[currentPath.length - 1];
    ctx.fillStyle = lineColor;
    ctx.strokeStyle = '#ffffff';

    ctx.beginPath();
    ctx.arc(lastPoint[0], lastPoint[1], 5 / camera.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // === LAYER 5: Total length label ===
    if (currentPath.length > 1) {
      let totalLength = 0;
      for (let i = 1; i < currentPath.length; i++) {
        const [x1, y1] = currentPath[i - 1];
        const [x2, y2] = currentPath[i];
        totalLength += Math.hypot(x2 - x1, y2 - y1);
      }

      ctx.save();
      ctx.scale(1 / camera.scale, -1 / camera.scale);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.font = 'bold 14px Arial';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const labelX = lastPoint[0] * camera.scale;
      const labelY = -(lastPoint[1] * camera.scale) + 15;
      const label = `Length: ${fmtLen(totalLength)}`;

      ctx.strokeText(label, labelX, labelY);
      ctx.fillText(label, labelX, labelY);
      ctx.restore();
    }

    // === LAYER 6: Processing label ===
    if (isProcessing) {
      ctx.save();
      ctx.scale(1 / camera.scale, -1 / camera.scale);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;

      const labelX = lastPoint[0] * camera.scale;
      const labelY = -(lastPoint[1] * camera.scale) - 15;
      const label = 'Processing...';

      ctx.strokeText(label, labelX, labelY);
      ctx.fillText(label, labelX, labelY);

      ctx.restore();
    }

    ctx.restore();
  },
};
