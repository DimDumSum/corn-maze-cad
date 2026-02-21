/**
 * Entrance placement tool.
 *
 * Click on the field boundary to place maze entrance points.
 * Entrances appear as green markers on the canvas.
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useDesignStore } from '../stores/designStore';

export const EntranceTool: Tool = {
  name: 'entrance',
  cursor: 'crosshair',
  hint: 'Click on field boundary to place entrance',

  onMouseDown(_e: MouseEvent, worldPos: [number, number]) {
    const store = useDesignStore.getState();
    store.addEntrance(worldPos);

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
    const { entrances } = useDesignStore.getState();

    for (const entrance of entrances) {
      const [wx, wy] = entrance.position;
      const sx = wx * camera.scale + camera.x;
      const sy = -wy * camera.scale + camera.y;
      const r = 10;

      // Green circle
      ctx.fillStyle = 'rgba(50, 180, 50, 0.8)';
      ctx.strokeStyle = '#1a7a1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // "IN" label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('IN', sx, sy);

      // Label below
      if (entrance.label) {
        ctx.fillStyle = '#1a7a1a';
        ctx.font = '11px sans-serif';
        ctx.fillText(entrance.label, sx, sy + r + 12);
      }
    }
  },
};
