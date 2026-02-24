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
import { useSettingsStore } from '../stores/settingsStore';
import { SnapEngine } from '../snapping/SnapEngine';
import { fmtFromMeters, fmtToMeters, fmtUnit } from '../utils/fmt';
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

// Default state — reads last-used settings from the settings store so
// preferences (font choice, size, fill mode) persist across sessions.
function buildDefaultTextState(): TextToolState {
  const last = useSettingsStore.getState().lastTextSettings;
  const savedFont = getFontById(last.fontId) || getDefaultFont();
  return {
    isActive: false,
    stage: 'selectingPosition',
    position: null,
    text: '',
    fontId: savedFont.id,
    font: savedFont.backendFont,
    fontWeight: savedFont.weight,
    fontSize: last.fontSize,
    fillMode: last.fillMode,
    strokeWidth: last.strokeWidth,
    rotation: 0,
    previewPaths: null,
    isDragging: false,
    originalPosition: null,
  };
}
// Keep a module-level fallback for synchronous initialization paths
const _defaultFont = getDefaultFont();
const DEFAULT_TEXT_STATE: TextToolState = {
  isActive: false,
  stage: 'selectingPosition',
  position: null,
  text: '',
  fontId: _defaultFont.id,
  font: _defaultFont.backendFont,
  fontWeight: _defaultFont.weight,
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
    useUiStore.setState({ textToolState: { ...buildDefaultTextState() } } as any);
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
      const { fillMode, strokeWidth } = textState;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Calculate offset from original position (for drag-to-reposition)
      const offsetX = originalPosition ? position[0] - originalPosition[0] : 0;
      const offsetY = originalPosition ? position[1] - originalPosition[1] : 0;

      for (let p = 0; p < previewPaths.length; p++) {
        const geojsonPath = previewPaths[p];
        if (!geojsonPath?.coordinates?.[0]) continue;

        const rings = geojsonPath.coordinates; // [exterior, ...holes]

        // Build the full path including all rings (exterior + interior holes).
        // Using evenodd fill means overlapping rings cancel out, correctly
        // rendering counters (the transparent interior of O, D, B, R, etc.).
        ctx.beginPath();
        for (let r = 0; r < rings.length; r++) {
          const ring = rings[r];
          if (ring.length < 2) continue;
          ctx.moveTo(ring[0][0] + offsetX, ring[0][1] + offsetY);
          for (let i = 1; i < ring.length; i++) {
            ctx.lineTo(ring[i][0] + offsetX, ring[i][1] + offsetY);
          }
          ctx.closePath();
        }

        if (fillMode === 'fill') {
          // Filled mode: use evenodd so interior rings become transparent holes
          ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
          ctx.fill('evenodd');
          ctx.lineWidth = lineWidth;
          ctx.strokeStyle = '#10b981';
          ctx.stroke();
        } else {
          // Outline mode: show thick stroke at the stroke width
          ctx.lineWidth = strokeWidth;
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
          ctx.stroke();
          // Draw thin center line for clarity
          ctx.lineWidth = lineWidth;
          ctx.strokeStyle = '#10b981';
          ctx.stroke();
        }
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
    background: #f0f0f0;
    border-radius: 4px;
    padding: 0;
    width: 420px;
    color: #333;
    border: 1px solid #b0b0b0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 11px;
  `;

  // Compute display values in the user's current unit system
  const unitLabel = fmtUnit();
  const displayFontSize = parseFloat(fmtFromMeters(textState.fontSize).toFixed(2));
  const displayStrokeWidth = parseFloat(fmtFromMeters(textState.strokeWidth).toFixed(2));

  dialog.innerHTML = `
    <div style="padding: 6px 10px; background: #d4d4d4; border-bottom: 1px solid #c0c0c0; font-weight: 600; font-size: 11px;">Text Properties</div>

    <div style="padding: 12px;">
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 4px; color: #666; font-size: 11px;">Text</label>
        <input type="text" id="text-input" value="${textState.text}"
          style="width: 100%; padding: 3px 6px; border-radius: 2px; border: 1px solid #b0b0b0; background: #fff; color: #333; font-size: 11px; box-sizing: border-box;"
          placeholder="Enter text to carve">
      </div>

      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 4px; color: #666; font-size: 11px;">Preview</label>
        <div id="text-preview-panel" style="
          width: 100%;
          height: 64px;
          background: linear-gradient(135deg, #3a6e3a 0%, #4a7e4a 100%);
          border-radius: 2px;
          border: 1px solid #b0b0b0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        ">
          <div id="text-preview" style="
            color: #fcd34d;
            font-family: Arial;
            font-size: 28px;
            text-align: center;
            padding: 6px 12px;
            white-space: nowrap;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          ">Preview</div>
        </div>
      </div>

      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 4px; color: #666; font-size: 11px;">Font</label>
        <div id="font-picker-wrapper" style="position: relative; width: 100%;">
          <div id="font-picker-trigger" style="
            width: 100%; padding: 3px 6px; border-radius: 2px; border: 1px solid #b0b0b0;
            background: #fff; color: #333; font-size: 12px; cursor: pointer;
            display: flex; justify-content: space-between; align-items: center;
            min-height: 22px; box-sizing: border-box; user-select: none;
          ">
            <span id="font-picker-label"></span>
            <span style="color: #888; font-size: 9px; flex-shrink: 0; margin-left: 4px;">▼</span>
          </div>
          <input type="hidden" id="font-select" value="${textState.fontId}">
          <div id="font-picker-dropdown" style="
            display: none; position: absolute; z-index: 10002; left: 0; right: 0; top: 100%;
            max-height: 200px; overflow-y: auto;
            border: 1px solid #b0b0b0; background: #fff;
            border-radius: 0 0 2px 2px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          ">
            ${fontCategories.map(cat => `
              <div style="padding: 2px 6px; background: #ebebeb; color: #555; font-size: 10px; font-weight: bold; border-bottom: 1px solid #ddd; position: sticky; top: 0;">
                ${cat.label} — ${cat.description}
              </div>
              ${fontLibrary.filter(f => f.category === cat.id).map(f => `
                <div class="font-option" data-font-id="${f.id}" style="
                  padding: 5px 8px; cursor: pointer; font-size: 13px;
                  font-family: ${f.browserFont}; font-weight: ${f.weight};
                  border-bottom: 1px solid #f0f0f0;
                  ${f.id === textState.fontId ? 'background: #e8f0fe;' : ''}
                ">${f.name}${f.mazeRecommended ? ' \u2605' : ''}</div>
              `).join('')}
            `).join('')}
          </div>
        </div>
        <div style="font-size: 10px; color: #888; margin-top: 2px;">\u2605 = Recommended for mazes (thick, bold shapes)</div>
      </div>

      <div style="display: flex; gap: 12px; margin-bottom: 10px;">
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 4px; color: #666; font-size: 11px;">Height (${unitLabel})</label>
          <input type="number" id="font-size-input" value="${displayFontSize}" min="0.01" step="0.1"
            style="width: 100%; padding: 3px 6px; border-radius: 2px; border: 1px solid #b0b0b0; background: #fff; color: #333; font-size: 11px; font-family: 'Courier New', monospace; text-align: right; box-sizing: border-box;">
        </div>
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 4px; color: #666; font-size: 11px;">Mode</label>
          <div style="display: flex; gap: 8px; padding-top: 2px;">
            <label style="display: flex; align-items: center; cursor: pointer; font-size: 11px;">
              <input type="radio" name="fill-mode" value="stroke" ${textState.fillMode === 'stroke' ? 'checked' : ''} style="margin-right: 4px;">
              Outline
            </label>
            <label style="display: flex; align-items: center; cursor: pointer; font-size: 11px;">
              <input type="radio" name="fill-mode" value="fill" ${textState.fillMode === 'fill' ? 'checked' : ''} style="margin-right: 4px;">
              Filled
            </label>
          </div>
        </div>
      </div>

      <div id="stroke-width-container" style="margin-bottom: 10px; ${textState.fillMode === 'fill' ? 'display: none;' : ''}">
        <label style="display: block; margin-bottom: 4px; color: #666; font-size: 11px;">Stroke Width (${unitLabel})</label>
        <input type="number" id="stroke-width-input" value="${displayStrokeWidth}" min="0.01" step="0.05"
          style="width: 100px; padding: 3px 6px; border-radius: 2px; border: 1px solid #b0b0b0; background: #fff; color: #333; font-size: 11px; font-family: 'Courier New', monospace; text-align: right;">
      </div>

      <p style="margin: 0 0 10px 0; font-size: 10px; color: #888;">
        Tip: After placing, use the Select tool (V) to rotate and scale.
      </p>

      <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid #c0c0c0; padding-top: 10px;">
        <button id="cancel-btn" style="padding: 4px 12px; border-radius: 2px; border: 1px solid #b0b0b0; background: #ddd; color: #555; cursor: pointer; font-size: 11px;">
          Cancel
        </button>
        <button id="ok-btn" style="padding: 4px 12px; border-radius: 2px; border: 1px solid #3a7bc8; background: #4a90d9; color: #fff; cursor: pointer; font-size: 11px; font-weight: 600;">
          OK
        </button>
      </div>
    </div>
  `;

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  // Get DOM elements once
  const textInput = document.getElementById('text-input') as HTMLInputElement;
  const fontSelectHidden = document.getElementById('font-select') as HTMLInputElement;
  const fontSizeInput = document.getElementById('font-size-input') as HTMLInputElement;
  const strokeWidthInput = document.getElementById('stroke-width-input') as HTMLInputElement;
  const strokeWidthContainer = document.getElementById('stroke-width-container') as HTMLDivElement;
  const fillModeRadios = document.querySelectorAll<HTMLInputElement>('input[name="fill-mode"]');
  const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
  const okBtn = document.getElementById('ok-btn') as HTMLButtonElement;
  const textPreview = document.getElementById('text-preview') as HTMLDivElement;
  const fontPickerTrigger = document.getElementById('font-picker-trigger') as HTMLDivElement;
  const fontPickerDropdown = document.getElementById('font-picker-dropdown') as HTMLDivElement;
  const fontPickerLabel = document.getElementById('font-picker-label') as HTMLSpanElement;

  // Helper: update the trigger label to show the currently selected font in its own face
  const refreshFontPickerLabel = () => {
    const fontId = fontSelectHidden.value;
    const f = getFontById(fontId) || getDefaultFont();
    fontPickerLabel.textContent = f.name + (f.mazeRecommended ? ' \u2605' : '');
    fontPickerLabel.style.fontFamily = f.browserFont;
    fontPickerLabel.style.fontWeight = f.weight;
  };
  refreshFontPickerLabel();

  // Toggle dropdown
  fontPickerTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = fontPickerDropdown.style.display !== 'none';
    fontPickerDropdown.style.display = isOpen ? 'none' : 'block';
  });

  // Close dropdown when clicking outside
  const closeDropdown = (e: MouseEvent) => {
    if (!fontPickerTrigger.contains(e.target as Node) && !fontPickerDropdown.contains(e.target as Node)) {
      fontPickerDropdown.style.display = 'none';
    }
  };
  document.addEventListener('click', closeDropdown);

  // Handle font option clicks
  fontPickerDropdown.querySelectorAll<HTMLDivElement>('.font-option').forEach((opt) => {
    opt.addEventListener('mouseenter', () => { opt.style.background = '#f0f4ff'; });
    opt.addEventListener('mouseleave', () => {
      opt.style.background = opt.dataset.fontId === fontSelectHidden.value ? '#e8f0fe' : '';
    });
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const fontId = opt.dataset.fontId || '';
      fontSelectHidden.value = fontId;
      // Update selection highlight
      fontPickerDropdown.querySelectorAll<HTMLDivElement>('.font-option').forEach(o => {
        o.style.background = o.dataset.fontId === fontId ? '#e8f0fe' : '';
      });
      fontPickerDropdown.style.display = 'none';
      refreshFontPickerLabel();
      updatePreview();
    });
  });

  // Update preview function
  const updatePreview = () => {
    const text = textInput.value || 'Preview';
    const fontId = fontSelectHidden.value;
    const selectedFont = getFontById(fontId) || getDefaultFont();
    const fillModeEl = document.querySelector<HTMLInputElement>('input[name="fill-mode"]:checked');
    const fillMode = fillModeEl?.value || 'fill';

    textPreview.textContent = text;
    textPreview.style.fontFamily = selectedFont.browserFont;
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
    const panelWidth = 380;
    const textLen = text.length;
    const baseFontSize = Math.min(28, Math.max(14, panelWidth / (textLen * 0.7)));
    textPreview.style.fontSize = `${baseFontSize}px`;
  };

  // Initial preview update
  updatePreview();

  // Shared event stopper
  const stopPropagation = (e: Event) => e.stopPropagation();

  // Prevent keyboard shortcuts from interfering
  const inputs = [textInput, fontSizeInput, strokeWidthInput];
  for (const input of inputs) {
    input.addEventListener('keydown', stopPropagation);
    input.addEventListener('keyup', stopPropagation);
    input.addEventListener('keypress', stopPropagation);
  }

  // Update preview on text input
  textInput.addEventListener('input', updatePreview);

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
    document.removeEventListener('click', closeDropdown);
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

  // OK button — convert display-unit values back to meters before saving
  okBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) {
      alert('Please enter text');
      return;
    }

    const fontId = fontSelectHidden.value;
    const selectedFont = getFontById(fontId) || getDefaultFont();
    // Values entered by user are in display units (ft or m); convert to meters
    const fontSize = fmtToMeters(parseFloat(fontSizeInput.value));
    const fillModeEl = document.querySelector<HTMLInputElement>('input[name="fill-mode"]:checked');
    const fillMode = (fillModeEl?.value as 'fill' | 'stroke') || 'stroke';
    const strokeWidth = fmtToMeters(parseFloat(strokeWidthInput.value));

    // Persist these choices for the next session
    useSettingsStore.getState().setLastTextSettings({
      fontId: selectedFont.id,
      fontSize,
      fillMode,
      strokeWidth,
    });

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
        fillMode: 'fill', // Always request filled polygons — outline is handled at carve time
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
  const { previewPaths, position, originalPosition, fillMode, strokeWidth } = textState;

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

  // Fill mode: closed polygon, carve fills the interior
  // Stroke mode: open path with width, carve outlines the edge
  const isFilled = fillMode === 'fill';

  // Collect IDs of newly added elements for auto-selection
  const addedIds: string[] = [];

  try {
    for (let p = 0; p < previewPaths.length; p++) {
      const geojsonPath = previewPaths[p] as any;

      let coords: [number, number][];
      let holeRings: [number, number][][] = [];
      if (geojsonPath?.type === 'Polygon' && geojsonPath?.coordinates) {
        coords = geojsonPath.coordinates[0];
        // Preserve interior rings (letter counters like O, D, B, R)
        if (geojsonPath.coordinates.length > 1) {
          holeRings = geojsonPath.coordinates.slice(1) as [number, number][][];
        }
      } else if (Array.isArray(geojsonPath)) {
        coords = geojsonPath;
      } else {
        if (import.meta.env.DEV) {
          console.error('[TextTool] Unknown path format:', geojsonPath);
        }
        continue;
      }

      // Apply drag offset to coords (no Y-flip: backend returns Y-up which
      // matches the world coordinate system used by the canvas)
      const coordLen = coords.length;
      const finalCoords: [number, number][] = new Array(coordLen);
      for (let i = 0; i < coordLen; i++) {
        finalCoords[i] = [
          coords[i][0] + offsetX,
          coords[i][1] + offsetY,
        ];
      }

      // Apply the same offset to hole rings
      const finalHoles: [number, number][][] = holeRings.map(ring =>
        ring.map(pt => [pt[0] + offsetX, pt[1] + offsetY] as [number, number])
      );

      const id = addDesignElement({
        type: 'text',
        points: finalCoords,
        holes: finalHoles.length > 0 ? finalHoles : undefined,
        width: isFilled ? 0 : strokeWidth,
        closed: isFilled,
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
