/**
 * Tool system types
 */

import type { ToolName } from '../../../shared/constants';
import type { Camera } from '../../../shared/types';

/**
 * Tool interface - defines behavior for each canvas interaction tool
 */
export interface Tool {
  name: ToolName;
  cursor: string;  // CSS cursor value
  hint: string;    // Status bar hint text

  // Mouse event handlers (all optional)
  onMouseDown?: (e: MouseEvent, worldPos: [number, number]) => void;
  onMouseMove?: (e: MouseEvent, worldPos: [number, number]) => void;
  onMouseUp?: (e: MouseEvent, worldPos: [number, number]) => void;
  onMouseLeave?: () => void;

  // Canvas overlay rendering (e.g., for selection marquee, drawing preview)
  renderOverlay?: (ctx: CanvasRenderingContext2D, camera: Camera) => void;
}
