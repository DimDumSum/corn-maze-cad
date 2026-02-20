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

// ClipArt tool state
interface ClipArtToolState {
  isActive: boolean;
  stage: 'selectingPosition' | 'showingDialog' | 'placingClipArt';
  position: [number, number] | null;
  selectedClipArt: ClipArtItem | null;
  scale: number; // Size in meters
  rotation: number; // Rotation in degrees (0-360)
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
    ctx.scale(camera.scale, camera.scale);

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
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Calculate offset for repositioning
      const offsetX = originalPosition ? position[0] - originalPosition[0] : 0;
      const offsetY = originalPosition ? position[1] - originalPosition[1] : 0;

      // Pre-compute Y-flip constant (canvas Y is inverted from geometry Y)
      const origPosY = originalPosition ? originalPosition[1] : position[1];
      const yFlipBase = origPosY * 2;

      for (let p = 0; p < previewPaths.length; p++) {
        const geojsonPath = previewPaths[p];
        if (!geojsonPath?.coordinates?.[0]) continue;

        const path = geojsonPath.coordinates[0];
        const pathLen = path.length;
        if (pathLen < 2) continue;

        ctx.beginPath();
        // Apply Y-flip to match final placement (same as TextTool)
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
    background: #1f2937;
    border-radius: 8px;
    padding: 24px;
    width: 550px;
    max-height: 80vh;
    overflow-y: auto;
    color: white;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;

  const categoryTabs = clipartCategories
    .map(
      (cat, i) => `
      <button class="category-tab" data-category="${cat.id}"
        style="padding: 8px 16px; border: none; background: ${i === 0 ? '#3b82f6' : '#374151'};
        color: white; cursor: pointer; border-radius: 4px; font-size: 13px;"
        title="${cat.description}">
        ${cat.label}
      </button>
    `
    )
    .join('');

  dialog.innerHTML = `
    <h2 style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">Select ClipArt</h2>

    <!-- Category Tabs -->
    <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
      ${categoryTabs}
    </div>

    <!-- ClipArt Grid -->
    <div id="clipart-grid" style="
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
      min-height: 200px;
    ">
    </div>

    <!-- Selected Preview -->
    <div style="margin-bottom: 16px; padding: 12px; background: #374151; border-radius: 4px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div id="selected-preview" style="
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        ">
          <span style="color: #6b7280; font-size: 12px;">None</span>
        </div>
        <div style="flex: 1;">
          <div id="selected-name" style="font-weight: 500; margin-bottom: 8px;">No clipart selected</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 13px; color: #9ca3af;">Size:</label>
            <input type="number" id="scale-input" value="${clipArtState.scale}" min="1" max="100" step="1"
              style="width: 60px; padding: 4px 8px; border-radius: 4px; border: 1px solid #4b5563;
              background: #1f2937; color: white; font-size: 13px;">
            <span style="color: #9ca3af; font-size: 12px;">m</span>
          </div>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #6b7280;">
            Use Select tool (V) after placing to rotate/scale
          </p>
        </div>
      </div>
    </div>

    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button id="cancel-btn" style="padding: 8px 16px; border-radius: 4px; border: 1px solid #4b5563;
        background: #374151; color: white; cursor: pointer; font-size: 14px;">
        Cancel
      </button>
      <button id="ok-btn" style="padding: 8px 16px; border-radius: 4px; border: none;
        background: #3b82f6; color: white; cursor: pointer; font-size: 14px; font-weight: 500;"
        disabled>
        OK
      </button>
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

  let selectedClipArt: ClipArtItem | null = clipArtState.selectedClipArt;

  // Prevent keyboard shortcuts
  const stopPropagation = (e: Event) => e.stopPropagation();
  [scaleInput].forEach(input => {
    input.addEventListener('keydown', stopPropagation);
    input.addEventListener('keyup', stopPropagation);
    input.addEventListener('keypress', stopPropagation);
  });

  // Render clipart grid for a category
  const renderGrid = (category: string) => {
    const items = getClipArtByCategory(category as ClipArtCategory);
    clipartGrid.innerHTML = items
      .map(
        (item) => `
        <div class="clipart-item" data-id="${item.id}" style="
          padding: 12px;
          background: ${selectedClipArt?.id === item.id ? '#3b82f6' : '#374151'};
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          transition: background 0.15s;
          position: relative;
        ">
          ${item.mazeRecommended ? `<span style="position: absolute; top: 4px; right: 4px; font-size: 10px; color: #fbbf24;" title="Recommended for mazes">★</span>` : ''}
          <svg viewBox="0 0 100 100" style="width: 50px; height: 50px;">
            <path d="${item.pathData}" fill="${item.previewColor}" stroke="#000" stroke-width="2"/>
          </svg>
          <span style="font-size: 11px; text-align: center;">${item.name}</span>
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
          item.style.background = item.dataset.id === id ? '#3b82f6' : '#374151';
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
          el.style.background = '#4b5563';
        }
      });
      el.addEventListener('mouseleave', () => {
        if (el.dataset.id !== selectedClipArt?.id) {
          el.style.background = '#374151';
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
      categoryTabBtns.forEach((b) => (b.style.background = '#374151'));
      btn.style.background = '#3b82f6';
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

    const scale = parseFloat(scaleInput.value);

    updateClipArtState({
      selectedClipArt,
      scale,
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
  const { previewPaths, position, originalPosition } = clipArtState;

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

  // Y-flip uses the original position where paths were generated
  const origPosY = originalPosition ? originalPosition[1] : position[1];
  const yFlipBase = origPosY * 2;

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
        continue;
      }

      // Apply offset and Y-flip (canvas Y is inverted from geometry Y)
      const coordLen = coords.length;
      const finalCoords: [number, number][] = new Array(coordLen);
      for (let i = 0; i < coordLen; i++) {
        finalCoords[i] = [
          coords[i][0] + offsetX,
          yFlipBase - coords[i][1] + offsetY,
        ];
      }

      const id = addDesignElement({
        type: 'clipart',
        points: finalCoords,
        width: 0,
        closed: true,
        rotation: 0, // Always 0, user can rotate with transform handles
      });
      addedIds.push(id);
    }

    if (import.meta.env.DEV) {
      console.log(`[ClipArtTool] Added ${previewPaths.length} clipart elements`);
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
