/**
 * Solution path tool.
 *
 * Draws the guaranteed solution path from entrance to exit.
 * The solution path is drawn on the 'solution' layer and validated
 * for continuity from entrance to exit.
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useDesignStore } from '../stores/designStore';
import { useUiStore } from '../stores/uiStore';

let pathPoints: [number, number][] = [];

export const SolutionPathTool: Tool = {
  name: 'solution_path',
  cursor: 'crosshair',
  hint: 'Click to trace solution path. Press Enter to finish.',

  onMouseDown(_e: MouseEvent, worldPos: [number, number]) {
    pathPoints.push(worldPos);
    useUiStore.getState().updateDrawing(worldPos);
  },

  onMouseMove(_e: MouseEvent, worldPos: [number, number]) {
    useUiStore.getState().setMouseWorldPos(worldPos);
  },

  renderOverlay(ctx: CanvasRenderingContext2D, camera: Camera) {
    // Draw current solution path in progress
    if (pathPoints.length > 0) {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      for (let i = 0; i < pathPoints.length; i++) {
        const [wx, wy] = pathPoints[i];
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
      for (const [wx, wy] of pathPoints) {
        const sx = wx * camera.scale + camera.x;
        const sy = -wy * camera.scale + camera.y;
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Also draw stored difficulty phase paths
    const { difficultyPhases, activeDifficultyPhase } = useDesignStore.getState();
    const colors: Record<string, string> = { easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444' };

    for (const phase of difficultyPhases) {
      if (activeDifficultyPhase && phase.difficulty !== activeDifficultyPhase) continue;
      if (!phase.path || phase.path.length < 2) continue;

      ctx.strokeStyle = colors[phase.difficulty] || '#dc2626';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();

      for (let i = 0; i < phase.path.length; i++) {
        const sx = phase.path[i][0] * camera.scale + camera.x;
        const sy = -phase.path[i][1] * camera.scale + camera.y;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  },
};

/** Finalize the solution path and add it as a design element */
export function finalizeSolutionPath(): [number, number][] {
  const result = [...pathPoints];
  if (result.length >= 2) {
    useDesignStore.getState().addDesignElement({
      type: 'path',
      points: result,
      width: 2.4,
      closed: false,
    });
  }
  pathPoints = [];
  useUiStore.getState().endDrawing();
  return result;
}

/** Clear the current solution path being drawn */
export function clearSolutionPath() {
  pathPoints = [];
  useUiStore.getState().endDrawing();
}
