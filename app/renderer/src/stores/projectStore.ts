/**
 * Project Store: Manages field boundary, maze walls, and path elements.
 *
 * Uses Zustand for state management with immer middleware for immutable updates.
 */

import { create } from 'zustand';
import type { FieldBoundary, MazeWalls, PathElement } from '../../../shared/types';

interface ProjectState {
  // State
  field: FieldBoundary | null;
  maze: MazeWalls | null;
  pathElements: Map<string, PathElement>;
  isDirty: boolean;
  projectPath: string | null;

  // Actions
  setField: (field: FieldBoundary | null) => void;
  setMaze: (maze: MazeWalls | null) => void;
  addPath: (id: string, geometry: any) => void;
  removePath: (id: string) => void;
  updatePath: (id: string, geometry: any) => void;
  clearPaths: () => void;
  resetProject: () => void;
  markSaved: () => void;
  markDirty: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  // Initial state
  field: null,
  maze: null,
  pathElements: new Map(),
  isDirty: false,
  projectPath: null,

  // Actions
  setField: (field) =>
    set({
      field,
      isDirty: true,
    }),

  setMaze: (maze) =>
    set({
      maze,
      isDirty: true,
    }),

  addPath: (id, geometry) =>
    set((state) => {
      const newPaths = new Map(state.pathElements);
      newPaths.set(id, {
        id,
        geometry,
        createdAt: Date.now(),
      });
      return {
        pathElements: newPaths,
        isDirty: true,
      };
    }),

  removePath: (id) =>
    set((state) => {
      const newPaths = new Map(state.pathElements);
      newPaths.delete(id);
      return {
        pathElements: newPaths,
        isDirty: true,
      };
    }),

  updatePath: (id, geometry) =>
    set((state) => {
      const newPaths = new Map(state.pathElements);
      const existingPath = newPaths.get(id);
      if (existingPath) {
        newPaths.set(id, {
          ...existingPath,
          geometry,
        });
      }
      return {
        pathElements: newPaths,
        isDirty: true,
      };
    }),

  clearPaths: () =>
    set({
      pathElements: new Map(),
      isDirty: true,
    }),

  resetProject: () =>
    set({
      field: null,
      maze: null,
      pathElements: new Map(),
      isDirty: false,
      projectPath: null,
    }),

  markSaved: () =>
    set({
      isDirty: false,
    }),

  markDirty: () =>
    set({
      isDirty: true,
    }),
}));
