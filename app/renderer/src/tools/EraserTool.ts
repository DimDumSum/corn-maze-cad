/**
 * Eraser Tool - Professional SketchUp-style element deletion
 * Click on design elements to delete them with undo/redo support
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useUiStore } from '../stores/uiStore';
import { useDesignStore, type DesignElement } from '../stores/designStore';

// Eraser tool state
interface EraserToolState {
  hoveredId: string | null;
}

// Initialize eraser state in uiStore
function getEraserState(): EraserToolState {
  const state = (useUiStore.getState() as any).eraserToolState;
  if (!state) {
    useUiStore.setState({
      eraserToolState: {
        hoveredId: null,
      },
    } as any);
    return (useUiStore.getState() as any).eraserToolState;
  }
  return state;
}

function updateEraserState(updates: Partial<EraserToolState>) {
  const current = getEraserState();
  useUiStore.setState({
    eraserToolState: { ...current, ...updates },
  } as any);
}

/**
 * Hit test design elements at a point
 */
function hitTestDesignElements(
  worldPos: [number, number],
  elements: DesignElement[],
  tolerance: number
): DesignElement | null {
  // Test in reverse order (topmost first)
  for (let i = elements.length - 1; i >= 0; i--) {
    const element = elements[i];
    if (isPointNearElement(worldPos, element, tolerance)) {
      return element;
    }
  }
  return null;
}

/**
 * Check if a point is near an element
 */
function isPointNearElement(
  point: [number, number],
  element: DesignElement,
  tolerance: number
): boolean {
  const points = element.points;
  if (points.length === 0) return false;

  // Check distance to each line segment
  for (let i = 0; i < points.length - 1; i++) {
    const dist = distanceToSegment(point, points[i], points[i + 1]);
    if (dist <= tolerance + element.width / 2) {
      return true;
    }
  }

  // For closed shapes, also check the closing segment
  if (element.closed && points.length > 2) {
    const dist = distanceToSegment(point, points[points.length - 1], points[0]);
    if (dist <= tolerance + element.width / 2) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate distance from a point to a line segment
 */
function distanceToSegment(
  point: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    // Segment is a point
    return Math.hypot(point[0] - a[0], point[1] - a[1]);
  }

  // Project point onto line and clamp to segment
  let t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a[0] + t * dx;
  const projY = a[1] + t * dy;

  return Math.hypot(point[0] - projX, point[1] - projY);
}

export const EraserTool: Tool = {
  name: 'eraser',
  cursor: 'pointer',
  hint: 'Click on elements to delete them. Supports undo (Ctrl+Z).',

  onMouseDown: (_e: MouseEvent, worldPos: [number, number]) => {
    const { camera } = useUiStore.getState();
    const { designElements, removeDesignElement } = useDesignStore.getState();

    const tolerance = 10 / camera.scale; // 10 screen pixels
    const hitElement = hitTestDesignElements(worldPos, designElements, tolerance);

    if (hitElement) {
      if (import.meta.env.DEV) {
        console.log('[EraserTool] Deleting element:', hitElement.id);
      }

      // removeDesignElement already handles undo/redo via snapshot
      removeDesignElement(hitElement.id);

      // Clear hover state
      updateEraserState({ hoveredId: null });
    }
  },

  onMouseMove: (_e: MouseEvent, worldPos: [number, number]) => {
    const { camera } = useUiStore.getState();
    const { designElements } = useDesignStore.getState();

    const tolerance = 10 / camera.scale; // 10 screen pixels
    const hitElement = hitTestDesignElements(worldPos, designElements, tolerance);

    updateEraserState({ hoveredId: hitElement?.id || null });
  },

  onMouseUp: (_e: MouseEvent, _worldPos: [number, number]) => {
    // Nothing to do on mouse up
  },

  onMouseLeave: () => {
    updateEraserState({ hoveredId: null });
  },

  renderOverlay: (ctx: CanvasRenderingContext2D, camera: Camera) => {
    const { designElements } = useDesignStore.getState();
    const eraserState = getEraserState();

    if (eraserState.hoveredId) {
      const element = designElements.find((el) => el.id === eraserState.hoveredId);
      if (element && element.points.length > 0) {
        ctx.save();

        // Transform to world coordinates
        ctx.translate(camera.x, camera.y);
        ctx.scale(camera.scale, -camera.scale);

        // Draw highlight around hovered element (red, bold, dashed)
        ctx.strokeStyle = '#ef4444'; // Red
        ctx.lineWidth = Math.max(element.width + 4 / camera.scale, 4 / camera.scale);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([6 / camera.scale, 3 / camera.scale]);

        ctx.beginPath();
        ctx.moveTo(element.points[0][0], element.points[0][1]);
        for (let i = 1; i < element.points.length; i++) {
          ctx.lineTo(element.points[i][0], element.points[i][1]);
        }
        if (element.closed) {
          ctx.closePath();
        }
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  },
};
