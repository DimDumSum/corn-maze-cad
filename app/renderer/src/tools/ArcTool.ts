/**
 * Arc Tool - Professional SketchUp-style arc drawing
 * Multiple modes: 2-point (bulge), 3-point, center-point
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useUiStore } from '../stores/uiStore';
import { useConstraintStore } from '../stores/constraintStore';
import { useDesignStore } from '../stores/designStore';
import { SnapEngine } from '../snapping/SnapEngine';

type ArcMode = '2point' | '3point' | 'center';

// Arc tool state
interface ArcToolState {
  isActive: boolean;
  mode: ArcMode;
  stage: 'idle' | 'point1' | 'point2' | 'point3' | 'bulge';
  point1: [number, number] | null; // Start (or center in center mode)
  point2: [number, number] | null; // End (or start in center mode)
  point3: [number, number] | null; // Bulge point (or end angle in center mode)
  bulge: number;
  segments: number;
  previewArc: [number, number][] | null;
}

// Initialize arc state in uiStore
function getArcState(): ArcToolState {
  const state = (useUiStore.getState() as any).arcToolState;
  if (!state) {
    useUiStore.setState({
      arcToolState: {
        isActive: false,
        mode: '2point' as ArcMode,
        stage: 'idle',
        point1: null,
        point2: null,
        point3: null,
        bulge: 0,
        segments: 12,
        previewArc: null,
      },
    } as any);
    return (useUiStore.getState() as any).arcToolState;
  }
  return state;
}

function updateArcState(updates: Partial<ArcToolState>) {
  const current = getArcState();
  useUiStore.setState({
    arcToolState: { ...current, ...updates },
  } as any);
}

/**
 * Apply snapping to a world position
 */
function applySnap(worldPos: [number, number]): [number, number] {
  const { snapToGrid, gridSize, camera, setCurrentSnap } = useUiStore.getState();
  const { field } = useDesignStore.getState();

  if (!snapToGrid) {
    setCurrentSnap(null);
    return worldPos;
  }

  const snapEngine = new SnapEngine({
    gridSize,
    tolerance: 10,
    camera,
  });

  const geometries: any[] = [];
  if (field?.geometry) geometries.push(field.geometry);

  const snap = snapEngine.findSnap(worldPos, geometries, [
    'endpoint',
    'midpoint',
    'grid',
    'intersection',
  ]);

  setCurrentSnap(snap);
  return snap ? snap.point : worldPos;
}

/**
 * Calculate arc from start, end, and bulge (2-point mode)
 */
function arcFrom2PointBulge(
  start: [number, number],
  end: [number, number],
  bulge: number,
  segments: number
): [number, number][] {
  if (Math.abs(bulge) < 0.001) {
    return [start, end];
  }

  const angle = 4 * Math.atan(bulge);
  const chordLen = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const radius = chordLen / (2 * Math.sin(Math.abs(angle) / 2));

  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;

  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const perpX = -dy / chordLen;
  const perpY = dx / chordLen;

  const h = radius * Math.cos(Math.abs(angle) / 2) * Math.sign(bulge);

  const centerX = midX + perpX * h;
  const centerY = midY + perpY * h;

  const startAngle = Math.atan2(start[1] - centerY, start[0] - centerX);
  const endAngle = Math.atan2(end[1] - centerY, end[0] - centerX);

  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let a: number;

    if (bulge > 0) {
      let da = endAngle - startAngle;
      if (da < 0) da += Math.PI * 2;
      a = startAngle + da * t;
    } else {
      let da = startAngle - endAngle;
      if (da < 0) da += Math.PI * 2;
      a = startAngle - da * t;
    }

    points.push([centerX + radius * Math.cos(a), centerY + radius * Math.sin(a)]);
  }

  return points;
}

/**
 * Calculate arc from 3 points
 */
function arcFrom3Points(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  segments: number
): [number, number][] {
  const ax = p1[0],
    ay = p1[1];
  const bx = p2[0],
    by = p2[1];
  const cx = p3[0],
    cy = p3[1];

  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

  if (Math.abs(d) < 0.0001) {
    return [p1, p2, p3];
  }

  const ux =
    ((ax * ax + ay * ay) * (by - cy) +
      (bx * bx + by * by) * (cy - ay) +
      (cx * cx + cy * cy) * (ay - by)) /
    d;
  const uy =
    ((ax * ax + ay * ay) * (cx - bx) +
      (bx * bx + by * by) * (ax - cx) +
      (cx * cx + cy * cy) * (bx - ax)) /
    d;

  const radius = Math.hypot(ax - ux, ay - uy);

  const angle1 = Math.atan2(p1[1] - uy, p1[0] - ux);
  const angle2 = Math.atan2(p2[1] - uy, p2[0] - ux);
  const angle3 = Math.atan2(p3[1] - uy, p3[0] - ux);

  const cross = (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
  const ccw = cross > 0;

  const points: [number, number][] = [];
  let startAngle = angle1;
  let endAngle = angle3;

  if (ccw) {
    while (endAngle < startAngle) endAngle += Math.PI * 2;
  } else {
    while (startAngle < endAngle) startAngle += Math.PI * 2;
  }

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = startAngle + (endAngle - startAngle) * t;
    points.push([ux + radius * Math.cos(a), uy + radius * Math.sin(a)]);
  }

  return points;
}

export const ArcTool: Tool = {
  name: 'arc',
  cursor: 'crosshair',
  hint: 'Tab = Mode. 2pt: Click start/end, drag bulge. 3pt: Click 3 points. ↑/↓ = Segments.',

  onMouseDown: async (_e: MouseEvent, worldPos: [number, number]) => {
    const arcState = getArcState();

    if (!arcState.isActive) {
      updateArcState({
        isActive: true,
        stage: 'point1',
        point1: null,
        point2: null,
        point3: null,
        bulge: 0,
        previewArc: null,
      });
    }

    const snappedPos = applySnap(worldPos);
    const { mode, stage, point1, point2 } = arcState;

    if (stage === 'point1') {
      updateArcState({
        stage: 'point2',
        point1: snappedPos,
      });
    } else if (stage === 'point2') {
      updateArcState({
        stage: mode === '3point' ? 'point3' : 'bulge',
        point2: snappedPos,
      });
    } else if (stage === 'point3' && mode === '3point') {
      // Finalize 3-point arc
      await arcToolFinish();
    } else if (stage === 'bulge') {
      // Finalize 2-point arc
      await arcToolFinish();
    }
  },

  onMouseMove: (_e: MouseEvent, worldPos: [number, number]) => {
    const { angleConstraint } = useUiStore.getState();
    const arcState = getArcState();
    const { mode, stage, point1, point2, segments } = arcState;

    if (mode === '2point' && stage === 'bulge' && point1 && point2) {
      const midX = (point1[0] + point2[0]) / 2;
      const midY = (point1[1] + point2[1]) / 2;
      const chordLen = Math.hypot(point2[0] - point1[0], point2[1] - point1[1]);

      const dx = point2[0] - point1[0];
      const dy = point2[1] - point1[1];
      const perpDist =
        ((worldPos[0] - point1[0]) * -dy + (worldPos[1] - point1[1]) * dx) / chordLen;

      let bulge = perpDist / (chordLen / 2);

      // Constrain bulge if Shift held
      if (angleConstraint) {
        bulge = Math.round(bulge * 4) / 4; // Snap to 0.25 increments
      }

      updateArcState({ bulge });

      const arcPoints = arcFrom2PointBulge(point1, point2, bulge, segments);
      updateArcState({ previewArc: arcPoints });
    } else if (mode === '3point' && stage === 'point3' && point1 && point2) {
      const arcPoints = arcFrom3Points(point1, point2, worldPos, segments);
      updateArcState({ previewArc: arcPoints, point3: worldPos });
    }
  },

  onMouseUp: async (_e: MouseEvent, _worldPos: [number, number]) => {
    // Arc tool uses click-to-place
  },

  onMouseLeave: () => {
    updateArcState({ previewArc: null });
  },

  renderOverlay: (ctx: CanvasRenderingContext2D, camera: Camera) => {
    const { pathWidthMin } = useConstraintStore.getState();
    const arcState = getArcState();

    if (!arcState.isActive) return;

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, -camera.scale);

    const { mode, point1, point2, point3, previewArc, bulge } = arcState;

    // Draw placed points
    if (point1) {
      ctx.fillStyle = '#8b5cf6'; // Purple
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / camera.scale;
      ctx.beginPath();
      ctx.arc(point1[0], point1[1], 5 / camera.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (point2) {
      ctx.fillStyle = '#8b5cf6';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / camera.scale;
      ctx.beginPath();
      ctx.arc(point2[0], point2[1], 5 / camera.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Chord line (dashed)
      if (point1) {
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
        ctx.lineWidth = 1 / camera.scale;
        ctx.setLineDash([4 / camera.scale, 2 / camera.scale]);
        ctx.beginPath();
        ctx.moveTo(point1[0], point1[1]);
        ctx.lineTo(point2[0], point2[1]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (point3 && mode === '3point') {
      ctx.fillStyle = '#8b5cf6';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / camera.scale;
      ctx.beginPath();
      ctx.arc(point3[0], point3[1], 5 / camera.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Draw arc preview
    if (previewArc && previewArc.length > 1) {
      // Path width preview
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)';
      ctx.lineWidth = pathWidthMin || 4.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(previewArc[0][0], previewArc[0][1]);
      for (const p of previewArc) {
        ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();

      // Thin arc line
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2 / camera.scale;
      ctx.beginPath();
      ctx.moveTo(previewArc[0][0], previewArc[0][1]);
      for (const p of previewArc) {
        ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();

      // Arc info
      if (point1 && point2) {
        const arcLen = previewArc.reduce((sum, p, i) => {
          if (i === 0) return 0;
          return sum + Math.hypot(p[0] - previewArc[i - 1][0], p[1] - previewArc[i - 1][1]);
        }, 0);

        const angle = Math.abs(4 * Math.atan(bulge) * (180 / Math.PI));

        ctx.save();
        ctx.scale(1 / camera.scale, -1 / camera.scale);
        const midX = previewArc[Math.floor(previewArc.length / 2)][0] * camera.scale;
        const midY = -(previewArc[Math.floor(previewArc.length / 2)][1] * camera.scale) - 15;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        const label = `${angle.toFixed(1)}° | ${arcLen.toFixed(2)} m`;
        ctx.strokeText(label, midX, midY);
        ctx.fillText(label, midX, midY);
        ctx.restore();
      }
    }

    // Mode indicator
    ctx.save();
    ctx.scale(1 / camera.scale, -1 / camera.scale);
    ctx.fillStyle = '#8b5cf6';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Arc: ${mode} (Tab)`, 10 * camera.scale, 10 * camera.scale);
    ctx.restore();

    ctx.restore();
  },
};

/**
 * Finish the current arc and carve it
 */
export function arcToolFinish() {
  const arcState = getArcState();
  const { previewArc } = arcState;

  if (!previewArc || previewArc.length < 2) {
    updateArcState({
      stage: 'point1',
      point1: null,
      point2: null,
      point3: null,
      bulge: 0,
      previewArc: null,
    });
    return;
  }

  // Copy arc data before clearing
  const arcPathCopy = [...previewArc] as [number, number][];
  const { pathWidthMin } = useConstraintStore.getState();

  // Add to design store (instant, no network call)
  const { addDesignElement } = useDesignStore.getState();
  addDesignElement({
    type: 'arc',
    points: arcPathCopy,
    width: pathWidthMin || 4.0,
    closed: false,
  });

  if (import.meta.env.DEV) {
    console.log('[ArcTool] Arc added to design, ready for validation');
  }

  // INSTANT: Reset tool state so user can draw next arc immediately
  updateArcState({
    stage: 'point1',
    point1: null,
    point2: null,
    point3: null,
    bulge: 0,
    previewArc: null,
  });
}

/**
 * Cancel the current arc
 */
export function arcToolCancel() {
  updateArcState({
    isActive: false,
    stage: 'idle',
    point1: null,
    point2: null,
    point3: null,
    bulge: 0,
    previewArc: null,
  });
}

/**
 * Cycle arc mode
 */
export function arcToolCycleMode() {
  const arcState = getArcState();
  const modes: ArcMode[] = ['2point', '3point', 'center'];
  const currentIdx = modes.indexOf(arcState.mode);
  const nextMode = modes[(currentIdx + 1) % modes.length];
  updateArcState({
    mode: nextMode,
    stage: 'point1',
    point1: null,
    point2: null,
    point3: null,
    bulge: 0,
    previewArc: null,
  });
}

/**
 * Adjust segment count
 */
export function arcToolAdjustSegments(delta: number) {
  const arcState = getArcState();
  const newSegments = Math.max(2, Math.min(72, arcState.segments + delta));
  updateArcState({ segments: newSegments });
}
