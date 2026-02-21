/**
 * Text Tool - Professional SketchUp-style text design
 * Opens dialog for text input, font selection, and style options
 * Converts text to vector paths and adds to design elements
 * User clicks Carve button to apply text to maze
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useUiStore } from '../stores/uiStore';
import { useProjectStore } from '../stores/projectStore';
import { useDesignStore } from '../stores/designStore';
import { SnapEngine } from '../snapping/SnapEngine';
import {
  fontLibrary,
  fontCategories,
  getFontById,
  getDefaultFont,
  type FontOption,
} from '../utils/fontLibrary';

// Text tool state
interface TextToolState {
  isActive: boolean;
  stage: 'selectingPosition' | 'showingDialog' | 'placingText';
  position: [number, number] | null;
  text: string;
  fontId: string;  // Font library ID
  font: string;    // Backend font name
  fontWeight: 'normal' | 'bold';
  fontSize: number;
  fillMode: 'fill' | 'stroke';
  strokeWidth: number;
  rotation: number; // Rotation in degrees (0-360)
  previewPaths: GeoJSONPolygon[] | null;
  // For drag-to-reposition
  isDragging: boolean;
  originalPosition: [number, number] | null;  // Position when paths were generated
}

// GeoJSON Polygon type for better type safety
interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

// Default state - created once
const defaultFont = getDefaultFont();
const DEFAULT_TEXT_STATE: TextToolState = {
  isActive: false,
  stage: 'selectingPosition',
  position: null,
  text: '',
  fontId: defaultFont.id,
  font: defaultFont.backendFont,
  fontWeight: defaultFont.weight,
  fontSize: 1.0,
  fillMode: 'stroke',
  strokeWidth: 0.2,
  rotation: 0,
  previewPaths: null,
  isDragging: false,
  originalPosition: null,
};

// Cached snap engine to avoid recreation on every mouse move
let cachedSnapEngine: SnapEngine | null = null;
let cachedSnapConfig: { gridSize: number; cameraScale: number } | null = null;

// Double-click detection for re-editing text
let lastClickTime = 0;
let lastClickPos: [number, number] | null = null;
const DOUBLE_CLICK_THRESHOLD = 400; // ms
const DOUBLE_CLICK_DISTANCE = 10; // world units

// Initialize text state in uiStore
function getTextState(): TextToolState {
  const state = (useUiStore.getState() as any).textToolState;
  if (!state) {
    useUiStore.setState({ textToolState: { ...DEFAULT_TEXT_STATE } } as any);
    return (useUiStore.getState() as any).textToolState;
  }
  return state;
}

function updateTextState(updates: Partial<TextToolState>): void {
  const current = getTextState();
  useUiStore.setState({ textToolState: { ...current, ...updates } } as any);
}

/**
 * Apply snapping to a world position
 * Optimized: Caches SnapEngine when config unchanged
 */
function applySnap(worldPos: [number, number]): [number, number] {
  const uiState = useUiStore.getState();
  const { snapToGrid, gridSize, camera, setCurrentSnap } = uiState;

  if (!snapToGrid) {
    setCurrentSnap(null);
    return worldPos;
  }

  // Check if we need to recreate snap engine (config changed)
  const newConfig = { gridSize, cameraScale: camera.scale };
  if (
    !cachedSnapEngine ||
    !cachedSnapConfig ||
    cachedSnapConfig.gridSize !== newConfig.gridSize ||
    cachedSnapConfig.cameraScale !== newConfig.cameraScale
  ) {
    cachedSnapEngine = new SnapEngine({
      gridSize,
      tolerance: 10,
      camera,
    });
    cachedSnapConfig = newConfig;
  }

  // Collect geometries for snapping
  const { field, pathElements } = useProjectStore.getState();
  const geometries: any[] = [];
  if (field?.geometry) geometries.push(field.geometry);
  for (const pathElement of pathElements.values()) {
    if (pathElement.geometry) geometries.push(pathElement.geometry);
  }

  // Find snap
  const snap = cachedSnapEngine.findSnap(worldPos, geometries, [
    'endpoint',
    'midpoint',
    'grid',
    'intersection',
  ]);

  setCurrentSnap(snap);
  return snap ? snap.point : worldPos;
}

export const TextTool: Tool = {
  name: 'text',
  cursor: 'crosshair',
  hint: 'Click to place text. Drag to reposition, double-click to edit before carving.',

  onMouseDown: async (_e: MouseEvent, worldPos: [number, number]) => {
    const textState = getTextState();
    const now = Date.now();

    // Auto-activate if not active
    if (!textState.isActive) {
      updateTextState({
        isActive: true,
        stage: 'selectingPosition',
        position: null,
        previewPaths: null,
      });
    }

    if (textState.stage === 'selectingPosition') {
      const position = applySnap(worldPos);
      updateTextState({ stage: 'showingDialog', position });
      showTextDialog();
      lastClickTime = now;
      lastClickPos = worldPos;
    } else if (textState.stage === 'placingText' && textState.previewPaths) {
      // Check for double-click to re-edit text
      const isDoubleClick =
        lastClickPos &&
        now - lastClickTime < DOUBLE_CLICK_THRESHOLD &&
        Math.abs(worldPos[0] - lastClickPos[0]) < DOUBLE_CLICK_DISTANCE &&
        Math.abs(worldPos[1] - lastClickPos[1]) < DOUBLE_CLICK_DISTANCE;

      if (isDoubleClick) {
        // Re-open dialog to edit text properties
        updateTextState({ stage: 'showingDialog' });
        showTextDialog();
        lastClickTime = 0;
        lastClickPos = null;
      } else {
        // Start dragging to reposition text
        const snappedPos = applySnap(worldPos);
        updateTextState({
          isDragging: true,
          position: snappedPos,
        });
        lastClickTime = now;
        lastClickPos = worldPos;
      }
    }
  },

  onMouseMove: (_e: MouseEvent, worldPos: [number, number]) => {
    const textState = getTextState();

    // Update position during selection stage
    if (textState.stage === 'selectingPosition') {
      const snappedPos = applySnap(worldPos);
      updateTextState({ position: snappedPos });
    }
    // Update position while dragging to reposition
    else if (textState.stage === 'placingText' && textState.isDragging) {
      const snappedPos = applySnap(worldPos);
      updateTextState({ position: snappedPos });
    }
  },

  onMouseUp: async (_e: MouseEvent, worldPos: [number, number]) => {
    const textState = getTextState();

    // End dragging
    if (textState.isDragging) {
      const snappedPos = applySnap(worldPos);
      updateTextState({
        isDragging: false,
        position: snappedPos,
      });
    }
  },

  onMouseLeave: () => {
    // Keep state on mouse leave
  },

  renderOverlay: (ctx: CanvasRenderingContext2D, camera: Camera) => {
    const textState = getTextState();

    // Early exit if not active
    if (!textState.isActive) return;

    const { position, previewPaths, stage, originalPosition } = textState;
    if (!position) return;

    ctx.save();

    // Transform to world coordinates
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, -camera.scale);

    // Pre-compute line width (avoid division in loop)
    const lineWidth = 2 / camera.scale;
    const crossSize = 10 / camera.scale;

    // === Position marker (cyan crosshair) ===
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(position[0] - crossSize, position[1]);
    ctx.lineTo(position[0] + crossSize, position[1]);
    ctx.moveTo(position[0], position[1] - crossSize);
    ctx.lineTo(position[0], position[1] + crossSize);
    ctx.stroke();

    // === Text preview paths ===
    if (previewPaths && previewPaths.length > 0 && stage === 'placingText') {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Calculate offset from original position (for drag-to-reposition)
      const offsetX = originalPosition ? position[0] - originalPosition[0] : 0;
      const offsetY = originalPosition ? position[1] - originalPosition[1] : 0;

      // Pre-compute Y-flip constant (2 * posY for original position)
      const origPosY = originalPosition ? originalPosition[1] : position[1];
      const yFlipBase = origPosY * 2;

      for (let p = 0; p < previewPaths.length; p++) {
        const geojsonPath = previewPaths[p];
        if (!geojsonPath?.coordinates?.[0]) continue;

        const path = geojsonPath.coordinates[0];
        const pathLen = path.length;
        if (pathLen < 2) continue;

        ctx.beginPath();
        ctx.moveTo(path[0][0] + offsetX, yFlipBase - path[0][1] + offsetY);
        for (let i = 1; i < pathLen; i++) {
          ctx.lineTo(path[i][0] + offsetX, yFlipBase - path[i][1] + offsetY);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    ctx.restore();
  },
};

/**
 * Show text input dialog
 */
function showTextDialog(): void {
  const textState = getTextState();

  // Create modal dialog
  const modal = document.createElement('div');
  modal.id = 'text-tool-dialog';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: #1f2937;
    border-radius: 8px;
    padding: 24px;
    width: 450px;
    color: white;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;

  dialog.innerHTML = `
    <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Text Properties</h2>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 6px; font-size: 14px;">Text:</label>
      <input type="text" id="text-input" value="${textState.text}"
        style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #4b5563; background: #374151; color: white; font-size: 14px;"
        placeholder="Enter text to carve">
    </div>

    <!-- Live Preview Panel -->
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 6px; font-size: 14px;">Preview:</label>
      <div id="text-preview-panel" style="
        width: 100%;
        height: 80px;
        background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
        border-radius: 4px;
        border: 1px solid #4b5563;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        position: relative;
      ">
        <div id="text-preview" style="
          color: #fcd34d;
          font-family: Arial;
          font-size: 32px;
          text-align: center;
          padding: 8px 16px;
          white-space: nowrap;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        ">Preview</div>
      </div>
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 6px; font-size: 14px;">Font:</label>
      <select id="font-select" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #4b5563; background: #374151; color: white; font-size: 14px;">
        ${fontCategories.map(cat => `
          <optgroup label="${cat.label} - ${cat.description}">
            ${fontLibrary.filter(f => f.category === cat.id).map(f => `
              <option value="${f.id}" ${textState.fontId === f.id ? 'selected' : ''}${f.mazeRecommended ? ' style="font-weight: bold;"' : ''}>${f.name}${f.mazeRecommended ? ' ★' : ''}</option>
            `).join('')}
          </optgroup>
        `).join('')}
      </select>
      <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">★ = Recommended for mazes (thick, bold shapes)</div>
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 6px; font-size: 14px;">Height (meters):</label>
      <input type="number" id="font-size-input" value="${textState.fontSize}" min="0.1" step="0.1"
        style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #4b5563; background: #374151; color: white; font-size: 14px;">
    </div>

    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 6px; font-size: 14px;">Mode:</label>
      <div style="display: flex; gap: 12px;">
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="radio" name="fill-mode" value="stroke" ${textState.fillMode === 'stroke' ? 'checked' : ''} style="margin-right: 6px;">
          <span>Outline</span>
        </label>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="radio" name="fill-mode" value="fill" ${textState.fillMode === 'fill' ? 'checked' : ''} style="margin-right: 6px;">
          <span>Filled</span>
        </label>
      </div>
    </div>

    <div id="stroke-width-container" style="margin-bottom: 16px; ${textState.fillMode === 'fill' ? 'display: none;' : ''}">
      <label style="display: block; margin-bottom: 6px; font-size: 14px;">Stroke Width (meters):</label>
      <input type="number" id="stroke-width-input" value="${textState.strokeWidth}" min="0.05" step="0.05"
        style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #4b5563; background: #374151; color: white; font-size: 14px;">
    </div>

    <p style="margin: 0 0 16px 0; font-size: 12px; color: #6b7280;">
      Tip: After placing, use the Select tool (V) to rotate and scale.
    </p>

    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button id="cancel-btn" style="padding: 8px 16px; border-radius: 4px; border: 1px solid #4b5563; background: #374151; color: white; cursor: pointer; font-size: 14px;">
        Cancel
      </button>
      <button id="ok-btn" style="padding: 8px 16px; border-radius: 4px; border: none; background: #3b82f6; color: white; cursor: pointer; font-size: 14px; font-weight: 500;">
        OK
      </button>
    </div>
  `;

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  // Get DOM elements once
  const textInput = document.getElementById('text-input') as HTMLInputElement;
  const fontSelect = document.getElementById('font-select') as HTMLSelectElement;
  const fontSizeInput = document.getElementById('font-size-input') as HTMLInputElement;
  const strokeWidthInput = document.getElementById('stroke-width-input') as HTMLInputElement;
  const strokeWidthContainer = document.getElementById('stroke-width-container') as HTMLDivElement;
  const fillModeRadios = document.querySelectorAll<HTMLInputElement>('input[name="fill-mode"]');
  const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
  const okBtn = document.getElementById('ok-btn') as HTMLButtonElement;
  const textPreview = document.getElementById('text-preview') as HTMLDivElement;

  // Update preview function
  const updatePreview = () => {
    const text = textInput.value || 'Preview';
    const fontId = fontSelect.value;
    const selectedFont = getFontById(fontId) || getDefaultFont();
    const fillModeEl = document.querySelector<HTMLInputElement>('input[name="fill-mode"]:checked');
    const fillMode = fillModeEl?.value || 'fill';

    textPreview.textContent = text;
    textPreview.style.fontFamily = selectedFont.backendFont;
    textPreview.style.fontWeight = selectedFont.weight;

    // Style based on fill mode
    if (fillMode === 'stroke') {
      textPreview.style.color = 'transparent';
      textPreview.style.webkitTextStroke = '1.5px #fcd34d';
      (textPreview.style as any).textStroke = '1.5px #fcd34d';
    } else {
      textPreview.style.color = '#fcd34d';
      textPreview.style.webkitTextStroke = 'none';
      (textPreview.style as any).textStroke = 'none';
    }

    // Auto-scale text to fit preview panel
    const panelWidth = 400;
    const textLen = text.length;
    const baseFontSize = Math.min(32, Math.max(16, panelWidth / (textLen * 0.7)));
    textPreview.style.fontSize = `${baseFontSize}px`;
  };

  // Initial preview update
  updatePreview();

  // Shared event stopper
  const stopPropagation = (e: Event) => e.stopPropagation();

  // Prevent keyboard shortcuts from interfering
  const inputs = [textInput, fontSelect, fontSizeInput, strokeWidthInput];
  for (const input of inputs) {
    input.addEventListener('keydown', stopPropagation);
    input.addEventListener('keyup', stopPropagation);
    input.addEventListener('keypress', stopPropagation);
  }

  // Update preview on text input
  textInput.addEventListener('input', updatePreview);

  // Update preview on font change
  fontSelect.addEventListener('change', updatePreview);

  // Allow Enter to submit from text input
  textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      okBtn.click();
    }
  });

  // Toggle stroke width visibility and update preview
  fillModeRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      strokeWidthContainer.style.display = radio.value === 'fill' ? 'none' : 'block';
      updatePreview();
    });
  });

  // Focus text input
  textInput.focus();
  textInput.select();

  // Cleanup function
  const closeDialog = () => {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
    window.removeEventListener('keydown', handleEscape);
  };

  // Cancel button
  cancelBtn.addEventListener('click', () => {
    closeDialog();
    textToolCancel();
  });

  // OK button
  okBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) {
      alert('Please enter text');
      return;
    }

    const fontId = fontSelect.value;
    const selectedFont = getFontById(fontId) || getDefaultFont();
    const fontSize = parseFloat(fontSizeInput.value);
    const fillModeEl = document.querySelector<HTMLInputElement>('input[name="fill-mode"]:checked');
    const fillMode = (fillModeEl?.value as 'fill' | 'stroke') || 'stroke';
    const strokeWidth = parseFloat(strokeWidthInput.value);

    updateTextState({
      text,
      fontId: selectedFont.id,
      font: selectedFont.backendFont,
      fontWeight: selectedFont.weight,
      fontSize,
      fillMode,
      strokeWidth,
      rotation: 0, // Rotation is now set via transform handles after placement
      stage: 'placingText',
    });

    closeDialog();
    await generateTextPreview();
  });

  // Close on Escape
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDialog();
      textToolCancel();
    }
  };
  window.addEventListener('keydown', handleEscape);
}

/**
 * Generate text preview using backend
 */
async function generateTextPreview(): Promise<void> {
  const textState = getTextState();
  const { position, text, font, fontWeight, fontSize, fillMode, strokeWidth } = textState;

  if (!position || !text) return;

  try {
    const response = await fetch('http://localhost:8000/geometry/text-to-paths', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        font,
        weight: fontWeight,
        fontSize,
        fillMode,
        strokeWidth: fillMode === 'stroke' ? strokeWidth : undefined,
        position,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate text paths');
    }

    const data = await response.json();

    if (data.error) {
      if (import.meta.env.DEV) {
        console.error('Text generation error:', data.error);
      }
      alert('Failed to generate text: ' + data.error);
      textToolCancel();
      return;
    }

    updateTextState({
      previewPaths: data.paths,
      originalPosition: position,  // Save where paths were generated
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error generating text preview:', error);
    }
    alert('Failed to generate text. Make sure the backend is running.');
    textToolCancel();
  }
}

/**
 * Finish text placement - add to design elements
 */
export async function textToolFinish(): Promise<void> {
  const textState = getTextState();
  const { previewPaths, position, originalPosition } = textState;

  if (!previewPaths || previewPaths.length === 0 || !position) {
    updateTextState({
      stage: 'selectingPosition',
      position: null,
      previewPaths: null,
      originalPosition: null,
    });
    return;
  }

  const { addDesignElement, selectElements } = useDesignStore.getState();

  // Calculate offset from original position (for drag-to-reposition)
  const offsetX = originalPosition ? position[0] - originalPosition[0] : 0;
  const offsetY = originalPosition ? position[1] - originalPosition[1] : 0;

  // Y-flip uses the original position where paths were generated
  const origPosY = originalPosition ? originalPosition[1] : position[1];
  const yFlipBase = origPosY * 2;

  // Collect IDs of newly added elements for auto-selection
  const addedIds: string[] = [];

  try {
    for (let p = 0; p < previewPaths.length; p++) {
      const geojsonPath = previewPaths[p] as any;

      let coords: [number, number][];
      if (geojsonPath?.type === 'Polygon' && geojsonPath?.coordinates) {
        coords = geojsonPath.coordinates[0];
      } else if (Array.isArray(geojsonPath)) {
        coords = geojsonPath;
      } else {
        if (import.meta.env.DEV) {
          console.error('[TextTool] Unknown path format:', geojsonPath);
        }
        continue;
      }

      // Pre-allocate flipped coords array with offset applied
      const coordLen = coords.length;
      const flippedCoords: [number, number][] = new Array(coordLen);
      for (let i = 0; i < coordLen; i++) {
        flippedCoords[i] = [
          coords[i][0] + offsetX,
          yFlipBase - coords[i][1] + offsetY,
        ];
      }

      const id = addDesignElement({
        type: 'text',
        points: flippedCoords,
        width: 0,
        closed: true,
        rotation: 0, // Always 0, user can rotate with transform handles
      });
      addedIds.push(id);
    }

    // Auto-select the newly added elements and switch to Select tool
    if (addedIds.length > 0) {
      selectElements(addedIds);
      useUiStore.getState().setTool('select');

      if (import.meta.env.DEV) {
        console.log(`[TextTool] Added ${addedIds.length} text elements, auto-selected, switched to Select tool`);
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[TextTool] Error adding text to designElements:', error);
    }
  }

  // Reset for next text
  updateTextState({
    stage: 'selectingPosition',
    position: null,
    previewPaths: null,
    originalPosition: null,
    text: '',
  });
}

/**
 * Cancel text tool
 */
export function textToolCancel(): void {
  // Invalidate snap engine cache when tool is cancelled
  cachedSnapEngine = null;
  cachedSnapConfig = null;

  // Reset click tracking
  lastClickTime = 0;
  lastClickPos = null;

  updateTextState({
    isActive: false,
    stage: 'selectingPosition',
    position: null,
    previewPaths: null,
    originalPosition: null,
    isDragging: false,
  });
}
