/**
 * Emergency exit placement tool.
 *
 * Click on the field boundary to place emergency exit points.
 * Emergency exits appear as orange triangle markers.
 */

import type { Tool } from './types';
import type { Camera } from '../../../../shared/types';
import { useDesignStore } from '../stores/designStore';

export const EmergencyExitTool: Tool = {
  name: 'emergency_exit',
  cursor: 'crosshair',
  hint: 'Click to place emergency exit',

  onMouseDown(_e: MouseEvent, worldPos: [number, number]) {
    const store = useDesignStore.getState();
    store.addEmergencyExit(worldPos);

    // Sync with backend
    import('../api/client').then(({ setEmergencyExits }) => {
      const state = useDesignStore.getState();
      setEmergencyExits(state.emergencyExits.map(e => e.position));
    });
  },

  renderOverlay(ctx: CanvasRenderingContext2D, camera: Camera) {
    const { emergencyExits } = useDesignStore.getState();

    for (const exit of emergencyExits) {
      const [wx, wy] = exit.position;
      const sx = wx * camera.scale + camera.x;
      const sy = wy * camera.scale + camera.y;
      const r = 10;

      // Orange triangle
      ctx.fillStyle = 'rgba(255, 165, 0, 0.8)';
      ctx.strokeStyle = '#c87000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy - r);
      ctx.lineTo(sx - r, sy + r);
      ctx.lineTo(sx + r, sy + r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // "!" label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', sx, sy + 2);

      if (exit.label) {
        ctx.fillStyle = '#c87000';
        ctx.font = '11px sans-serif';
        ctx.fillText(exit.label, sx, sy + r + 14);
      }
    }
  },
};
