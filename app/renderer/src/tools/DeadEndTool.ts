/**
 * Dead end management tool.
 *
 * Click to start a dead end branch, click again to end it.
 * Dead ends are drawn on the 'dead_ends' layer and their
 * length is displayed in real-time.
 */

import type { Tool } from './types';
import type { Camera } from '../../../../shared/types';
import { useDesignStore } from '../stores/designStore';
import { useUiStore } from '../stores/uiStore';

let startPoint: [number, number] | null = null;
let deadEndPoints: [number, number][] = [];

export const DeadEndTool: Tool = {
  name: 'dead_end',
  cursor: 'crosshair',
  hint: 'Click to place dead end branch points. Press Enter to finish.',

  onMouseDown(_e: MouseEvent, worldPos: [number, number]) {
    deadEndPoints.push(worldPos);
    if (!startPoint) {
      startPoint = worldPos;
    }
  },

  onMouseMove(_e: MouseEvent, worldPos: [number, number]) {
    useUiStore.getState().setMouseWorldPos(worldPos);
  },

  renderOverlay(ctx: CanvasRenderingContext2D, camera: Camera) {
    if (deadEndPoints.length === 0) return;

    // Draw dead end path in progress
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    for (let i = 0; i < deadEndPoints.length; i++) {
      const [wx, wy] = deadEndPoints[i];
      const sx = wx * camera.scale + camera.x;
      const sy = -wy * camera.scale + camera.y;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }

    // Draw to current mouse position
    const mousePos = useUiStore.getState().mouseWorldPos;
    if (mousePos) {
      const sx = mousePos[0] * camera.scale + camera.x;
      const sy = -mousePos[1] * camera.scale + camera.y;
      ctx.lineTo(sx, sy);
    }

    ctx.stroke();
    ctx.setLineDash([]);

    // Draw vertices
    for (const [wx, wy] of deadEndPoints) {
      const sx = wx * camera.scale + camera.x;
      const sy = -wy * camera.scale + camera.y;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Show dead end length
    let totalLength = 0;
    for (let i = 1; i < deadEndPoints.length; i++) {
      const dx = deadEndPoints[i][0] - deadEndPoints[i - 1][0];
      const dy = deadEndPoints[i][1] - deadEndPoints[i - 1][1];
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }

    if (totalLength > 0) {
      const lastPt = deadEndPoints[deadEndPoints.length - 1];
      const sx = lastPt[0] * camera.scale + camera.x;
      const sy = -lastPt[1] * camera.scale + camera.y;

      ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${totalLength.toFixed(1)}m`, sx + 12, sy);
    }

    // Dead end symbol at start
    if (startPoint) {
      const sx = startPoint[0] * camera.scale + camera.x;
      const sy = -startPoint[1] * camera.scale + camera.y;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 6, sy - 6);
      ctx.lineTo(sx + 6, sy + 6);
      ctx.moveTo(sx + 6, sy - 6);
      ctx.lineTo(sx - 6, sy + 6);
      ctx.stroke();
    }
  },
};

/** Finalize the dead end and add as design element */
export function finalizeDeadEnd(): [number, number][] {
  const result = [...deadEndPoints];
  if (result.length >= 2) {
    useDesignStore.getState().addDesignElement({
      type: 'path',
      points: result,
      width: 2.4,
      closed: false,
    });
  }
  deadEndPoints = [];
  startPoint = null;
  useUiStore.getState().endDrawing();
  return result;
}

/** Clear the current dead end being drawn */
export function clearDeadEnd() {
  deadEndPoints = [];
  startPoint = null;
  useUiStore.getState().endDrawing();
}
