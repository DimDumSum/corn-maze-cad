/**
 * Canvas Utility Functions
 */

import type { Camera } from '../../../shared/types';

/**
 * Draw grid on canvas
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  gridSize: number,
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.save();

  // Grid lines - light theme (subtle dark lines on light background)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1 / camera.scale;

  // Calculate visible bounds in world coordinates
  const minX = Math.floor((-camera.x / camera.scale - canvasWidth / 2) / gridSize) * gridSize;
  const maxX = Math.ceil((-camera.x / camera.scale + canvasWidth / 2) / gridSize) * gridSize;
  const minY = Math.floor((-camera.y / camera.scale - canvasHeight / 2) / gridSize) * gridSize;
  const maxY = Math.ceil((-camera.y / camera.scale + canvasHeight / 2) / gridSize) * gridSize;

  // Vertical lines
  ctx.beginPath();
  for (let x = minX; x <= maxX; x += gridSize) {
    ctx.moveTo(x, minY);
    ctx.lineTo(x, maxY);
  }
  ctx.stroke();

  // Horizontal lines
  ctx.beginPath();
  for (let y = minY; y <= maxY; y += gridSize) {
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * Calculate bounds of a geometry
 */
export function calculateBounds(geometry: any): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function processCoords(coords: any) {
    if (Array.isArray(coords[0])) {
      coords.forEach(processCoords);
    } else {
      const [x, y] = coords;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  // Handle GeometryData format (exterior/interiors)
  if (geometry.exterior) {
    processCoords(geometry.exterior);
    if (geometry.interiors) {
      geometry.interiors.forEach(processCoords);
    }
  }
  // Handle GeoJSON format (coordinates)
  else if (geometry.coordinates) {
    processCoords(geometry.coordinates);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Zoom camera to fit bounds
 */
export function zoomToFit(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 50
): Camera {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  // Calculate scale to fit with padding
  const scaleX = (canvasWidth - padding * 2) / width;
  const scaleY = (canvasHeight - padding * 2) / height;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: canvasWidth / 2 - centerX * scale,
    y: canvasHeight / 2 + centerY * scale,  // + because canvas Y is flipped (north = up)
    scale,
    rotation: 0,
  };
}
