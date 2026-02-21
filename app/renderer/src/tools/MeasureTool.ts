/**
 * Measure Tool - Click two points to measure distance with snapping
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useUiStore } from '../stores/uiStore';
import { useProjectStore } from '../stores/projectStore';
import { SnapEngine } from '../snapping/SnapEngine';

// Helper to apply snapping to a world position
function applySnap(worldPos: [number, number]): [number, number] {
  const { snapToGrid, gridSize, camera, setCurrentSnap } = useUiStore.getState();
  const { field, pathElements } = useProjectStore.getState();

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

  // Collect geometries
  const geometries: any[] = [];
  if (field?.geometry) geometries.push(field.geometry);
  for (const pathElement of pathElements.values()) {
    if (pathElement.geometry) geometries.push(pathElement.geometry);
  }

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

export const MeasureTool: Tool = {
  name: 'measure',
  cursor: 'crosshair',
  hint: 'Click two points to measure distance',

  onMouseDown: (e: MouseEvent, worldPos: [number, number]) => {
    const snappedPos = applySnap(worldPos);
    const { isDrawing, currentPath, startDrawing, endDrawing } = useUiStore.getState();

    if (!isDrawing) {
      // First click - start measurement
      startDrawing(snappedPos);
    } else if (currentPath.length === 1) {
      // Second click - complete measurement
      // Measurement is displayed in the overlay, no need to store it
      endDrawing();
    }
  },

  onMouseMove: (e: MouseEvent, worldPos: [number, number]) => {
    const snappedPos = applySnap(worldPos);
    const { isDrawing, currentPath, updateDrawing } = useUiStore.getState();

    if (isDrawing && currentPath.length === 1) {
      // Update the end point as mouse moves
      updateDrawing(snappedPos);
    }
  },

  onMouseUp: (e: MouseEvent, worldPos: [number, number]) => {
    // Nothing to do on mouse up - handled in onMouseDown
  },

  onMouseLeave: () => {
    // Don't end drawing on mouse leave - allow user to continue
    // But clear the snap indicator
    const { setCurrentSnap } = useUiStore.getState();
    setCurrentSnap(null);
  },

  renderOverlay: (ctx: CanvasRenderingContext2D, camera: Camera) => {
    const { isDrawing, currentPath } = useUiStore.getState();

    if (isDrawing && currentPath.length > 0) {
      ctx.save();

      // Transform to world coordinates
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.scale, -camera.scale);

      const startPoint = currentPath[0];
      const endPoint = currentPath[currentPath.length - 1];

      // Calculate distance
      const dx = endPoint[0] - startPoint[0];
      const dy = endPoint[1] - startPoint[1];
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Draw measurement line
      ctx.strokeStyle = '#9933ff';
      ctx.lineWidth = 2 / camera.scale;
      ctx.setLineDash([5 / camera.scale, 5 / camera.scale]);
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(startPoint[0], startPoint[1]);
      ctx.lineTo(endPoint[0], endPoint[1]);
      ctx.stroke();

      ctx.setLineDash([]); // Reset line dash

      // Draw measurement points
      ctx.fillStyle = '#9933ff';

      // Start point
      ctx.beginPath();
      ctx.arc(startPoint[0], startPoint[1], 5 / camera.scale, 0, Math.PI * 2);
      ctx.fill();

      // End point
      ctx.beginPath();
      ctx.arc(endPoint[0], endPoint[1], 5 / camera.scale, 0, Math.PI * 2);
      ctx.fill();

      // Draw distance label with background
      const midX = (startPoint[0] + endPoint[0]) / 2;
      const midY = (startPoint[1] + endPoint[1]) / 2;

      // Un-flip for text rendering
      ctx.save();
      ctx.translate(midX, midY);
      ctx.scale(1, -1);
      ctx.translate(-midX, -midY);

      ctx.font = `bold ${16 / camera.scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const text = `${distance.toFixed(2)} m`;
      const metrics = ctx.measureText(text);
      const padding = 8 / camera.scale;

      // Background rectangle
      ctx.fillStyle = 'rgba(153, 51, 255, 0.9)';
      ctx.fillRect(
        midX - metrics.width / 2 - padding,
        midY - 8 / camera.scale - padding,
        metrics.width + padding * 2,
        16 / camera.scale + padding * 2
      );

      // Text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, midX, midY);

      // Draw angle and component distances
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        ctx.font = `${12 / camera.scale}px sans-serif`;
        ctx.fillStyle = '#9933ff';

        // Horizontal distance
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(
          `\u0394x: ${Math.abs(dx).toFixed(2)}m`,
          (startPoint[0] + endPoint[0]) / 2,
          Math.max(startPoint[1], endPoint[1]) + 10 / camera.scale
        );

        // Vertical distance
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          `\u0394y: ${Math.abs(dy).toFixed(2)}m`,
          Math.max(startPoint[0], endPoint[0]) + 10 / camera.scale,
          (startPoint[1] + endPoint[1]) / 2
        );

        // Angle
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(
          `${angle.toFixed(1)}\u00B0`,
          startPoint[0] + dx * 0.3,
          startPoint[1] + dy * 0.3 - 5 / camera.scale
        );
      }

      ctx.restore(); // un-flip

      ctx.restore();
    }
  },
};
