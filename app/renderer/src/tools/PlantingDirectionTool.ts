/**
 * PlantingDirectionTool - Click and drag on the canvas to set planting direction.
 *
 * User clicks a start point and drags to define the direction rows will run.
 * The angle is calculated from the drag vector and stored in planterConfig.
 * After releasing, the tool switches back to 'select'.
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useDesignStore } from '../stores/designStore';
import { useUiStore } from '../stores/uiStore';

let dragStart: [number, number] | null = null;
let dragEnd: [number, number] | null = null;

export const PlantingDirectionTool: Tool = {
  name: 'planting_direction',
  cursor: 'crosshair',
  hint: 'Click and drag to set planting direction. Release to confirm.',

  onMouseDown(_e: MouseEvent, worldPos: [number, number]) {
    dragStart = worldPos;
    dragEnd = worldPos;
  },

  onMouseMove(_e: MouseEvent, worldPos: [number, number]) {
    if (dragStart) {
      dragEnd = worldPos;
    }
  },

  onMouseUp(_e: MouseEvent, worldPos: [number, number]) {
    if (!dragStart) return;

    const dx = worldPos[0] - dragStart[0];
    const dy = worldPos[1] - dragStart[1];
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1) {
      // Calculate angle: atan2 gives angle from positive X axis
      // We want 0° = North (positive Y in world coords), 90° = East (positive X)
      // In canvas: Y is flipped, so positive Y in world = up on screen
      // atan2(dx, dy) gives angle from North clockwise
      let angleDeg = Math.atan2(dx, dy) * (180 / Math.PI);
      // Normalize to 0-360
      if (angleDeg < 0) angleDeg += 360;
      // Round to nearest degree
      angleDeg = Math.round(angleDeg);

      useDesignStore.getState().setPlanterConfig({ directionDeg: angleDeg });
    }

    dragStart = null;
    dragEnd = null;

    // Switch back to select tool
    useUiStore.getState().setTool('select');
  },

  onMouseLeave() {
    dragStart = null;
    dragEnd = null;
  },

  renderOverlay(ctx: CanvasRenderingContext2D, camera: Camera) {
    if (!dragStart || !dragEnd) return;

    const dx = dragEnd[0] - dragStart[0];
    const dy = dragEnd[1] - dragStart[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5) return;

    // Draw direction line
    ctx.save();

    // Transform to world coordinates
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 2 / camera.scale;
    ctx.setLineDash([6 / camera.scale, 4 / camera.scale]);

    ctx.beginPath();
    ctx.moveTo(dragStart[0], dragStart[1]);
    ctx.lineTo(dragEnd[0], dragEnd[1]);
    ctx.stroke();

    // Draw arrowhead at the end
    const arrowLen = 12 / camera.scale;
    const angle = Math.atan2(dy, dx);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(dragEnd[0], dragEnd[1]);
    ctx.lineTo(
      dragEnd[0] - arrowLen * Math.cos(angle - Math.PI / 6),
      dragEnd[1] - arrowLen * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(dragEnd[0], dragEnd[1]);
    ctx.lineTo(
      dragEnd[0] - arrowLen * Math.cos(angle + Math.PI / 6),
      dragEnd[1] - arrowLen * Math.sin(angle + Math.PI / 6),
    );
    ctx.stroke();

    // Show angle label
    let angleDeg = Math.atan2(dx, dy) * (180 / Math.PI);
    if (angleDeg < 0) angleDeg += 360;
    angleDeg = Math.round(angleDeg);

    const labelX = (dragStart[0] + dragEnd[0]) / 2;
    const labelY = (dragStart[1] + dragEnd[1]) / 2;
    const fontSize = 14 / camera.scale;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = '#e65100';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${angleDeg}°`, labelX, labelY - 4 / camera.scale);

    ctx.restore();
  },
};
