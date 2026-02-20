/**
 * Flip Tool - Professional SketchUp-style element mirroring
 * Mirrors selected elements across horizontal, vertical, or custom axes
 * Ctrl key enables copy mode
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useUiStore } from '../stores/uiStore';
import { useDesignStore } from '../stores/designStore';

// Flip tool state
interface FlipToolState {
  isActive: boolean;
  mode: 'horizontal' | 'vertical' | 'custom';
  customAngle: number; // degrees, 0 = horizontal
  copyMode: boolean; // Ctrl key to copy instead of move
  previewPaths: Map<string, [number, number][]>; // Previewed flipped paths
}

// Initialize flip state in uiStore
function getFlipState(): FlipToolState {
  const state = (useUiStore.getState() as any).flipToolState;
  if (!state) {
    useUiStore.setState({
      flipToolState: {
        isActive: false,
        mode: 'horizontal',
        customAngle: 0,
        copyMode: false,
        previewPaths: new Map(),
      },
    } as any);
    return (useUiStore.getState() as any).flipToolState;
  }
  return state;
}

function updateFlipState(updates: Partial<FlipToolState>) {
  const current = getFlipState();
  useUiStore.setState({
    flipToolState: { ...current, ...updates },
  } as any);
}

/**
 * Get bounding box center of selected elements
 */
function getSelectionCenter(): [number, number] | null {
  const { designElements, selectedElementIds } = useDesignStore.getState();

  if (selectedElementIds.size === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const element of designElements) {
    if (!selectedElementIds.has(element.id)) continue;

    for (const point of element.points) {
      minX = Math.min(minX, point[0]);
      minY = Math.min(minY, point[1]);
      maxX = Math.max(maxX, point[0]);
      maxY = Math.max(maxY, point[1]);
    }
  }

  if (!isFinite(minX)) return null;

  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

/**
 * Mirror a point across an axis through origin
 * @param point Point to mirror
 * @param origin Axis origin (center point)
 * @param angle Axis angle in degrees (0 = horizontal)
 */
function mirrorPoint(
  point: [number, number],
  origin: [number, number],
  angle: number
): [number, number] {
  // Translate to origin
  const px = point[0] - origin[0];
  const py = point[1] - origin[1];

  // Convert angle to radians
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(2 * rad);
  const sin = Math.sin(2 * rad);

  // Mirror using transformation matrix
  // [cos(2θ)   sin(2θ)]
  // [sin(2θ)  -cos(2θ)]
  const mx = px * cos + py * sin;
  const my = px * sin - py * cos;

  // Translate back
  return [mx + origin[0], my + origin[1]];
}

/**
 * Mirror a path
 */
function mirrorPath(
  path: [number, number][],
  origin: [number, number],
  angle: number
): [number, number][] {
  return path.map((point) => mirrorPoint(point, origin, angle));
}

/**
 * Generate preview of flipped paths
 */
function generateFlipPreview() {
  const { designElements, selectedElementIds } = useDesignStore.getState();
  const flipState = getFlipState();

  const center = getSelectionCenter();
  if (!center) return;

  const angle = flipState.mode === 'horizontal' ? 0 : flipState.mode === 'vertical' ? 90 : flipState.customAngle;

  const previewPaths = new Map<string, [number, number][]>();

  for (const element of designElements) {
    if (!selectedElementIds.has(element.id)) continue;

    const flipped = mirrorPath(element.points, center, angle);
    previewPaths.set(element.id, flipped);
  }

  updateFlipState({ previewPaths });
}

export const FlipTool: Tool = {
  name: 'flip',
  cursor: 'default',
  hint: 'Enter = Execute flip, Ctrl = Copy mode, Arrow keys = Custom angle',

  onMouseDown: (_e: MouseEvent, _worldPos: [number, number]) => {
    // Flip tool doesn't use mouse clicks - uses keyboard shortcuts
  },

  onMouseMove: (_e: MouseEvent, _worldPos: [number, number]) => {
    // No mouse interaction needed
  },

  onMouseUp: (_e: MouseEvent, _worldPos: [number, number]) => {
    // No mouse interaction needed
  },

  onMouseLeave: () => {
    // Keep state on mouse leave
  },

  renderOverlay: (ctx: CanvasRenderingContext2D, camera: Camera) => {
    const flipState = getFlipState();
    const { selectedElementIds } = useDesignStore.getState();

    if (selectedElementIds.size === 0 || flipState.previewPaths.size === 0) return;

    const center = getSelectionCenter();
    if (!center) return;

    ctx.save();

    // Transform to world coordinates
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    const angle = flipState.mode === 'horizontal' ? 0 : flipState.mode === 'vertical' ? 90 : flipState.customAngle;

    // === LAYER 1: Flip axis line ===
    const axisLength = 50 / camera.scale;
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad) * axisLength;
    const dy = Math.sin(rad) * axisLength;

    ctx.strokeStyle = '#ef4444'; // Red for flip axis
    ctx.lineWidth = 2 / camera.scale;
    ctx.setLineDash([8 / camera.scale, 4 / camera.scale]);
    ctx.beginPath();
    ctx.moveTo(center[0] - dx, center[1] - dy);
    ctx.lineTo(center[0] + dx, center[1] + dy);
    ctx.stroke();
    ctx.setLineDash([]);

    // === LAYER 2: Center point ===
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / camera.scale;
    ctx.beginPath();
    ctx.arc(center[0], center[1], 5 / camera.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // === LAYER 3: Preview flipped paths ===
    ctx.strokeStyle = flipState.copyMode ? '#10b981' : '#ef4444'; // Green for copy, red for move
    ctx.lineWidth = 2 / camera.scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.6;

    flipState.previewPaths.forEach((path) => {
      if (path.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(path[0][0], path[0][1]);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i][0], path[i][1]);
      }
      ctx.stroke();
    });

    ctx.globalAlpha = 1.0;

    // === LAYER 4: Labels ===
    ctx.save();
    ctx.scale(1 / camera.scale, 1 / camera.scale);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;

    const labelX = center[0] * camera.scale;
    const labelY = center[1] * camera.scale - 25;

    const modeLabel = flipState.mode === 'horizontal' ? 'Horizontal' : flipState.mode === 'vertical' ? 'Vertical' : `${angle.toFixed(0)}°`;
    const actionLabel = flipState.copyMode ? ' (Copy)' : ' (Move)';
    const fullLabel = modeLabel + actionLabel;

    ctx.strokeText(fullLabel, labelX, labelY);
    ctx.fillText(fullLabel, labelX, labelY);

    ctx.restore();

    ctx.restore();
  },
};

/**
 * Execute flip
 */
export function flipToolExecute() {
  const { designElements, selectedElementIds, pushSnapshot, updateElementNoHistory, addDesignElement } = useDesignStore.getState();
  const flipState = getFlipState();

  if (selectedElementIds.size === 0) {
    if (import.meta.env.DEV) {
      console.log('[FlipTool] No elements selected');
    }
    return;
  }

  const center = getSelectionCenter();
  if (!center) return;

  const angle = flipState.mode === 'horizontal' ? 0 : flipState.mode === 'vertical' ? 90 : flipState.customAngle;
  const { copyMode } = flipState;

  if (import.meta.env.DEV) {
    console.log(`[FlipTool] ${copyMode ? 'Copy & Flip' : 'Flip'} ${selectedElementIds.size} element(s), angle: ${angle}°`);
  }

  // Push snapshot for undo BEFORE making changes
  pushSnapshot();

  // Apply flip to each selected element
  for (const element of designElements) {
    if (!selectedElementIds.has(element.id)) continue;

    // Calculate flipped points
    const flippedPoints = mirrorPath(element.points, center, angle);

    if (copyMode) {
      // Create a copy at the flipped position
      addDesignElement({
        type: element.type,
        points: flippedPoints,
        width: element.width,
        closed: element.closed,
        rotation: element.rotation,
      });
    } else {
      // Move the original element to flipped position
      updateElementNoHistory(element.id, { points: flippedPoints });
    }
  }

  if (import.meta.env.DEV) {
    console.log('[FlipTool] Flip complete');
  }

  // Clear preview
  updateFlipState({ previewPaths: new Map() });
}

/**
 * Set flip mode
 */
export function flipToolSetMode(mode: 'horizontal' | 'vertical' | 'custom') {
  updateFlipState({ mode });
  generateFlipPreview();
}

/**
 * Adjust custom angle
 */
export function flipToolAdjustAngle(delta: number) {
  const flipState = getFlipState();
  let newAngle = (flipState.customAngle + delta) % 360;
  if (newAngle < 0) newAngle += 360;
  updateFlipState({ customAngle: newAngle, mode: 'custom' });
  generateFlipPreview();
}

/**
 * Set copy mode
 */
export function flipToolSetCopyMode(enabled: boolean) {
  updateFlipState({ copyMode: enabled });
  generateFlipPreview();
}

/**
 * Activate flip tool
 */
export function flipToolActivate() {
  updateFlipState({ isActive: true });
  generateFlipPreview();
}

/**
 * Cancel flip tool
 */
export function flipToolCancel() {
  updateFlipState({
    isActive: false,
    previewPaths: new Map(),
  });
}
