/**
 * Design Store - Unified source of truth with snapshot-based undo/redo
 *
 * Architecture:
 * - designElements: Primary source of truth for all user-created geometry
 * - maze: Computed result from backend carving operations (not source of truth)
 * - History: Snapshot-based undo/redo of designElements state
 */

import { create } from 'zustand';
import type { FieldBoundary, MazeWalls } from '../../../shared/types';

const MAX_HISTORY_SIZE = 50;

/**
 * UndoSnapshot - Captures full state for undo/redo including maze
 * This allows undoing carve operations by restoring both design elements AND maze state
 */
export interface UndoSnapshot {
  designElements: DesignElement[];
  maze: MazeWalls | null;
}

export interface DesignElement {
  id: string;
  type: 'path' | 'circle' | 'rectangle' | 'line' | 'arc' | 'text' | 'clipart';
  points: [number, number][];
  width: number;
  closed: boolean;
  rotation?: number; // Rotation in degrees (0-360), defaults to 0
}

export interface Violation {
  id: string;
  type: 'wall_width' | 'edge_buffer' | 'corner_radius';
  severity: 'error' | 'warning';
  message: string;
  location: [number, number];
  elementIds: string[];
  actualValue: number;
  requiredValue: number;
  highlightArea?: [number, number][] | null;
}

export interface ConstraintZone {
  id: string;
  type: 'buffer' | 'exclusion' | 'required_path';
  geometry: any; // GeoJSON geometry
  label?: string;
}

// Transform handle types
export type TransformHandle =
  | 'nw' | 'ne' | 'se' | 'sw'  // Corner scale handles
  | 'n' | 'e' | 's' | 'w'      // Edge scale handles
  | 'rotate'                    // Rotation handle
  | 'move';                     // Center move handle

export interface TransformState {
  activeHandle: TransformHandle | null;
  startPos: [number, number] | null;
  startRotation: number;
  startBounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  aspectRatio: number | null; // For shift+drag aspect lock
}

interface DesignState {
  // === PRIMARY STATE ===
  field: FieldBoundary | null;
  designElements: DesignElement[];
  constraintZones: ConstraintZone[];
  maze: MazeWalls | null; // Computed result, not source of truth

  // === SELECTION STATE ===
  selectedElementIds: Set<string>;
  hoveredElementId: string | null;
  transformState: TransformState;

  // === VERTEX EDITING STATE ===
  vertexEditingElementId: string | null;  // Which element is in vertex edit mode
  selectedVertexIndices: number[];         // Which vertices are selected
  hoveredVertexIndex: number | null;       // Which vertex is being hovered

  // === VALIDATION STATE ===
  violations: Violation[];
  showViolationsOnCanvas: boolean;
  isCarving: boolean;

  // === HISTORY STATE (Snapshot-based, includes maze for carve undo) ===
  undoStack: UndoSnapshot[];
  redoStack: UndoSnapshot[];

  // === PROJECT METADATA ===
  isDirty: boolean;
  projectPath: string | null;

  // === DESIGN ELEMENT ACTIONS (with automatic history) ===
  addDesignElement: (element: Omit<DesignElement, 'id'>) => string;
  removeDesignElement: (id: string) => void;
  updateDesignElement: (id: string, updates: Partial<DesignElement>) => void;
  updateElementNoHistory: (id: string, updates: Partial<DesignElement>) => void; // For live transforms
  pushSnapshot: () => void; // Manually save state for undo before transforms
  clearElements: () => void;

  // === UNDO/REDO ACTIONS ===
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // === PROJECT ACTIONS ===
  setField: (field: FieldBoundary | null) => void;
  setMaze: (maze: MazeWalls | null) => void;
  clearMaze: () => void;

  // === VALIDATION ACTIONS ===
  setViolations: (violations: Violation[]) => void;
  setShowViolationsOnCanvas: (show: boolean) => void;
  setIsCarving: (isCarving: boolean) => void;
  setDesignElements: (elements: DesignElement[]) => void;

  // === CONSTRAINT ZONE ACTIONS ===
  addConstraintZone: (zone: Omit<ConstraintZone, 'id'>) => string;
  removeConstraintZone: (id: string) => void;

  // === SELECTION ACTIONS ===
  selectElement: (id: string, addToSelection?: boolean) => void;
  selectElements: (ids: string[]) => void;
  clearSelection: () => void;
  setHoveredElement: (id: string | null) => void;
  startTransform: (handle: TransformHandle, pos: [number, number], bounds: TransformState['startBounds'], rotation?: number, aspectRatio?: number) => void;
  endTransform: () => void;

  // === VERTEX EDITING ACTIONS ===
  setVertexEditing: (elementId: string | null) => void;
  selectVertex: (index: number, addToSelection?: boolean) => void;
  selectVertices: (indices: number[]) => void;
  clearVertexSelection: () => void;
  setHoveredVertex: (index: number | null) => void;
  moveSelectedVertices: (delta: [number, number]) => void;
  deleteSelectedVertices: () => void;

  // === PROJECT MANAGEMENT ===
  resetProject: () => void;
  markSaved: () => void;
  markDirty: () => void;
}

export const useDesignStore = create<DesignState>((set, get) => ({
  // === INITIAL STATE ===
  field: null,
  designElements: [],
  constraintZones: [],
  maze: null,
  selectedElementIds: new Set<string>(),
  hoveredElementId: null,
  transformState: {
    activeHandle: null,
    startPos: null,
    startRotation: 0,
    startBounds: null,
    aspectRatio: null,
  },
  // Vertex editing state
  vertexEditingElementId: null,
  selectedVertexIndices: [],
  hoveredVertexIndex: null,
  violations: [],
  showViolationsOnCanvas: false,
  isCarving: false,
  undoStack: [],
  redoStack: [],
  isDirty: false,
  projectPath: null,

  // === DESIGN ELEMENT ACTIONS ===

  addDesignElement: (element) => {
    const id = `el-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newElement = { ...element, id };

    set((state) => {
      // Push current state to undo stack (full snapshot including maze)
      const snapshot: UndoSnapshot = {
        designElements: state.designElements.map(el => ({ ...el, points: [...el.points] })),
        maze: state.maze,
      };
      const newUndoStack = [...state.undoStack, snapshot];

      // Trim to max size if needed
      const trimmedUndoStack =
        newUndoStack.length > MAX_HISTORY_SIZE
          ? newUndoStack.slice(newUndoStack.length - MAX_HISTORY_SIZE)
          : newUndoStack;

      if (import.meta.env.DEV) {
        console.log('[DesignStore] Adding element:', newElement.type, 'points:', newElement.points.length);
        console.log('[DesignStore] History - undoStack:', trimmedUndoStack.length, 'redoStack: 0 (CLEARED)');
      }

      return {
        designElements: [...state.designElements, newElement],
        undoStack: trimmedUndoStack,
        redoStack: [], // Clear redo stack on new action
        isDirty: true,
      };
    });

    return id;
  },

  removeDesignElement: (id) => {
    set((state) => {
      // Push current state to undo stack (full snapshot including maze)
      const snapshot: UndoSnapshot = {
        designElements: state.designElements.map(el => ({ ...el, points: [...el.points] })),
        maze: state.maze,
      };
      const newUndoStack = [...state.undoStack, snapshot];

      const trimmedUndoStack =
        newUndoStack.length > MAX_HISTORY_SIZE
          ? newUndoStack.slice(newUndoStack.length - MAX_HISTORY_SIZE)
          : newUndoStack;

      if (import.meta.env.DEV) {
        console.log('[DesignStore] Removing element:', id);
      }

      return {
        designElements: state.designElements.filter(e => e.id !== id),
        undoStack: trimmedUndoStack,
        redoStack: [],
        isDirty: true,
      };
    });
  },

  updateDesignElement: (id, updates) => {
    set((state) => {
      // Push current state to undo stack (full snapshot including maze)
      const snapshot: UndoSnapshot = {
        designElements: state.designElements.map(el => ({ ...el, points: [...el.points] })),
        maze: state.maze,
      };
      const newUndoStack = [...state.undoStack, snapshot];

      const trimmedUndoStack =
        newUndoStack.length > MAX_HISTORY_SIZE
          ? newUndoStack.slice(newUndoStack.length - MAX_HISTORY_SIZE)
          : newUndoStack;

      if (import.meta.env.DEV) {
        console.log('[DesignStore] Updating element:', id, updates);
      }

      return {
        designElements: state.designElements.map(el =>
          el.id === id ? { ...el, ...updates } : el
        ),
        undoStack: trimmedUndoStack,
        redoStack: [],
        isDirty: true,
      };
    });
  },

  updateElementNoHistory: (id, updates) => {
    // Update element without creating undo snapshot - for live transforms
    set((state) => ({
      designElements: state.designElements.map(el =>
        el.id === id ? { ...el, ...updates } : el
      ),
      isDirty: true,
    }));
  },

  pushSnapshot: () => {
    // Manually push current state to undo stack (call before starting a transform or carve)
    // This captures both designElements AND maze state for full undo support
    set((state) => {
      const snapshot: UndoSnapshot = {
        designElements: state.designElements.map(el => ({ ...el, points: [...el.points] })),
        maze: state.maze,
      };
      const newUndoStack = [...state.undoStack, snapshot];

      const trimmedUndoStack =
        newUndoStack.length > MAX_HISTORY_SIZE
          ? newUndoStack.slice(newUndoStack.length - MAX_HISTORY_SIZE)
          : newUndoStack;

      if (import.meta.env.DEV) {
        console.log('[DesignStore] Manual snapshot pushed, undoStack:', trimmedUndoStack.length, 'maze:', !!state.maze);
      }

      return {
        undoStack: trimmedUndoStack,
        redoStack: [], // Clear redo stack on new action
      };
    });
  },

  clearElements: () => {
    if (import.meta.env.DEV) {
      console.log('[DesignStore] Clearing all elements');
    }
    set({
      designElements: [],
      violations: [],
      isDirty: true,
    });
  },

  // === UNDO/REDO ACTIONS ===

  undo: () => {
    const { undoStack, designElements, maze } = get();

    if (undoStack.length === 0) {
      if (import.meta.env.DEV) {
        console.log('[DesignStore] Nothing to undo');
      }
      return;
    }

    // Pop from undo stack (now contains full snapshot with maze)
    const previousSnapshot = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    // Create redo snapshot from current state
    const currentSnapshot: UndoSnapshot = {
      designElements: designElements.map(el => ({ ...el, points: [...el.points] })),
      maze: maze,
    };

    if (import.meta.env.DEV) {
      console.log('[DesignStore] UNDO - restoring', previousSnapshot.designElements.length, 'elements, maze:', !!previousSnapshot.maze);
      console.log('[DesignStore] After undo - undoStack:', newUndoStack.length, 'redoStack:', get().redoStack.length + 1);
    }

    set((state) => ({
      designElements: previousSnapshot.designElements,
      maze: previousSnapshot.maze,
      undoStack: newUndoStack,
      redoStack: [...state.redoStack, currentSnapshot], // Push current to redo
      isDirty: true,
    }));

    // Sync backend with restored maze state
    if (previousSnapshot.maze !== maze) {
      import('../api/client').then(({ setWalls }) => {
        setWalls(previousSnapshot.maze).catch((err) => {
          if (import.meta.env.DEV) {
            console.error('[DesignStore] Failed to sync backend after undo:', err);
          }
        });
      });
    }
  },

  redo: () => {
    const { redoStack, designElements, maze } = get();

    if (redoStack.length === 0) {
      if (import.meta.env.DEV) {
        console.log('[DesignStore] Nothing to redo');
      }
      return;
    }

    // Pop from redo stack (now contains full snapshot with maze)
    const nextSnapshot = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    // Create undo snapshot from current state
    const currentSnapshot: UndoSnapshot = {
      designElements: designElements.map(el => ({ ...el, points: [...el.points] })),
      maze: maze,
    };

    if (import.meta.env.DEV) {
      console.log('[DesignStore] REDO - restoring', nextSnapshot.designElements.length, 'elements, maze:', !!nextSnapshot.maze);
      console.log('[DesignStore] After redo - undoStack:', get().undoStack.length + 1, 'redoStack:', newRedoStack.length);
    }

    set((state) => ({
      designElements: nextSnapshot.designElements,
      maze: nextSnapshot.maze,
      undoStack: [...state.undoStack, currentSnapshot], // Push current to undo
      redoStack: newRedoStack,
      isDirty: true,
    }));

    // Sync backend with restored maze state
    if (nextSnapshot.maze !== maze) {
      import('../api/client').then(({ setWalls }) => {
        setWalls(nextSnapshot.maze).catch((err) => {
          if (import.meta.env.DEV) {
            console.error('[DesignStore] Failed to sync backend after redo:', err);
          }
        });
      });
    }
  },

  canUndo: () => {
    return get().undoStack.length > 0;
  },

  canRedo: () => {
    return get().redoStack.length > 0;
  },

  // === PROJECT ACTIONS ===

  setField: (field) => {
    if (import.meta.env.DEV) {
      console.log('[DesignStore] Setting field');
    }
    set({
      field,
      isDirty: true,
    });
  },

  setMaze: (maze) => {
    if (import.meta.env.DEV) {
      console.log('[DesignStore] Setting maze (computed result)');
    }
    set({
      maze,
      isDirty: true,
    });
  },

  clearMaze: () => {
    if (import.meta.env.DEV) {
      console.log('[DesignStore] Clearing maze');
    }
    set({
      maze: null,
      isDirty: true,
    });
  },

  // === VALIDATION ACTIONS ===

  setViolations: (violations) => {
    if (import.meta.env.DEV) {
      console.log('[DesignStore] Setting violations:', violations.length);
    }
    set({ violations });
  },

  setIsCarving: (isCarving) => {
    if (import.meta.env.DEV) {
      console.log('[DesignStore] Set isCarving:', isCarving);
    }
    set({ isCarving });
  },

  setShowViolationsOnCanvas: (show) => {
    if (import.meta.env.DEV) {
      console.log('[DesignStore] Show violations on canvas:', show);
    }
    set({ showViolationsOnCanvas: show });
  },

  setDesignElements: (elements) => {
    set((state) => {
      // Push current state to undo stack for undo capability (full snapshot including maze)
      const snapshot: UndoSnapshot = {
        designElements: state.designElements.map(el => ({ ...el, points: [...el.points] })),
        maze: state.maze,
      };
      const newUndoStack = [...state.undoStack, snapshot];

      const trimmedUndoStack =
        newUndoStack.length > MAX_HISTORY_SIZE
          ? newUndoStack.slice(newUndoStack.length - MAX_HISTORY_SIZE)
          : newUndoStack;

      if (import.meta.env.DEV) {
        console.log('[DesignStore] Replacing all elements:', elements.length);
      }

      return {
        designElements: elements,
        undoStack: trimmedUndoStack,
        redoStack: [],
        isDirty: true,
        violations: [], // Clear violations when elements change
      };
    });
  },

  // === CONSTRAINT ZONE ACTIONS ===

  addConstraintZone: (zone) => {
    const id = `zone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newZone = { ...zone, id };

    if (import.meta.env.DEV) {
      console.log('[DesignStore] Adding constraint zone:', newZone.type);
    }

    set(state => ({
      constraintZones: [...state.constraintZones, newZone],
      isDirty: true,
    }));

    return id;
  },

  removeConstraintZone: (id) => {
    if (import.meta.env.DEV) {
      console.log('[DesignStore] Removing constraint zone:', id);
    }
    set(state => ({
      constraintZones: state.constraintZones.filter(z => z.id !== id),
      isDirty: true,
    }));
  },

  // === SELECTION ACTIONS ===

  selectElement: (id, addToSelection = false) => {
    set(state => {
      if (addToSelection) {
        const newSet = new Set(state.selectedElementIds);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return { selectedElementIds: newSet };
      }
      return { selectedElementIds: new Set([id]) };
    });
  },

  selectElements: (ids) => {
    set({ selectedElementIds: new Set(ids) });
  },

  clearSelection: () => {
    set({
      selectedElementIds: new Set(),
      transformState: {
        activeHandle: null,
        startPos: null,
        startRotation: 0,
        startBounds: null,
        aspectRatio: null,
      },
    });
  },

  setHoveredElement: (id) => {
    set({ hoveredElementId: id });
  },

  startTransform: (handle, pos, bounds, rotation = 0, aspectRatio = null) => {
    set({
      transformState: {
        activeHandle: handle,
        startPos: pos,
        startRotation: rotation,
        startBounds: bounds,
        aspectRatio,
      },
    });
  },

  endTransform: () => {
    set({
      transformState: {
        activeHandle: null,
        startPos: null,
        startRotation: 0,
        startBounds: null,
        aspectRatio: null,
      },
    });
  },

  // === VERTEX EDITING ACTIONS ===

  setVertexEditing: (elementId) => {
    if (import.meta.env.DEV) {
      console.log('[DesignStore] Vertex editing:', elementId ? `element ${elementId.slice(0, 8)}` : 'disabled');
    }
    set({
      vertexEditingElementId: elementId,
      selectedVertexIndices: [],
      hoveredVertexIndex: null,
    });
  },

  selectVertex: (index, addToSelection = false) => {
    set(state => {
      if (addToSelection) {
        const indices = [...state.selectedVertexIndices];
        const existingIdx = indices.indexOf(index);
        if (existingIdx !== -1) {
          indices.splice(existingIdx, 1);
        } else {
          indices.push(index);
        }
        return { selectedVertexIndices: indices };
      }
      return { selectedVertexIndices: [index] };
    });
  },

  selectVertices: (indices) => {
    set({ selectedVertexIndices: indices });
  },

  clearVertexSelection: () => {
    set({ selectedVertexIndices: [] });
  },

  setHoveredVertex: (index) => {
    set({ hoveredVertexIndex: index });
  },

  moveSelectedVertices: (delta) => {
    const { vertexEditingElementId, selectedVertexIndices, designElements } = get();
    if (!vertexEditingElementId || selectedVertexIndices.length === 0) return;

    const element = designElements.find(e => e.id === vertexEditingElementId);
    if (!element) return;

    // Create new points array with moved vertices
    const newPoints = element.points.map((point, index) => {
      if (selectedVertexIndices.includes(index)) {
        return [point[0] + delta[0], point[1] + delta[1]] as [number, number];
      }
      return point;
    });

    // Update element without pushing to undo stack (live dragging)
    set(state => ({
      designElements: state.designElements.map(el =>
        el.id === vertexEditingElementId ? { ...el, points: newPoints } : el
      ),
      isDirty: true,
    }));
  },

  deleteSelectedVertices: () => {
    const { vertexEditingElementId, selectedVertexIndices, designElements } = get();
    if (!vertexEditingElementId || selectedVertexIndices.length === 0) return;

    const element = designElements.find(e => e.id === vertexEditingElementId);
    if (!element) return;

    // Need at least 3 vertices for a valid polygon, 2 for a line
    const minVertices = element.closed ? 3 : 2;
    const remainingCount = element.points.length - selectedVertexIndices.length;

    if (remainingCount < minVertices) {
      if (import.meta.env.DEV) {
        console.log('[DesignStore] Cannot delete: would leave too few vertices');
      }
      return;
    }

    // Push snapshot before deleting
    get().pushSnapshot();

    // Filter out selected vertices
    const newPoints = element.points.filter((_, index) => !selectedVertexIndices.includes(index));

    set(state => ({
      designElements: state.designElements.map(el =>
        el.id === vertexEditingElementId ? { ...el, points: newPoints } : el
      ),
      selectedVertexIndices: [],
      isDirty: true,
    }));

    if (import.meta.env.DEV) {
      console.log('[DesignStore] Deleted', selectedVertexIndices.length, 'vertices');
    }
  },

  // === PROJECT MANAGEMENT ===

  resetProject: () => {
    if (import.meta.env.DEV) {
      console.log('[DesignStore] Resetting project');
    }
    set({
      field: null,
      designElements: [],
      constraintZones: [],
      maze: null,
      selectedElementIds: new Set(),
      hoveredElementId: null,
      transformState: {
        activeHandle: null,
        startPos: null,
        startRotation: 0,
        startBounds: null,
        aspectRatio: null,
      },
      vertexEditingElementId: null,
      selectedVertexIndices: [],
      hoveredVertexIndex: null,
      violations: [],
      isCarving: false,
      undoStack: [],
      redoStack: [],
      isDirty: false,
      projectPath: null,
    });
  },

  markSaved: () => {
    set({ isDirty: false });
  },

  markDirty: () => {
    set({ isDirty: true });
  },
}));
