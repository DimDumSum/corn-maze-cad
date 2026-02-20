/**
 * Pan Tool - Click and drag to pan the canvas view
 */

import type { Tool } from './types';
import { useUiStore } from '../stores/uiStore';

let isDragging = false;
let lastPos: [number, number] = [0, 0];

export const PanTool: Tool = {
  name: 'pan',
  cursor: 'grab',
  hint: 'Click and drag to pan the view',

  onMouseDown: (e: MouseEvent, worldPos: [number, number]) => {
    isDragging = true;
    lastPos = [e.clientX, e.clientY];

    // Change cursor to grabbing
    document.body.style.cursor = 'grabbing';
  },

  onMouseMove: (e: MouseEvent, worldPos: [number, number]) => {
    if (!isDragging) return;

    const { panCamera, camera } = useUiStore.getState();

    // Calculate delta in screen space
    const deltaX = e.clientX - lastPos[0];
    const deltaY = e.clientY - lastPos[1];

    // Pan the camera
    panCamera(deltaX, deltaY);

    // Update last position
    lastPos = [e.clientX, e.clientY];
  },

  onMouseUp: (e: MouseEvent, worldPos: [number, number]) => {
    isDragging = false;
    document.body.style.cursor = 'grab';
  },

  onMouseLeave: () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = 'grab';
    }
  },
};
