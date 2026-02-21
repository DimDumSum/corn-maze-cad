/**
 * Move Tool - Professional SketchUp-style precise element movement
 * Click-click workflow: Click origin → Click destination
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useUiStore } from '../stores/uiStore';
import { useDesignStore } from '../stores/designStore';

// Move tool state
interface MoveToolState {
  isActive: boolean;
  stage: 'idle' | 'pickingOrigin' | 'pickingDestination';
  origin: [number, number] | null;
  previewDestination: [number, number] | null;
  copyMode: boolean; // Ctrl held = copy instead of move
}

// Initialize move state in uiStore
function getMoveState(): MoveToolState {
  const state = (useUiStore.getState() as any).moveToolState;
  if (!state) {
    useUiStore.setState({
      moveToolState: {
        isActive: false,
        stage: 'idle',
        origin: null,
        previewDestination: null,
        copyMode: false,
      },
    } as any);
    return (useUiStore.getState() as any).moveToolState;
  }
  return state;
}

function updateMoveState(updates: Partial<MoveToolState>) {
  const current = getMoveState();
  useUiStore.setState({
    moveToolState: { ...current, ...updates },
  } as any);
}

/**
 * Get selected element IDs from designStore
 */
function getSelectedIds(): Set<string> {
  return useDesignStore.getState().selectedElementIds;
}

/**
 * Calculate center of selection
 */
function getSelectionCenter(): [number, number] | null {
  const { designElements, selectedElementIds } = useDesignStore.getState();

  if (selectedElementIds.size === 0) return null;

  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  for (const element of designElements) {
    if (!selectedElementIds.has(element.id)) continue;

    for (const point of element.points) {
      minX = Math.min(minX, point[0]);
      minY = Math.min(minY, point[1]);
      maxX = Math.max(maxX, point[0]);
      maxY = Math.max(maxY, point[1]);
    }
  }

  if (minX === Infinity) return null;

  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

/**
 * Constrain point to nearest axis (horizontal, vertical, or 45°)
 */
function constrainToAxis(
  origin: [number, number],
  point: [number, number]
): [number, number] {
  const dx = point[0] - origin[0];
  const dy = point[1] - origin[1];
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Determine dominant axis
  if (absDx > absDy * 2) {
    // Horizontal
    return [point[0], origin[1]];
  } else if (absDy > absDx * 2) {
    // Vertical
    return [origin[0], point[1]];
  } else {
    // 45 degree
    const dist = Math.max(absDx, absDy);
    return [origin[0] + dist * Math.sign(dx), origin[1] + dist * Math.sign(dy)];
  }
}

/**
 * Snap to grid
 */
function snapToGrid(point: [number, number], gridSize: number): [number, number] {
  return [
    Math.round(point[0] / gridSize) * gridSize,
    Math.round(point[1] / gridSize) * gridSize,
  ];
}

export const MoveTool: Tool = {
  name: 'move',
  cursor: 'crosshair',
  hint: 'Click origin, then destination. Ctrl = Copy, Shift = Constrain axis.',

  onMouseDown: async (_e: MouseEvent, worldPos: [number, number]) => {
    const { camera, snapToGrid: snapEnabled, gridSize, angleConstraint } = useUiStore.getState();
    const selectedIds = getSelectedIds();
    const moveState = getMoveState();

    // Check if something is selected
    if (selectedIds.size === 0) {
      if (import.meta.env.DEV) {
        console.log('[MoveTool] Nothing selected to move');
      }
      return;
    }

    // Auto-activate if not active
    if (!moveState.isActive) {
      updateMoveState({
        isActive: true,
        stage: 'pickingOrigin',
        origin: null,
        previewDestination: null,
      });
    }

    if (moveState.stage === 'pickingOrigin') {
      // First click: Set origin point
      let snappedPos = worldPos;

      // Snap to selection center if close
      const selectionCenter = getSelectionCenter();
      if (selectionCenter) {
        const dist = Math.hypot(
          worldPos[0] - selectionCenter[0],
          worldPos[1] - selectionCenter[1]
        );
        if (dist < 10 / camera.scale) {
          snappedPos = selectionCenter;
        }
      }

      // Grid snap
      if (snapEnabled && snappedPos === worldPos) {
        snappedPos = snapToGrid(snappedPos, gridSize);
      }

      updateMoveState({
        stage: 'pickingDestination',
        origin: snappedPos,
      });
    } else if (moveState.stage === 'pickingDestination' && moveState.origin) {
      // Second click: Execute move
      let destPos = worldPos;

      // Grid snap
      if (snapEnabled) {
        destPos = snapToGrid(destPos, gridSize);
      }

      // Axis constraint
      if (angleConstraint) {
        destPos = constrainToAxis(moveState.origin, destPos);
      }

      // Calculate offset
      const offset: [number, number] = [
        destPos[0] - moveState.origin[0],
        destPos[1] - moveState.origin[1],
      ];

      const { copyMode } = moveState;
      const action = copyMode ? 'Copy' : 'Move';

      if (import.meta.env.DEV) {
        console.log(
          `[MoveTool] ${action} ${selectedIds.size} element(s) by [${offset[0].toFixed(2)}, ${offset[1].toFixed(2)}]`
        );
      }

      // Get design store actions
      const {
        designElements,
        updateElementNoHistory,
        addDesignElement,
        pushSnapshot,
      } = useDesignStore.getState();

      // Push snapshot for undo BEFORE making changes
      pushSnapshot();

      // Apply move/copy to each selected element
      for (const id of selectedIds) {
        const element = designElements.find((el) => el.id === id);
        if (!element) continue;

        // Calculate new points with offset
        const newPoints: [number, number][] = element.points.map((pt) => [
          pt[0] + offset[0],
          pt[1] + offset[1],
        ]);

        if (copyMode) {
          // Create a copy at the new position
          addDesignElement({
            type: element.type,
            points: newPoints,
            width: element.width,
            closed: element.closed,
            rotation: element.rotation,
          });
        } else {
          // Move the original element
          updateElementNoHistory(id, { points: newPoints });
        }
      }

      if (import.meta.env.DEV) {
        console.log(`[MoveTool] ${action} complete`);
      }

      // Reset for next operation
      updateMoveState({
        stage: 'pickingOrigin',
        origin: null,
        previewDestination: null,
      });
    }
  },

  onMouseMove: (_e: MouseEvent, worldPos: [number, number]) => {
    const { snapToGrid: snapEnabled, gridSize, angleConstraint } = useUiStore.getState();
    const moveState = getMoveState();

    if (moveState.stage === 'pickingDestination' && moveState.origin) {
      let previewPos = worldPos;

      // Grid snap
      if (snapEnabled) {
        previewPos = snapToGrid(previewPos, gridSize);
      }

      // Axis constraint
      if (angleConstraint) {
        previewPos = constrainToAxis(moveState.origin, previewPos);
      }

      updateMoveState({ previewDestination: previewPos });
    }
  },

  onMouseUp: (_e: MouseEvent, _worldPos: [number, number]) => {
    // Move tool uses click-click, not drag
  },

  onMouseLeave: () => {
    // Don't cancel on mouse leave - user might need to move far
  },

  renderOverlay: (ctx: CanvasRenderingContext2D, camera: Camera) => {
    const { designElements, selectedElementIds } = useDesignStore.getState();
    const moveState = getMoveState();

    if (!moveState.isActive) return;

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, -camera.scale);

    // Stage 1: Picking origin - show selection center
    if (moveState.stage === 'pickingOrigin') {
      const center = getSelectionCenter();
      if (center) {
        ctx.strokeStyle = '#22c55e'; // Green
        ctx.lineWidth = 2 / camera.scale;
        ctx.setLineDash([4 / camera.scale, 2 / camera.scale]);
        ctx.beginPath();
        ctx.arc(center[0], center[1], 8 / camera.scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Crosshair
        const size = 12 / camera.scale;
        ctx.beginPath();
        ctx.moveTo(center[0] - size, center[1]);
        ctx.lineTo(center[0] + size, center[1]);
        ctx.moveTo(center[0], center[1] - size);
        ctx.lineTo(center[0], center[1] + size);
        ctx.stroke();
      }
    }

    // Stage 2: Picking destination - show move vector and preview
    if (moveState.stage === 'pickingDestination' && moveState.origin && moveState.previewDestination) {
      const origin = moveState.origin;
      const dest = moveState.previewDestination;
      const copyMode = moveState.copyMode;

      const offset: [number, number] = [dest[0] - origin[0], dest[1] - origin[1]];
      const distance = Math.hypot(offset[0], offset[1]);

      const color = copyMode ? '#22c55e' : '#3b82f6'; // Green for copy, blue for move

      // Ghost preview of moved/copied selection
      ctx.globalAlpha = 0.4;
      for (const element of designElements) {
        if (!selectedElementIds.has(element.id)) continue;

        ctx.save();
        ctx.translate(offset[0], offset[1]);
        ctx.strokeStyle = color;
        ctx.lineWidth = element.width || 2 / camera.scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw element outline
        ctx.beginPath();
        if (element.points.length > 0) {
          ctx.moveTo(element.points[0][0], element.points[0][1]);
          for (let i = 1; i < element.points.length; i++) {
            ctx.lineTo(element.points[i][0], element.points[i][1]);
          }
          if (element.closed) ctx.closePath();
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1.0;

      // Move vector line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 / camera.scale;
      ctx.setLineDash([6 / camera.scale, 3 / camera.scale]);
      ctx.beginPath();
      ctx.moveTo(origin[0], origin[1]);
      ctx.lineTo(dest[0], dest[1]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow head
      const angle = Math.atan2(offset[1], offset[0]);
      const arrowSize = 10 / camera.scale;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 / camera.scale;
      ctx.beginPath();
      ctx.moveTo(dest[0], dest[1]);
      ctx.lineTo(
        dest[0] - arrowSize * Math.cos(angle - 0.3),
        dest[1] - arrowSize * Math.sin(angle - 0.3)
      );
      ctx.moveTo(dest[0], dest[1]);
      ctx.lineTo(
        dest[0] - arrowSize * Math.cos(angle + 0.3),
        dest[1] - arrowSize * Math.sin(angle + 0.3)
      );
      ctx.stroke();

      // Origin marker (green)
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 / camera.scale;
      ctx.beginPath();
      ctx.arc(origin[0], origin[1], 5 / camera.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Destination marker
      ctx.fillStyle = color;
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(dest[0], dest[1], 5 / camera.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Distance label
      ctx.save();
      ctx.scale(1 / camera.scale, -1 / camera.scale);
      const midX = (origin[0] + dest[0]) / 2;
      const midY = (origin[1] + dest[1]) / 2;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      const label = copyMode ? `Copy: ${distance.toFixed(2)} m` : `${distance.toFixed(2)} m`;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(label, midX * camera.scale, -(midY * camera.scale) - 10);
      ctx.fillText(label, midX * camera.scale, -(midY * camera.scale) - 10);
      ctx.restore();
    }

    ctx.restore();
  },
};

// Helper functions for keyboard shortcuts
export function moveToolCancel() {
  updateMoveState({
    isActive: false,
    stage: 'idle',
    origin: null,
    previewDestination: null,
    copyMode: false,
  });
}

export function moveToolSetCopyMode(enabled: boolean) {
  updateMoveState({ copyMode: enabled });
}
