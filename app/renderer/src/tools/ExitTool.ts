/**
 * Exit placement tool.
 *
 * Click on the field boundary to place maze exit points.
 * Exits appear as red markers on the canvas.
 */

import type { Tool } from './types';
import type { Camera } from '../../../../shared/types';
import { useDesignStore } from '../stores/designStore';

export const ExitTool: Tool = {
  name: 'exit',
  cursor: 'crosshair',
  hint: 'Click on field boundary to place exit',

  onMouseDown(_e: MouseEvent, worldPos: [number, number]) {
    const store = useDesignStore.getState();
    store.addExit(worldPos);

    // Sync with backend
    import('../api/client').then(({ setEntrancesExits }) => {
      const state = useDesignStore.getState();
      setEntrancesExits(
        state.entrances.map(e => e.position),
        state.exits.map(e => e.position),
      );
    });
  },

  renderOverlay(ctx: CanvasRenderingContext2D, camera: Camera) {
    const { exits } = useDesignStore.getState();

    for (const exit of exits) {
      const [wx, wy] = exit.position;
      const sx = wx * camera.scale + camera.x;
      const sy = wy * camera.scale + camera.y;
      const r = 10;

      // Red circle
      ctx.fillStyle = 'rgba(220, 50, 50, 0.8)';
      ctx.strokeStyle = '#a01010';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // "OUT" label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('OUT', sx, sy);

      if (exit.label) {
        ctx.fillStyle = '#a01010';
        ctx.font = '11px sans-serif';
        ctx.fillText(exit.label, sx, sy + r + 12);
      }
    }
  },
};
