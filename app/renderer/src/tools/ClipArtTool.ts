/**
 * ClipArt Tool - Add pre-made clipart shapes to corn maze designs
 * Similar workflow to TextTool:
 * 1. Click to place → dialog opens
 * 2. Select clipart from grid, set scale
 * 3. Preview shows on canvas
 * 4. Drag to reposition, double-click to edit
 * 5. Carve button to finalize
 */

import type { Tool } from './types';
import type { Camera } from '../../../shared/types';
import { useUiStore } from '../stores/uiStore';
import { useProjectStore } from '../stores/projectStore';
import { useDesignStore } from '../stores/designStore';
import { SnapEngine } from '../snapping/SnapEngine';
import {
  clipartLibrary,
  clipartCategories,
  getClipArtByCategory,
  type ClipArtItem,
  type ClipArtCategory,
} from '../utils/clipartLibrary';
import { fmtFromMeters, fmtToMeters, fmtUnit } from '../utils/fmt';

// ClipArt tool state
interface ClipArtToolState {
  isActive: boolean;
  stage: 'selectingPosition' | 'showingDialog' | 'placingClipArt';
  position: [number, number] | null;
  selectedClipArt: ClipArtItem | null;
  scale: number; // Size in meters
  rotation: number; // Rotation in degrees (0-360)
  carveMode: 'filled' | 'outline'; // Filled removes entire interior, outline carves along the edge
  outlineWidth: number; // Path width in meters when carving as outline
  previewPaths: GeoJSONPolygon[] | null;
  // For drag-to-reposition
  isDragging: boolean;
  originalPosition: [number, number] | null;
}

// GeoJSON Polygon type
interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

// Default state
const DEFAULT_CLIPART_STATE: ClipArtToolState = {
  isActive: false,
  stage: 'selectingPosition',
  position: null,
  selectedClipArt: null,
  scale: 20, // 20 meters default
  rotation: 0,
  carveMode: 'filled',
  outlineWidth: 4.0, // Default path width in meters
  previewPaths: null,
  isDragging: false,
  originalPosition: null,
};

// Cached snap engine
let cachedSnapEngine: SnapEngine | null = null;
let cachedSnapConfig: { gridSize: number; cameraScale: number } | null = null;

// Double-click detection
let lastClickTime = 0;
let lastClickPos: [number, number] | null = null;
const DOUBLE_CLICK_THRESHOLD = 400;
const DOUBLE_CLICK_DISTANCE = 10;

// Initialize state in uiStore
function getClipArtState(): ClipArtToolState {
  const state = (useUiStore.getState() as any).clipArtToolState;
  if (!state) {
    useUiStore.setState({ clipArtToolState: { ...DEFAULT_CLIPART_STATE } } as any);
    return (useUiStore.getState() as any).clipArtToolState;
  }
  return state;
}

function updateClipArtState(updates: Partial<ClipArtToolState>): void {
  const current = getClipArtState();
  useUiStore.setState({ clipArtToolState: { ...current, ...updates } } as any);
}

/**
 * Apply snapping to a world position
 */
function applySnap(worldPos: [number, number]): [number, number] {
  const uiState = useUiStore.getState();
  const { snapToGrid, gridSize, camera, setCurrentSnap } = uiState;

  if (!snapToGrid) {
    setCurrentSnap(null);
    return worldPos;
  }

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

  const { field, pathElements } = useProjectStore.getState();
  const geometries: any[] = [];
  if (field?.geometry) geometries.push(field.geometry);
  for (const pathElement of pathElements.values()) {
    if (pathElement.geometry) geometries.push(pathElement.geometry);
  }

  const snap = cachedSnapEngine.findSnap(worldPos, geometries, [
    'endpoint',
    'midpoint',
    'grid',
    'intersection',
  ]);

  setCurrentSnap(snap);
  return snap ? snap.point : worldPos;
}

export const ClipArtTool: Tool = {
  name: 'clipart',
  cursor: 'crosshair',
  hint: 'Click to place clipart. Drag to reposition, double-click to edit before carving.',

  onMouseDown: async (_e: MouseEvent, worldPos: [number, number]) => {
    const clipArtState = getClipArtState();
    const now = Date.now();

    // Auto-activate if not active
    if (!clipArtState.isActive) {
      updateClipArtState({
        isActive: true,
        stage: 'selectingPosition',
        position: null,
        previewPaths: null,
      });
    }

    if (clipArtState.stage === 'selectingPosition') {
      const position = applySnap(worldPos);
      updateClipArtState({ stage: 'showingDialog', position });
      showClipArtDialog();
      lastClickTime = now;
      lastClickPos = worldPos;
    } else if (clipArtState.stage === 'placingClipArt' && clipArtState.previewPaths) {
      // Check for double-click to re-edit
      const isDoubleClick =
        lastClickPos &&
        now - lastClickTime < DOUBLE_CLICK_THRESHOLD &&
        Math.abs(worldPos[0] - lastClickPos[0]) < DOUBLE_CLICK_DISTANCE &&
        Math.abs(worldPos[1] - lastClickPos[1]) < DOUBLE_CLICK_DISTANCE;

      if (isDoubleClick) {
        updateClipArtState({ stage: 'showingDialog' });
        showClipArtDialog();
        lastClickTime = 0;
        lastClickPos = null;
      } else {
        // Start dragging
        const snappedPos = applySnap(worldPos);
        updateClipArtState({
          isDragging: true,
          position: snappedPos,
        });
        lastClickTime = now;
        lastClickPos = worldPos;
      }
    }
  },

  onMouseMove: (_e: MouseEvent, worldPos: [number, number]) => {
    const clipArtState = getClipArtState();

    if (clipArtState.stage === 'selectingPosition') {
      const snappedPos = applySnap(worldPos);
      updateClipArtState({ position: snappedPos });
    } else if (clipArtState.stage === 'placingClipArt' && clipArtState.isDragging) {
      const snappedPos = applySnap(worldPos);
      updateClipArtState({ position: snappedPos });
    }
  },

  onMouseUp: async (_e: MouseEvent, worldPos: [number, number]) => {
    const clipArtState = getClipArtState();

    if (clipArtState.isDragging) {
      const snappedPos = applySnap(worldPos);
      updateClipArtState({
        isDragging: false,
        position: snappedPos,
      });
    }
  },

  onMouseLeave: () => {
    // Keep state on mouse leave
  },

  renderOverlay: (ctx: CanvasRenderingContext2D, camera: Camera) => {
    const clipArtState = getClipArtState();

    if (!clipArtState.isActive) return;

    const { position, previewPaths, stage, originalPosition } = clipArtState;
    if (!position) return;

    ctx.save();

    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, -camera.scale);

    const lineWidth = 2 / camera.scale;
    const crossSize = 10 / camera.scale;

    // Position marker (cyan crosshair)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(position[0] - crossSize, position[1]);
    ctx.lineTo(position[0] + crossSize, position[1]);
    ctx.moveTo(position[0], position[1] - crossSize);
    ctx.lineTo(position[0], position[1] + crossSize);
    ctx.stroke();

    // ClipArt preview paths
    if (previewPaths && previewPaths.length > 0 && stage === 'placingClipArt') {
      const { carveMode, outlineWidth } = clipArtState;
      ctx.strokeStyle = '#10b981';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Calculate offset for repositioning
      const offsetX = originalPosition ? position[0] - originalPosition[0] : 0;
      const offsetY = originalPosition ? position[1] - originalPosition[1] : 0;

      for (let p = 0; p < previewPaths.length; p++) {
        const geojsonPath = previewPaths[p];
        if (!geojsonPath?.coordinates?.[0]) continue;

        const path = geojsonPath.coordinates[0];
        const pathLen = path.length;
        if (pathLen < 2) continue;

        ctx.beginPath();
        // No Y-flip needed: backend returns Y-up coordinates matching canvas world space
        ctx.moveTo(path[0][0] + offsetX, path[0][1] + offsetY);
        for (let i = 1; i < pathLen; i++) {
          ctx.lineTo(path[i][0] + offsetX, path[i][1] + offsetY);
        }
        ctx.closePath();

        if (carveMode === 'filled') {
          // Filled mode: show semi-transparent fill to indicate the whole interior will be carved
          ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
          ctx.fill();
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        } else {
          // Outline mode: show thick stroke at the outline width to indicate carve path
          ctx.lineWidth = outlineWidth;
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
          ctx.stroke();
          // Draw a thin center line for clarity
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
 * Show clipart selection dialog
 */
function showClipArtDialog(): void {
  const clipArtState = getClipArtState();

  const modal = document.createElement('div');
  modal.id = 'clipart-tool-dialog';
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
    width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    color: #333;
    border: 1px solid #b0b0b0;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 11px;
  `;

  const categoryTabs = clipartCategories
    .map(
      (cat, i) => `
      <button class="category-tab" data-category="${cat.id}"
        style="padding: 3px 10px; border: 1px solid ${i === 0 ? '#3a7bc8' : '#b0b0b0'};
        background: ${i === 0 ? '#4a90d9' : '#ddd'}; color: ${i === 0 ? '#fff' : '#555'};
        cursor: pointer; border-radius: 2px; font-size: 11px; font-weight: ${i === 0 ? '600' : '400'};"
        title="${cat.description}">
        ${cat.label}
      </button>
    `
    )
    .join('');

  dialog.innerHTML = `
    <div style="padding: 6px 10px; background: #d4d4d4; border-bottom: 1px solid #c0c0c0; font-weight: 600; font-size: 11px;">Select ClipArt</div>

    <div style="padding: 12px;">
      <div style="display: flex; gap: 4px; margin-bottom: 10px; flex-wrap: wrap;">
        ${categoryTabs}
      </div>

      <div id="clipart-grid" style="
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
        margin-bottom: 10px;
        min-height: 160px;
      ">
      </div>

      <div style="margin-bottom: 10px; padding: 8px; background: #e8e8e8; border: 1px solid #c0c0c0; border-radius: 2px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div id="selected-preview" style="
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #3a6e3a 0%, #4a7e4a 100%);
            border-radius: 2px;
            border: 1px solid #b0b0b0;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          ">
            <span style="color: #999; font-size: 10px;">None</span>
          </div>
          <div style="flex: 1;">
            <div id="selected-name" style="font-weight: 600; margin-bottom: 6px; font-size: 11px;">No clipart selected</div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <label style="font-size: 11px; color: #666;">Size:</label>
              <input type="number" id="scale-input" value="${Math.round(fmtFromMeters(clipArtState.scale) * 10) / 10}" min="1" max="500" step="1"
                style="width: 48px; padding: 2px 4px; border-radius: 2px; border: 1px solid #b0b0b0;
                background: #fff; color: #333; font-size: 11px; font-family: 'Courier New', monospace; text-align: right;">
              <span style="color: #888; font-size: 10px;">${fmtUnit()}</span>
            </div>
            <p style="margin: 4px 0 0 0; font-size: 10px; color: #888;">
              Use Select tool (V) after placing to rotate/scale
            </p>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 10px; padding: 8px; background: #e8e8e8; border: 1px solid #c0c0c0; border-radius: 2px;">
        <label style="display: block; margin-bottom: 6px; font-size: 11px; font-weight: 600;">Carve Mode</label>
        <div style="display: flex; gap: 12px; margin-bottom: 6px;">
          <label style="display: flex; align-items: center; cursor: pointer; font-size: 11px;">
            <input type="radio" name="carve-mode" value="filled" ${clipArtState.carveMode === 'filled' ? 'checked' : ''} style="margin-right: 4px;">
            Filled
            <span style="color: #888; font-size: 10px; margin-left: 4px;">(remove entire shape)</span>
          </label>
          <label style="display: flex; align-items: center; cursor: pointer; font-size: 11px;">
            <input type="radio" name="carve-mode" value="outline" ${clipArtState.carveMode === 'outline' ? 'checked' : ''} style="margin-right: 4px;">
            Outline
            <span style="color: #888; font-size: 10px; margin-left: 4px;">(carve path along edge)</span>
          </label>
        </div>
        <div id="outline-width-container" style="${clipArtState.carveMode === 'filled' ? 'display: none;' : ''}">
          <div style="display: flex; align-items: center; gap: 6px;">
            <label style="font-size: 11px; color: #666;">Path width:</label>
            <input type="number" id="outline-width-input" value="${Math.round(fmtFromMeters(clipArtState.outlineWidth) * 10) / 10}" min="0.5" max="100" step="0.5"
              style="width: 48px; padding: 2px 4px; border-radius: 2px; border: 1px solid #b0b0b0;
              background: #fff; color: #333; font-size: 11px; font-family: 'Courier New', monospace; text-align: right;">
            <span style="color: #888; font-size: 10px;">${fmtUnit()}</span>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid #c0c0c0; padding-top: 10px;">
        <button id="cancel-btn" style="padding: 4px 12px; border-radius: 2px; border: 1px solid #b0b0b0;
          background: #ddd; color: #555; cursor: pointer; font-size: 11px;">
          Cancel
        </button>
        <button id="ok-btn" style="padding: 4px 12px; border-radius: 2px; border: 1px solid #3a7bc8;
          background: #4a90d9; color: #fff; cursor: pointer; font-size: 11px; font-weight: 600;"
          disabled>
          OK
        </button>
      </div>
    </div>
  `;

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  // Get DOM elements
  const clipartGrid = document.getElementById('clipart-grid') as HTMLDivElement;
  const categoryTabBtns = document.querySelectorAll<HTMLButtonElement>('.category-tab');
  const selectedPreview = document.getElementById('selected-preview') as HTMLDivElement;
  const selectedName = document.getElementById('selected-name') as HTMLDivElement;
  const scaleInput = document.getElementById('scale-input') as HTMLInputElement;
  const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
  const okBtn = document.getElementById('ok-btn') as HTMLButtonElement;

  const outlineWidthInput = document.getElementById('outline-width-input') as HTMLInputElement;
  const outlineWidthContainer = document.getElementById('outline-width-container') as HTMLDivElement;
  const carveModeRadios = document.querySelectorAll<HTMLInputElement>('input[name="carve-mode"]');

  let selectedClipArt: ClipArtItem | null = clipArtState.selectedClipArt;

  // Prevent keyboard shortcuts
  const stopPropagation = (e: Event) => e.stopPropagation();
  [scaleInput, outlineWidthInput].forEach(input => {
    if (input) {
      input.addEventListener('keydown', stopPropagation);
      input.addEventListener('keyup', stopPropagation);
      input.addEventListener('keypress', stopPropagation);
    }
  });

  // Carve mode toggle
  carveModeRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (outlineWidthContainer) {
        outlineWidthContainer.style.display = radio.value === 'filled' ? 'none' : '';
      }
    });
  });

  // Render clipart grid for a category
  const renderGrid = (category: string) => {
    const items = getClipArtByCategory(category as ClipArtCategory);
    clipartGrid.innerHTML = items
      .map(
        (item) => `
        <div class="clipart-item" data-id="${item.id}" style="
          padding: 8px;
          background: ${selectedClipArt?.id === item.id ? '#4a90d9' : '#fff'};
          border: 1px solid ${selectedClipArt?.id === item.id ? '#3a7bc8' : '#c0c0c0'};
          border-radius: 2px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: background 0.1s;
          position: relative;
          color: ${selectedClipArt?.id === item.id ? '#fff' : '#333'};
        ">
          ${item.mazeRecommended ? `<span style="position: absolute; top: 2px; right: 3px; font-size: 9px; color: ${selectedClipArt?.id === item.id ? '#fde68a' : '#d97706'};" title="Recommended for mazes">\u2605</span>` : ''}
          <svg viewBox="0 0 100 100" style="width: 40px; height: 40px;">
            <path d="${item.pathData}" fill="${item.previewColor}" stroke="#333" stroke-width="2"/>
          </svg>
          <span style="font-size: 10px; text-align: center;">${item.name}</span>
        </div>
      `
      )
      .join('');

    // Add click handlers to clipart items
    document.querySelectorAll<HTMLDivElement>('.clipart-item').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        selectedClipArt = clipartLibrary.find((item) => item.id === id) || null;

        // Update selection styles
        document.querySelectorAll<HTMLDivElement>('.clipart-item').forEach((item) => {
          const isSelected = item.dataset.id === id;
          item.style.background = isSelected ? '#4a90d9' : '#fff';
          item.style.borderColor = isSelected ? '#3a7bc8' : '#c0c0c0';
          item.style.color = isSelected ? '#fff' : '#333';
        });

        // Update preview
        if (selectedClipArt) {
          selectedPreview.innerHTML = `
            <svg viewBox="0 0 100 100" style="width: 50px; height: 50px;">
              <path d="${selectedClipArt.pathData}" fill="${selectedClipArt.previewColor}" stroke="#000" stroke-width="2"/>
            </svg>
          `;
          selectedName.textContent = selectedClipArt.name;
          okBtn.disabled = false;
        }
      });

      // Hover effect
      el.addEventListener('mouseenter', () => {
        if (el.dataset.id !== selectedClipArt?.id) {
          el.style.background = '#e0e8f0';
        }
      });
      el.addEventListener('mouseleave', () => {
        if (el.dataset.id !== selectedClipArt?.id) {
          el.style.background = '#fff';
        }
      });
    });
  };

  // Initial render
  renderGrid(clipartCategories[0].id);

  // If there's a previously selected clipart, show it
  if (selectedClipArt) {
    selectedPreview.innerHTML = `
      <svg viewBox="0 0 100 100" style="width: 50px; height: 50px;">
        <path d="${selectedClipArt.pathData}" fill="${selectedClipArt.previewColor}" stroke="#000" stroke-width="2"/>
      </svg>
    `;
    selectedName.textContent = selectedClipArt.name;
    okBtn.disabled = false;
  }

  // Category tab handlers
  categoryTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      categoryTabBtns.forEach((b) => {
        b.style.background = '#ddd';
        b.style.borderColor = '#b0b0b0';
        b.style.color = '#555';
        b.style.fontWeight = '400';
      });
      btn.style.background = '#4a90d9';
      btn.style.borderColor = '#3a7bc8';
      btn.style.color = '#fff';
      btn.style.fontWeight = '600';
      renderGrid(btn.dataset.category || 'shapes');
    });
  });

  // Cleanup function
  const closeDialog = () => {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }
    window.removeEventListener('keydown', handleEscape);
  };

  // Cancel
  cancelBtn.addEventListener('click', () => {
    closeDialog();
    clipArtToolCancel();
  });

  // OK
  okBtn.addEventListener('click', async () => {
    if (!selectedClipArt) {
      alert('Please select a clipart');
      return;
    }

    const scale = fmtToMeters(parseFloat(scaleInput.value));
    const carveModeEl = document.querySelector<HTMLInputElement>('input[name="carve-mode"]:checked');
    const carveMode = (carveModeEl?.value as 'filled' | 'outline') || 'filled';
    const outlineWidth = outlineWidthInput ? fmtToMeters(parseFloat(outlineWidthInput.value)) || 4.0 : 4.0;

    updateClipArtState({
      selectedClipArt,
      scale,
      carveMode,
      outlineWidth,
      rotation: 0, // Rotation is now set via transform handles after placement
      stage: 'placingClipArt',
    });

    closeDialog();
    await generateClipArtPreview();
  });

  // Escape to close
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDialog();
      clipArtToolCancel();
    }
  };
  window.addEventListener('keydown', handleEscape);
}

/**
 * Generate clipart preview using backend
 */
async function generateClipArtPreview(): Promise<void> {
  const clipArtState = getClipArtState();
  const { position, selectedClipArt, scale } = clipArtState;

  if (!position || !selectedClipArt) return;

  try {
    const response = await fetch('http://localhost:8000/geometry/svg-to-paths', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pathData: selectedClipArt.pathData,
        scale,
        position,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate clipart paths');
    }

    const data = await response.json();

    if (data.error) {
      if (import.meta.env.DEV) {
        console.error('ClipArt generation error:', data.error);
      }
      alert('Failed to generate clipart: ' + data.error);
      clipArtToolCancel();
      return;
    }

    updateClipArtState({
      previewPaths: data.paths,
      originalPosition: position,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error generating clipart preview:', error);
    }
    alert('Failed to generate clipart. Make sure the backend is running.');
    clipArtToolCancel();
  }
}

/**
 * Finish clipart placement - add to design elements
 */
export async function clipArtToolFinish(): Promise<void> {
  const clipArtState = getClipArtState();
  const { previewPaths, position, originalPosition, carveMode, outlineWidth } = clipArtState;

  if (!previewPaths || previewPaths.length === 0 || !position) {
    updateClipArtState({
      stage: 'selectingPosition',
      position: null,
      previewPaths: null,
      originalPosition: null,
    });
    return;
  }

  const { addDesignElement, selectElements } = useDesignStore.getState();

  // Calculate offset for repositioning
  const offsetX = originalPosition ? position[0] - originalPosition[0] : 0;
  const offsetY = originalPosition ? position[1] - originalPosition[1] : 0;

  const addedIds: string[] = [];

  // In outline mode: closed=false so carve-batch buffers the line at outlineWidth
  // In filled mode: closed=true so carve-batch uses the polygon directly
  const isFilled = carveMode === 'filled';

  try {
    for (let p = 0; p < previewPaths.length; p++) {
      const geojsonPath = previewPaths[p] as any;

      let coords: [number, number][];
      if (geojsonPath?.type === 'Polygon' && geojsonPath?.coordinates) {
        coords = geojsonPath.coordinates[0];
      } else if (Array.isArray(geojsonPath)) {
        coords = geojsonPath;
      } else {
        continue;
      }

      // Apply offset only — no Y-flip: backend returns Y-up coordinates
      const coordLen = coords.length;
      const finalCoords: [number, number][] = new Array(coordLen);
      for (let i = 0; i < coordLen; i++) {
        finalCoords[i] = [
          coords[i][0] + offsetX,
          coords[i][1] + offsetY,
        ];
      }

      const id = addDesignElement({
        type: 'clipart',
        points: finalCoords,
        width: isFilled ? 0 : outlineWidth,
        closed: isFilled,
        rotation: 0, // Always 0, user can rotate with transform handles
      });
      addedIds.push(id);
    }

    if (import.meta.env.DEV) {
      console.log(`[ClipArtTool] Added ${previewPaths.length} clipart elements (mode: ${carveMode}${!isFilled ? `, width: ${outlineWidth}m` : ''})`);
    }

    // Auto-select newly added elements and switch to Select tool
    if (addedIds.length > 0) {
      selectElements(addedIds);
      useUiStore.getState().setTool('select');
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[ClipArtTool] Error adding clipart to designElements:', error);
    }
  }

  // Reset for next clipart
  updateClipArtState({
    stage: 'selectingPosition',
    position: null,
    previewPaths: null,
    originalPosition: null,
  });
}

/**
 * Cancel clipart tool
 */
export function clipArtToolCancel(): void {
  cachedSnapEngine = null;
  cachedSnapConfig = null;
  lastClickTime = 0;
  lastClickPos = null;

  updateClipArtState({
    isActive: false,
    stage: 'selectingPosition',
    position: null,
    previewPaths: null,
    originalPosition: null,
    isDragging: false,
  });
}
