/**
 * Circle Tool - Professional SketchUp-style circular path drawing
 * Click-click workflow: Click center → Click radius
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useUiStore } from '../stores/uiStore';
import { useConstraintStore } from '../stores/constraintStore';
import { useDesignStore } from '../stores/designStore';
import { SnapEngine } from '../snapping/SnapEngine';
import {
  findAlignmentGuides,
  findExtensionGuides,
  findPerpendicularGuides,
} from '../snapping/SnapVisuals';

// Throttle onMouseMove to ~60fps
let lastMoveTime = 0;

// Circle tool state
interface CircleToolState {
  isActive: boolean;
  stage: 'idle' | 'pickingCenter' | 'pickingRadius';
  center: [number, number] | null;
  previewRadius: number | null;
  segments: number; // Number of sides (default 24, range 3-360)
  fillMode: 'filled' | 'outline';
}

// Initialize circle state in uiStore
function getCircleState(): CircleToolState {
  const state = (useUiStore.getState() as any).circleToolState;
  if (!state) {
    useUiStore.setState({
      circleToolState: {
        isActive: false,
        stage: 'idle',
        center: null,
        previewRadius: null,
        segments: 24,
        fillMode: 'outline',
      },
    } as any);
    return (useUiStore.getState() as any).circleToolState;
  }
  return state;
}

function updateCircleState(updates: Partial<CircleToolState>) {
  const current = getCircleState();
  useUiStore.setState({
    circleToolState: { ...current, ...updates },
  } as any);
}

/**
 * Apply snapping to a world position with guide lines
 */
function applySnap(worldPos: [number, number]): [number, number] {
  const { snapToGrid, gridSize, camera, setCurrentSnap, setCurrentGuides, showSnapIndicators } = useUiStore.getState();
  const { field, designElements } = useDesignStore.getState();

  if (!snapToGrid) {
    setCurrentSnap(null);
    setCurrentGuides([]);
    return worldPos;
  }

  // Create snap engine
  const snapEngine = new SnapEngine({
    gridSize,
    tolerance: 10,
    camera,
  });

  // Collect geometries (field + design elements)
  const geometries: any[] = [];
  if (field?.geometry) geometries.push(field.geometry);

  for (const element of designElements) {
    if (element.points.length >= 2) {
      geometries.push({
        type: element.closed ? 'Polygon' : 'LineString',
        coordinates: element.closed
          ? [[...element.points, element.points[0]]]
          : element.points,
      });
    }
  }

  // Find snap (including center type)
  const snap = snapEngine.findSnap(worldPos, geometries, [
    'endpoint',
    'midpoint',
    'center',
    'grid',
    'intersection',
  ]);

  setCurrentSnap(snap);

  // Find guide lines if enabled
  if (showSnapIndicators) {
    const worldTolerance = 10 / camera.scale;
    const guides = [];

    const allPoints: [number, number][] = [];
    const allSegments: Array<[[number, number], [number, number]]> = [];

    for (const element of designElements) {
      for (const point of element.points) {
        allPoints.push(point);
      }
      const pts = element.points;
      for (let i = 0; i < pts.length - 1; i++) {
        allSegments.push([pts[i], pts[i + 1]]);
      }
      if (element.closed && pts.length > 2) {
        allSegments.push([pts[pts.length - 1], pts[0]]);
      }
    }

    guides.push(...findAlignmentGuides(worldPos, allPoints, worldTolerance));
    guides.push(...findExtensionGuides(worldPos, allSegments, worldTolerance));
    guides.push(...findPerpendicularGuides(worldPos, allSegments, worldTolerance));

    setCurrentGuides(guides);
  } else {
    setCurrentGuides([]);
  }

  return snap ? snap.point : worldPos;
}

/**
 * Snap radius to nice round numbers
 */
function snapToNiceNumber(value: number): number {
  const niceNumbers = [0.5, 1, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 40, 50];
  let closest = niceNumbers[0];
  let minDiff = Math.abs(value - closest);

  for (const n of niceNumbers) {
    const diff = Math.abs(value - n);
    if (diff < minDiff) {
      minDiff = diff;
      closest = n;
    }
  }

  // Also check multiples of 10
  const rounded = Math.round(value / 10) * 10;
  if (rounded > 0 && Math.abs(value - rounded) < minDiff) {
    return rounded;
  }

  return closest;
}

/**
 * Generate circle points
 */
function generateCirclePoints(
  center: [number, number],
  radius: number,
  segments: number
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push([
      center[0] + radius * Math.cos(angle),
      center[1] + radius * Math.sin(angle),
    ]);
  }
  return points;
}

export const CircleTool: Tool = {
  name: 'circle',
  cursor: 'crosshair',
  hint: 'Click center, then radius. Tab = Toggle fill/outline. Type value + Enter. ↑/↓ = Segments.',

  onMouseDown: (_e: MouseEvent, worldPos: [number, number]) => {
    const circleState = getCircleState();

    // Auto-activate if not active
    if (!circleState.isActive) {
      updateCircleState({
        isActive: true,
        stage: 'pickingCenter',
        center: null,
        previewRadius: null,
      });
    }

    if (circleState.stage === 'pickingCenter') {
      // First click: Set center point
      let centerPos = applySnap(worldPos);

      if (import.meta.env.DEV) {
        console.log('[CircleTool] Center set:', centerPos);
      }

      updateCircleState({
        stage: 'pickingRadius',
        center: centerPos,
        previewRadius: null,
      });
    } else if (circleState.stage === 'pickingRadius' && circleState.center) {
      // Second click: Execute circle (async, don't block UI)
      if (import.meta.env.DEV) {
        console.log('[CircleTool] Executing circle with radius:', circleState.previewRadius);
      }
      circleToolFinish(); // Fire and forget - don't block UI on network request
    }
  },

  onMouseMove: (_e: MouseEvent, worldPos: [number, number]) => {
    const { angleConstraint, inputBuffer } = useUiStore.getState();
    const circleState = getCircleState();

    // Update snapping preview during center picking
    if (circleState.stage === 'pickingCenter' || circleState.stage === 'idle') {
      applySnap(worldPos);
    }

    if (circleState.stage === 'pickingRadius' && circleState.center) {
      // Check if user has typed a radius value
      if (inputBuffer.length > 0) {
        const typedRadius = parseFloat(inputBuffer);
        if (!isNaN(typedRadius) && typedRadius > 0) {
          updateCircleState({ previewRadius: typedRadius });
          return;
        }
      }

      // Calculate radius from raw mouse position (smooth preview)
      let radius = Math.hypot(
        worldPos[0] - circleState.center[0],
        worldPos[1] - circleState.center[1]
      );

      // Only snap to nice numbers if Shift is held
      if (angleConstraint) {
        radius = snapToNiceNumber(radius);
      }

      // Update preview immediately (no throttling, no grid snap)
      updateCircleState({ previewRadius: radius });
    }
  },

  onMouseUp: (_e: MouseEvent, _worldPos: [number, number]) => {
    // Circle tool uses click-click, not drag
  },

  onMouseLeave: () => {
    // Clear preview and snap indicators but don't cancel
    const circleState = getCircleState();
    if (circleState.stage === 'pickingRadius') {
      updateCircleState({ previewRadius: null });
    }
    const { setCurrentSnap, setCurrentGuides } = useUiStore.getState();
    setCurrentSnap(null);
    setCurrentGuides([]);
  },

  renderOverlay: (ctx: CanvasRenderingContext2D, camera: Camera) => {
    const { pathWidthMin } = useConstraintStore.getState();
    const { inputBuffer } = useUiStore.getState();
    const circleState = getCircleState();

    if (!circleState.isActive) return;

    const { center, previewRadius, segments, stage, fillMode } = circleState;
    const isFilled = fillMode === 'filled';

    // === Fill mode badge (always visible when tool is active) ===
    ctx.save();
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const badge = isFilled ? 'Filled' : 'Outline';
    const badgeColor = isFilled ? '#cc3333' : '#06b6d4';
    const badgeWidth = ctx.measureText(badge).width + 16;
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.roundRect(10, 52, badgeWidth, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(badge, 18, 56);
    ctx.restore();

    ctx.save();

    // Transform to world coordinates
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, -camera.scale);

    if (center) {
      // === LAYER 1: Center point marker ===
      const toolColor = isFilled ? '#cc3333' : '#06b6d4';
      ctx.fillStyle = toolColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / camera.scale;
      ctx.beginPath();
      ctx.arc(center[0], center[1], 5 / camera.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Crosshair at center
      const crossSize = 10 / camera.scale;
      ctx.strokeStyle = toolColor;
      ctx.lineWidth = 1 / camera.scale;
      ctx.beginPath();
      ctx.moveTo(center[0] - crossSize, center[1]);
      ctx.lineTo(center[0] + crossSize, center[1]);
      ctx.moveTo(center[0], center[1] - crossSize);
      ctx.lineTo(center[0], center[1] + crossSize);
      ctx.stroke();

      if (previewRadius !== null && previewRadius > 0 && stage === 'pickingRadius') {
        if (isFilled) {
          // === FILLED MODE: Show solid fill preview ===
          ctx.fillStyle = 'rgba(204, 51, 51, 0.2)';
          ctx.beginPath();
          ctx.arc(center[0], center[1], previewRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#cc3333';
          ctx.lineWidth = 2 / camera.scale;
          ctx.beginPath();
          ctx.arc(center[0], center[1], previewRadius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // === OUTLINE MODE: Show path width preview ===
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
          ctx.lineWidth = pathWidthMin || 4.0;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          ctx.arc(center[0], center[1], previewRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Thin circle outline (solid)
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2 / camera.scale;

          ctx.beginPath();
          ctx.arc(center[0], center[1], previewRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // === Segment vertices ===
        ctx.fillStyle = isFilled ? '#cc3333' : '#06b6d4';
        for (let i = 0; i < segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const x = center[0] + previewRadius * Math.cos(angle);
          const y = center[1] + previewRadius * Math.sin(angle);
          ctx.beginPath();
          ctx.arc(x, y, 2 / camera.scale, 0, Math.PI * 2);
          ctx.fill();
        }

        // === Radius line from center to mouse position ===
        const angleToMouse = Math.atan2(
          (useUiStore.getState() as any).mouseWorldPos?.[1] - center[1] || 0,
          (useUiStore.getState() as any).mouseWorldPos?.[0] - center[0] || 0
        );
        const edgeX = center[0] + Math.cos(angleToMouse) * previewRadius;
        const edgeY = center[1] + Math.sin(angleToMouse) * previewRadius;

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / camera.scale;
        ctx.beginPath();
        ctx.moveTo(center[0], center[1]);
        ctx.lineTo(edgeX, edgeY);
        ctx.stroke();

        // === Dimension label ===
        const midX = center[0] + Math.cos(angleToMouse) * (previewRadius / 2);
        const midY = center[1] + Math.sin(angleToMouse) * (previewRadius / 2);

        ctx.save();
        ctx.scale(1 / camera.scale, -1 / camera.scale);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.font = 'bold 14px Arial';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Show typed input if present, otherwise show calculated radius
        const label = inputBuffer.length > 0
          ? `r = ${inputBuffer} m`
          : `r = ${previewRadius.toFixed(2)} m`;
        const labelX = midX * camera.scale;
        const labelY = -(midY * camera.scale) - 8;

        ctx.strokeText(label, labelX, labelY);
        ctx.fillText(label, labelX, labelY);

        // Segment count (smaller, offset)
        ctx.font = '11px Arial';
        ctx.fillStyle = isFilled ? '#cc3333' : '#06b6d4';
        ctx.textBaseline = 'top';
        const segmentLabel = `${segments} sides`;
        ctx.strokeText(segmentLabel, labelX, labelY + 2);
        ctx.fillText(segmentLabel, labelX, labelY + 2);

        ctx.restore();
      }
    }

    ctx.restore();
  },
};

/**
 * Finish the current circle and add to design
 */
export function circleToolFinish() {
  const circleState = getCircleState();
  const { inputBuffer, clearInputBuffer } = useUiStore.getState();
  const { center, previewRadius, segments } = circleState;

  // Determine final radius: use typed value if present, otherwise use preview radius
  let finalRadius = previewRadius;
  if (inputBuffer.length > 0) {
    const typedRadius = parseFloat(inputBuffer);
    if (!isNaN(typedRadius) && typedRadius > 0) {
      finalRadius = typedRadius;
      if (import.meta.env.DEV) {
        console.log('[CircleTool] Using typed radius:', finalRadius);
      }
    }
  }

  if (!center || !finalRadius || finalRadius < 0.5) {
    updateCircleState({
      stage: 'pickingCenter',
      center: null,
      previewRadius: null,
    });
    clearInputBuffer();
    return;
  }

  // Generate circle points (fast, synchronous)
  const circlePath = generateCirclePoints(center, finalRadius, segments);
  const { pathWidthMin } = useConstraintStore.getState();
  const { fillMode } = circleState;
  const isFilled = fillMode === 'filled';

  // Add to design store (instant, no network call)
  const { addDesignElement } = useDesignStore.getState();
  addDesignElement({
    type: 'circle',
    points: circlePath,
    width: isFilled ? 0 : (pathWidthMin || 4.0),
    closed: isFilled,
  });

  if (import.meta.env.DEV) {
    console.log('[CircleTool] Circle added to design, ready for validation');
  }

  // INSTANT: Reset tool state so user can draw next circle immediately
  updateCircleState({
    stage: 'pickingCenter',
    center: null,
    previewRadius: null,
  });

  // Clear input buffer after using typed value
  clearInputBuffer();
}

/**
 * Cancel the current circle
 */
export function circleToolCancel() {
  const { clearInputBuffer } = useUiStore.getState();
  updateCircleState({
    isActive: false,
    stage: 'idle',
    center: null,
    previewRadius: null,
  });
  clearInputBuffer();
}

/**
 * Adjust segment count
 */
export function circleToolAdjustSegments(delta: number) {
  const circleState = getCircleState();
  const newSegments = Math.max(3, Math.min(360, circleState.segments + delta));
  updateCircleState({ segments: newSegments });
}

/**
 * Set exact radius (from keyboard input)
 */
export function circleToolSetRadius(radius: number) {
  if (radius > 0) {
    updateCircleState({ previewRadius: radius });
  }
}

/** Toggle between filled and outline carve modes */
export function circleToolToggleFillMode() {
  const state = getCircleState();
  const newMode = state.fillMode === 'filled' ? 'outline' : 'filled';
  updateCircleState({ fillMode: newMode });
  if (import.meta.env.DEV) {
    console.log('[CircleTool] Fill mode:', newMode);
  }
}
