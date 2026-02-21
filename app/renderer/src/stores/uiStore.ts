/**
 * UI Store: Manages canvas UI state, camera, tools, and user interactions.
 *
 * Uses Zustand for state management.
 */

import { create } from 'zustand';
import type { Camera } from '../../../shared/types';
import type { ToolName } from '../../../shared/constants';
import { ZOOM_MIN, ZOOM_MAX } from '../../../shared/constants';
import type { SnapResult } from '../snapping/SnapEngine';
import type { GuideLine } from '../snapping/SnapVisuals';

interface UIState {
  // Camera state
  camera: Camera;

  // Tool state
  selectedTool: ToolName;
  isDrawing: boolean;
  currentPath: [number, number][];
  angleConstraint: boolean; // Shift key held - constrain to 45° angles

  // Selection state
  selection: Set<string>;
  hoveredElement: string | null;

  // Grid and snapping
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  showSnapIndicators: boolean;
  currentSnap: SnapResult | null;
  currentGuides: GuideLine[];

  // Mouse tracking
  mouseWorldPos: [number, number] | null;

  // Dimension input (type-to-specify like SketchUp)
  inputBuffer: string;

  // View overlay toggles
  showSatellite: boolean;
  showCarvedOverlay: boolean;
  showCarvedBorder: boolean;

  // Actions - Camera
  setCamera: (camera: Camera) => void;
  panCamera: (dx: number, dy: number) => void;
  zoomCamera: (delta: number, centerX?: number, centerY?: number) => void;
  resetCamera: () => void;

  // Actions - Tool
  setTool: (tool: ToolName) => void;

  // Actions - Drawing
  startDrawing: (point: [number, number]) => void;
  updateDrawing: (point: [number, number]) => void;
  endDrawing: () => void;
  stopDrawing: () => void; // Stop drawing but keep currentPath visible
  clearPath: () => void; // Clear currentPath
  cancelDrawing: () => void;
  setAngleConstraint: (enabled: boolean) => void;

  // Actions - Selection
  select: (id: string) => void;
  addToSelection: (id: string) => void;
  clearSelection: () => void;
  setHoveredElement: (id: string | null) => void;

  // Actions - Grid
  toggleGrid: () => void;
  toggleSnap: () => void;
  setGridSize: (size: number) => void;

  // Actions - Snapping
  setCurrentSnap: (snap: SnapResult | null) => void;
  setCurrentGuides: (guides: GuideLine[]) => void;

  // Actions - Mouse
  setMouseWorldPos: (pos: [number, number] | null) => void;

  // Actions - Input Buffer
  setInputBuffer: (value: string) => void;
  appendInputBuffer: (char: string) => void;
  clearInputBuffer: () => void;

  // Actions - View Overlays
  setShowSatellite: (show: boolean) => void;
  setShowCarvedOverlay: (show: boolean) => void;
  setShowCarvedBorder: (show: boolean) => void;
}

const DEFAULT_CAMERA: Camera = {
  x: 0,
  y: 0,
  scale: 1,
};

export const useUiStore = create<UIState>((set) => ({
  // Initial state
  camera: DEFAULT_CAMERA,
  selectedTool: 'pan',
  isDrawing: false,
  currentPath: [],
  angleConstraint: false,
  selection: new Set(),
  hoveredElement: null,
  showGrid: false,
  snapToGrid: false,
  gridSize: 1,
  showSnapIndicators: true,
  currentSnap: null,
  currentGuides: [],
  mouseWorldPos: null,
  inputBuffer: '',
  showSatellite: false,
  showCarvedOverlay: false,
  showCarvedBorder: false,

  // Camera actions
  setCamera: (camera) =>
    set({
      camera,
    }),

  panCamera: (dx, dy) =>
    set((state) => ({
      camera: {
        ...state.camera,
        x: state.camera.x + dx,
        y: state.camera.y + dy,
      },
    })),

  zoomCamera: (delta, centerX, centerY) =>
    set((state) => {
      // Multiplicative zoom: delta ±0.1 → factor 1.1 or 0.9 (10% per step)
      const factor = 1 + delta;
      const newScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.camera.scale * factor));

      // If zoom center is provided, zoom towards that point
      if (centerX !== undefined && centerY !== undefined) {
        const scaleFactor = newScale / state.camera.scale;
        const newX = centerX - (centerX - state.camera.x) * scaleFactor;
        const newY = centerY - (centerY - state.camera.y) * scaleFactor;

        return {
          camera: {
            x: newX,
            y: newY,
            scale: newScale,
          },
        };
      }

      // Otherwise, simple zoom
      return {
        camera: {
          ...state.camera,
          scale: newScale,
        },
      };
    }),

  resetCamera: () =>
    set({
      camera: DEFAULT_CAMERA,
    }),

  // Tool actions
  setTool: (tool) => {
    if (import.meta.env.DEV) {
      console.log('[uiStore] setTool - tool changed to:', tool);
    }
    set({
      selectedTool: tool,
      isDrawing: false,
      currentPath: [],
    });
  },

  // Drawing actions
  startDrawing: (point) =>
    set({
      isDrawing: true,
      currentPath: [point],
    }),

  updateDrawing: (point) =>
    set((state) => {
      if (!state.isDrawing) return state;
      return {
        currentPath: [...state.currentPath, point],
      };
    }),

  endDrawing: () =>
    set({
      isDrawing: false,
      currentPath: [],
    }),

  stopDrawing: () =>
    set({
      isDrawing: false,
    }),

  clearPath: () =>
    set({
      currentPath: [],
    }),

  cancelDrawing: () =>
    set({
      isDrawing: false,
      currentPath: [],
      currentSnap: null,
    }),

  setAngleConstraint: (enabled) =>
    set({
      angleConstraint: enabled,
    }),

  // Selection actions
  select: (id) =>
    set({
      selection: new Set([id]),
    }),

  addToSelection: (id) =>
    set((state) => {
      const newSelection = new Set(state.selection);
      newSelection.add(id);
      return {
        selection: newSelection,
      };
    }),

  clearSelection: () =>
    set({
      selection: new Set(),
    }),

  setHoveredElement: (id) =>
    set({
      hoveredElement: id,
    }),

  // Grid actions
  toggleGrid: () =>
    set((state) => ({
      showGrid: !state.showGrid,
    })),

  toggleSnap: () =>
    set((state) => ({
      snapToGrid: !state.snapToGrid,
    })),

  setGridSize: (size) =>
    set({
      gridSize: Math.max(0.1, size),
    }),

  // Snapping actions
  setCurrentSnap: (snap) =>
    set({
      currentSnap: snap,
    }),

  setCurrentGuides: (guides) =>
    set({
      currentGuides: guides,
    }),

  // Mouse actions
  setMouseWorldPos: (pos) =>
    set({
      mouseWorldPos: pos,
    }),

  // Input Buffer actions
  setInputBuffer: (value) =>
    set({
      inputBuffer: value,
    }),

  appendInputBuffer: (char) =>
    set((state) => ({
      inputBuffer: state.inputBuffer + char,
    })),

  clearInputBuffer: () =>
    set({
      inputBuffer: '',
    }),

  // View overlay actions
  setShowSatellite: (show) =>
    set({ showSatellite: show }),

  setShowCarvedOverlay: (show) =>
    set({ showCarvedOverlay: show }),

  setShowCarvedBorder: (show) =>
    set({ showCarvedBorder: show }),
}));
