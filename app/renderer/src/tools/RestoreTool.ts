/**
 * Restore Tool - Draw a path to restore carved corn rows back to their original state.
 * Works like the inverse of carving: click and drag a brush path, then calls /uncarve
 * to add original walls back in that region.
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useUiStore } from '../stores/uiStore';
import { useDesignStore } from '../stores/designStore';
import { fmtShort } from '../utils/fmt';

const MIN_POINT_DISTANCE_PX = 5; // Minimum screen-pixel distance between path points

export function adjustRestoreBrushWidth(delta: number): void {
  const { restoreBrushWidth, setRestoreBrushWidth } = useUiStore.getState();
  setRestoreBrushWidth(restoreBrushWidth + delta);
}

/**
 * Check if a new point is far enough from the last point (in screen space)
 * to avoid collecting too many points during fast drags.
 */
function shouldAddPoint(
  newWorldPos: [number, number],
  lastWorldPos: [number, number],
  camera: Camera
): boolean {
  const dx = (newWorldPos[0] - lastWorldPos[0]) * camera.scale;
  const dy = (newWorldPos[1] - lastWorldPos[1]) * camera.scale;
  return Math.hypot(dx, dy) >= MIN_POINT_DISTANCE_PX;
}

export const RestoreTool: Tool = {
  name: 'restore',
  cursor: 'crosshair',
  hint: 'Click and drag to paint restore area. [ / ] to adjust brush size.',

  onMouseDown: (_e: MouseEvent, worldPos: [number, number]) => {
    const { startDrawing } = useUiStore.getState();
    startDrawing(worldPos);
  },

  onMouseMove: (_e: MouseEvent, worldPos: [number, number]) => {
    const { isDrawing, currentPath, updateDrawing, camera } = useUiStore.getState();

    if (!isDrawing || currentPath.length === 0) return;

    const lastPoint = currentPath[currentPath.length - 1];
    if (shouldAddPoint(worldPos, lastPoint, camera)) {
      updateDrawing(worldPos);
    }
  },

  onMouseUp: (_e: MouseEvent, _worldPos: [number, number]) => {
    const { isDrawing } = useUiStore.getState();
    if (isDrawing) {
      finishRestore();
    }
  },

  onMouseLeave: () => {
    const { isDrawing, cancelDrawing } = useUiStore.getState();
    if (isDrawing) {
      cancelDrawing();
    }
  },

  renderOverlay: (ctx: CanvasRenderingContext2D, camera: Camera) => {
    const { isDrawing, currentPath, selectedTool, mouseWorldPos, restoreBrushWidth } = useUiStore.getState();

    const widthWorld = restoreBrushWidth;

    // Show brush size badge when restore tool is active (even when not drawing)
    if (selectedTool === 'restore' && !isDrawing) {
      ctx.save();
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(34, 197, 94, 0.85)';
      ctx.fillText(`Brush: ${fmtShort(widthWorld)}`, 10, 10);

      // Show brush circle cursor preview at mouse position
      if (mouseWorldPos) {
        ctx.translate(camera.x, camera.y);
        ctx.scale(camera.scale, -camera.scale);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
        ctx.lineWidth = 1.5 / camera.scale;
        ctx.beginPath();
        ctx.arc(mouseWorldPos[0], mouseWorldPos[1], widthWorld / 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
      return;
    }

    if (!isDrawing || currentPath.length < 2) return;

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, -camera.scale);

    // Draw the buffered region preview
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.lineWidth = widthWorld;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.3;

    ctx.beginPath();
    ctx.moveTo(currentPath[0][0], currentPath[0][1]);
    for (let i = 1; i < currentPath.length; i++) {
      ctx.lineTo(currentPath[i][0], currentPath[i][1]);
    }
    ctx.stroke();

    ctx.globalAlpha = 1.0;

    // Draw center line
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2 / camera.scale;
    ctx.setLineDash([6 / camera.scale, 3 / camera.scale]);

    ctx.beginPath();
    ctx.moveTo(currentPath[0][0], currentPath[0][1]);
    for (let i = 1; i < currentPath.length; i++) {
      ctx.lineTo(currentPath[i][0], currentPath[i][1]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw start point
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(currentPath[0][0], currentPath[0][1], 5 / camera.scale, 0, Math.PI * 2);
    ctx.fill();

    // Label
    const midIdx = Math.floor(currentPath.length / 2);
    const mid = currentPath[midIdx];
    ctx.save();
    ctx.translate(mid[0], mid[1]);
    ctx.scale(1, -1);
    ctx.font = `bold ${14 / camera.scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
    ctx.fillText(`RESTORE (${fmtShort(widthWorld)})`, 0, -widthWorld / 2 - 4 / camera.scale);
    ctx.restore();

    ctx.restore();
  },
};

/**
 * Finish restore: call backend /uncarve and update maze state
 */
async function finishRestore(): Promise<void> {
  const { currentPath, endDrawing, restoreBrushWidth } = useUiStore.getState();

  // Capture path and clear drawing state immediately to prevent trailing tail
  const pathCopy = [...currentPath] as [number, number][];
  endDrawing();

  if (pathCopy.length < 2) {
    return;
  }

  const { pushSnapshot } = useDesignStore.getState();

  // Push undo snapshot before modifying
  pushSnapshot();

  try {
    const response = await fetch('http://localhost:8000/geometry/uncarve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: pathCopy,
        width: restoreBrushWidth,
      }),
    });

    const result = await response.json();

    if (result.error) {
      if (import.meta.env.DEV) {
        console.error('[RestoreTool] Uncarve error:', result.error);
      }
    } else {
      // Update maze state with restored walls
      const { setMaze } = useDesignStore.getState();
      setMaze({
        walls: result.walls || [],
        headlandWalls: result.headlandWalls || [],
        carvedAreas: result.carvedAreas || '',
      });
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[RestoreTool] Failed to uncarve:', error);
    }
  }
}
