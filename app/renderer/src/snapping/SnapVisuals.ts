/**
 * Snap Visuals - Render snap indicators and guide lines on the canvas
 *
 * SketchUp-style inference color scheme:
 * - Endpoint: Green (#008000) - square
 * - Midpoint: Cyan (#0099cc) - triangle
 * - Center: Magenta (#cc00cc) - circle
 * - Grid: Gray (#888888) - dot
 * - Intersection: Red (#cc0000) - X
 *
 * Guide lines match SketchUp axis colors:
 * - Horizontal (X-axis): Red (#cc0000)
 * - Vertical (Y-axis): Green (#008000)
 * - Perpendicular: Blue (#0000cc)
 * - Parallel: Magenta (#cc00cc)
 * - Extension: Black dashed (#444444)
 */

import type { Camera } from '../../../shared/types';
import type { SnapResult, SnapType } from './SnapEngine';

// Snap indicator colors (SketchUp-style, bold and visible on light bg)
const SNAP_COLORS: Record<SnapType, string> = {
  endpoint: '#008000',     // Green (on-point)
  midpoint: '#0099cc',     // Cyan (midpoint)
  center: '#cc00cc',       // Magenta (center)
  grid: '#888888',         // Gray (grid)
  intersection: '#cc0000', // Red (intersection)
};

// Guide line types
export type GuideLineType = 'horizontal' | 'vertical' | 'perpendicular' | 'parallel' | 'extension';

export interface GuideLine {
  type: GuideLineType;
  start: [number, number];
  end: [number, number];
  referencePoint?: [number, number]; // Point this guide is aligned to
}

// Guide line colors (SketchUp axis-colored inference system)
const GUIDE_COLORS: Record<GuideLineType, string> = {
  horizontal: '#cc0000',   // Red (X-axis aligned)
  vertical: '#008000',     // Green (Y-axis aligned)
  perpendicular: '#0000cc', // Blue (perpendicular)
  parallel: '#cc00cc',     // Magenta (parallel to edge)
  extension: '#444444',    // Dark gray (line extension)
};

/**
 * Render a visual indicator for the snap point
 */
export function renderSnapIndicator(
  ctx: CanvasRenderingContext2D,
  snap: SnapResult,
  camera: Camera
): void {
  ctx.save();

  // Convert world coordinates to screen coordinates
  const screenX = camera.x + snap.point[0] * camera.scale;
  const screenY = camera.y + snap.point[1] * camera.scale;

  // Render based on snap type
  switch (snap.type) {
    case 'endpoint':
      renderEndpointIndicator(ctx, screenX, screenY);
      break;

    case 'midpoint':
      renderMidpointIndicator(ctx, screenX, screenY);
      break;

    case 'center':
      renderCenterIndicator(ctx, screenX, screenY);
      break;

    case 'grid':
      renderGridIndicator(ctx, screenX, screenY);
      break;

    case 'intersection':
      renderIntersectionIndicator(ctx, screenX, screenY);
      break;
  }

  ctx.restore();
}

/**
 * Render endpoint snap indicator (small square) - Green
 */
function renderEndpointIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  const size = 5;

  ctx.fillStyle = SNAP_COLORS.endpoint;
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;

  ctx.fillRect(x - size, y - size, size * 2, size * 2);
  ctx.strokeRect(x - size, y - size, size * 2, size * 2);
}

/**
 * Render midpoint snap indicator (small triangle) - Cyan
 */
function renderMidpointIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  const size = 6;

  ctx.fillStyle = SNAP_COLORS.midpoint;
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.lineTo(x - size, y + size);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();
}

/**
 * Render center snap indicator (circle with crosshairs) - Magenta
 */
function renderCenterIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  const radius = 6;
  const crossSize = 4;

  ctx.fillStyle = SNAP_COLORS.center;
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;

  // Outer circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner crosshairs
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - crossSize, y);
  ctx.lineTo(x + crossSize, y);
  ctx.moveTo(x, y - crossSize);
  ctx.lineTo(x, y + crossSize);
  ctx.stroke();
}

/**
 * Render grid snap indicator (small dot) - Gray
 */
function renderGridIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  const radius = 3;

  ctx.fillStyle = SNAP_COLORS.grid;
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * Render intersection snap indicator (X mark) - Red
 */
function renderIntersectionIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  const size = 6;

  // Draw red X with dark outline for visibility on light bg
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x - size, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.moveTo(x + size, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.stroke();

  ctx.strokeStyle = SNAP_COLORS.intersection;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x - size, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.moveTo(x + size, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.stroke();
}

/**
 * Render snap guide lines (alignment lines)
 */
export function renderGuideLines(
  ctx: CanvasRenderingContext2D,
  guides: GuideLine[],
  camera: Camera
): void {
  ctx.save();

  for (const guide of guides) {
    const color = GUIDE_COLORS[guide.type];

    // Convert world coordinates to screen coordinates
    const startX = camera.x + guide.start[0] * camera.scale;
    const startY = camera.y + guide.start[1] * camera.scale;
    const endX = camera.x + guide.end[0] * camera.scale;
    const endY = camera.y + guide.end[1] * camera.scale;

    // Draw guide line with dashed style
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.globalAlpha = 0.8;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw reference point indicator if present
    if (guide.referencePoint) {
      const refX = camera.x + guide.referencePoint[0] * camera.scale;
      const refY = camera.y + guide.referencePoint[1] * camera.scale;

      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.6;

      ctx.beginPath();
      ctx.arc(refX, refY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Find horizontal/vertical alignment guides from cursor to existing elements
 */
export function findAlignmentGuides(
  cursorPos: [number, number],
  elementPoints: [number, number][],
  tolerance: number = 5
): GuideLine[] {
  const guides: GuideLine[] = [];
  const [cx, cy] = cursorPos;

  for (const [px, py] of elementPoints) {
    // Check horizontal alignment (same Y)
    if (Math.abs(cy - py) < tolerance) {
      guides.push({
        type: 'horizontal',
        start: [Math.min(cx, px) - 50, py],
        end: [Math.max(cx, px) + 50, py],
        referencePoint: [px, py],
      });
    }

    // Check vertical alignment (same X)
    if (Math.abs(cx - px) < tolerance) {
      guides.push({
        type: 'vertical',
        start: [px, Math.min(cy, py) - 50],
        end: [px, Math.max(cy, py) + 50],
        referencePoint: [px, py],
      });
    }
  }

  return guides;
}

/**
 * Find extension guides along existing line segments
 */
export function findExtensionGuides(
  cursorPos: [number, number],
  segments: Array<[[number, number], [number, number]]>,
  tolerance: number = 10
): GuideLine[] {
  const guides: GuideLine[] = [];
  const [cx, cy] = cursorPos;

  for (const [p1, p2] of segments) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < 0.001) continue;

    // Normalize direction
    const nx = dx / length;
    const ny = dy / length;

    // Project cursor onto the line (extended infinitely)
    const t = (cx - p1[0]) * nx + (cy - p1[1]) * ny;
    const projX = p1[0] + t * nx;
    const projY = p1[1] + t * ny;

    // Check if cursor is close to the line extension (not the segment itself)
    const dist = Math.sqrt((cx - projX) ** 2 + (cy - projY) ** 2);
    const isOnSegment = t >= 0 && t <= length;

    if (dist < tolerance && !isOnSegment) {
      // Cursor is near the extension of this line
      const extendLength = 100;
      guides.push({
        type: 'extension',
        start: [p1[0] - nx * extendLength, p1[1] - ny * extendLength],
        end: [p2[0] + nx * extendLength, p2[1] + ny * extendLength],
        referencePoint: t < 0 ? p1 : p2,
      });
    }
  }

  return guides;
}

/**
 * Find perpendicular guides from cursor to line segments
 */
export function findPerpendicularGuides(
  cursorPos: [number, number],
  segments: Array<[[number, number], [number, number]]>,
  tolerance: number = 10
): GuideLine[] {
  const guides: GuideLine[] = [];
  const [cx, cy] = cursorPos;

  for (const [p1, p2] of segments) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < 0.001) continue;

    // Find foot of perpendicular from cursor to line
    const t = ((cx - p1[0]) * dx + (cy - p1[1]) * dy) / (length * length);

    // Only if the foot is on the segment
    if (t >= 0 && t <= 1) {
      const footX = p1[0] + t * dx;
      const footY = p1[1] + t * dy;

      const dist = Math.sqrt((cx - footX) ** 2 + (cy - footY) ** 2);

      if (dist < tolerance * 3 && dist > tolerance) {
        guides.push({
          type: 'perpendicular',
          start: [cx, cy],
          end: [footX, footY],
          referencePoint: [footX, footY],
        });
      }
    }
  }

  return guides;
}
