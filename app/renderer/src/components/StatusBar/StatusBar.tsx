/**
 * StatusBar Component - Bottom status bar showing tool info, coordinates, and project status
 */

import { useUiStore } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';
import { useTool } from '../../tools';
import './StatusBar.css';

export function StatusBar() {
  const { mouseWorldPos, camera, inputBuffer } = useUiStore();
  const { isDirty, field } = useProjectStore();
  const tool = useTool();

  // Calculate field area in hectares (1 hectare = 10,000 m²)
  const fieldAreaHectares = field ? calculateFieldArea(field.geometry) / 10000 : null;

  return (
    <div className="status-bar">
      {/* Left: Tool info */}
      <div className="status-left">
        <span className="status-tool-name">{tool.name}</span>
        <span className="status-separator">—</span>
        <span className="status-hint">{tool.hint}</span>
      </div>

      {/* Center: Mouse coordinates + Input buffer */}
      <div className="status-center">
        {inputBuffer.length > 0 ? (
          <span className="input-buffer">
            <span className="input-buffer-label">Input:</span>
            <span className="input-buffer-value">{inputBuffer}</span>
          </span>
        ) : mouseWorldPos ? (
          <>
            <span>X: {mouseWorldPos[0].toFixed(2)} m</span>
            <span className="status-separator">|</span>
            <span>Y: {mouseWorldPos[1].toFixed(2)} m</span>
          </>
        ) : (
          <span>—</span>
        )}
      </div>

      {/* Right: Project info */}
      <div className="status-right">
        {isDirty && (
          <span className="unsaved-indicator" title="Unsaved changes">
            ●
          </span>
        )}
        {fieldAreaHectares !== null && <span>{fieldAreaHectares.toFixed(1)} ha</span>}
        <span className="status-separator">|</span>
        <span>{(camera.scale * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

/**
 * Calculate the area of a GeoJSON polygon in square meters
 * Uses the shoelace formula for a simple polygon
 */
function calculateFieldArea(geometry: any): number {
  if (!geometry || geometry.type !== 'Polygon') return 0;

  const coords = geometry.coordinates[0]; // Exterior ring
  let area = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
}
