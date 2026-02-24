/**
 * Constraint Store: Manages maze generation constraints and design rules.
 *
 * Uses Zustand for state management with defaults from shared constants.
 * Values are persisted to localStorage so they survive session restarts.
 */

import { create } from 'zustand';
import { DEFAULT_CONSTRAINTS } from '../../../shared/constants';

interface ConstraintState {
  // State
  pathWidthMin: number;
  wallWidthMin: number;
  cornerRadius: number;
  edgeBuffer: number;

  // Actions
  updateConstraint: (key: keyof Omit<ConstraintState, 'updateConstraint' | 'resetToDefaults'>, value: number) => void;
  resetToDefaults: () => void;
}

const CONSTRAINT_STORAGE_KEY = 'corn-maze-cad-constraints';

type ConstraintValues = Pick<ConstraintState, 'pathWidthMin' | 'wallWidthMin' | 'cornerRadius' | 'edgeBuffer'>;

function loadConstraints(): ConstraintValues {
  try {
    const raw = localStorage.getItem(CONSTRAINT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        pathWidthMin: parsed.pathWidthMin ?? DEFAULT_CONSTRAINTS.pathWidthMin,
        wallWidthMin: parsed.wallWidthMin ?? DEFAULT_CONSTRAINTS.wallWidthMin,
        cornerRadius: parsed.cornerRadius ?? DEFAULT_CONSTRAINTS.cornerRadius,
        edgeBuffer: parsed.edgeBuffer ?? DEFAULT_CONSTRAINTS.edgeBuffer,
      };
    }
  } catch {
    // ignore
  }
  return {
    pathWidthMin: DEFAULT_CONSTRAINTS.pathWidthMin,
    wallWidthMin: DEFAULT_CONSTRAINTS.wallWidthMin,
    cornerRadius: DEFAULT_CONSTRAINTS.cornerRadius,
    edgeBuffer: DEFAULT_CONSTRAINTS.edgeBuffer,
  };
}

function saveConstraints(s: ConstraintValues) {
  try {
    localStorage.setItem(CONSTRAINT_STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

const initialConstraints = loadConstraints();

export const useConstraintStore = create<ConstraintState>((set, get) => ({
  // Initial state from localStorage or defaults
  pathWidthMin: initialConstraints.pathWidthMin,
  wallWidthMin: initialConstraints.wallWidthMin,
  cornerRadius: initialConstraints.cornerRadius,
  edgeBuffer: initialConstraints.edgeBuffer,

  // Actions
  updateConstraint: (key, value) => {
    set({ [key]: value });
    const s = get();
    saveConstraints({ pathWidthMin: s.pathWidthMin, wallWidthMin: s.wallWidthMin, cornerRadius: s.cornerRadius, edgeBuffer: s.edgeBuffer });
  },

  resetToDefaults: () => {
    const defaults: ConstraintValues = {
      pathWidthMin: DEFAULT_CONSTRAINTS.pathWidthMin,
      wallWidthMin: DEFAULT_CONSTRAINTS.wallWidthMin,
      cornerRadius: DEFAULT_CONSTRAINTS.cornerRadius,
      edgeBuffer: DEFAULT_CONSTRAINTS.edgeBuffer,
    };
    set(defaults);
    saveConstraints(defaults);
  },
}));
