/**
 * Constraint Store: Manages maze generation constraints and design rules.
 *
 * Uses Zustand for state management with defaults from shared constants.
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

export const useConstraintStore = create<ConstraintState>((set) => ({
  // Initial state from defaults
  pathWidthMin: DEFAULT_CONSTRAINTS.pathWidthMin,
  wallWidthMin: DEFAULT_CONSTRAINTS.wallWidthMin,
  cornerRadius: DEFAULT_CONSTRAINTS.cornerRadius,
  edgeBuffer: DEFAULT_CONSTRAINTS.edgeBuffer,

  // Actions
  updateConstraint: (key, value) =>
    set({
      [key]: value,
    }),

  resetToDefaults: () =>
    set({
      pathWidthMin: DEFAULT_CONSTRAINTS.pathWidthMin,
      wallWidthMin: DEFAULT_CONSTRAINTS.wallWidthMin,
      cornerRadius: DEFAULT_CONSTRAINTS.cornerRadius,
      edgeBuffer: DEFAULT_CONSTRAINTS.edgeBuffer,
    }),
}));
