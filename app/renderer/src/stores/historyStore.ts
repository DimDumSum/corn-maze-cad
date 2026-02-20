/**
 * History Store: Manages undo/redo with command pattern.
 *
 * Uses Zustand for state management with a maximum stack size of 50 commands.
 */

import { create } from 'zustand';
import type { Command } from '../../../shared/types';

const MAX_HISTORY_SIZE = 50;

interface HistoryState {
  // State
  undoStack: Command[];
  redoStack: Command[];

  // Actions
  execute: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  // Initial state
  undoStack: [],
  redoStack: [],

  // Execute a new command
  execute: (command) => {
    const { undoStack, redoStack } = get();
    if (import.meta.env.DEV) {
      console.log('[History] EXECUTE command:', command.name);
      console.log('[History] Before - undoStack:', undoStack.length, 'redoStack:', redoStack.length);
    }

    // Execute the command (redo it)
    command.redo();

    set((state) => {
      // Add to undo stack
      const newUndoStack = [...state.undoStack, command];

      // Trim to max size if needed
      const trimmedUndoStack =
        newUndoStack.length > MAX_HISTORY_SIZE
          ? newUndoStack.slice(newUndoStack.length - MAX_HISTORY_SIZE)
          : newUndoStack;

      if (import.meta.env.DEV) {
        console.log('[History] After - undoStack:', trimmedUndoStack.length, 'redoStack: 0 (CLEARED)');
      }

      return {
        undoStack: trimmedUndoStack,
        redoStack: [], // Clear redo stack when new command is executed
      };
    });
  },

  // Undo the last command
  undo: () => {
    const { undoStack, redoStack } = get();

    if (import.meta.env.DEV) {
      console.log('[History] UNDO called - undoStack:', undoStack.length, 'redoStack:', redoStack.length);
    }

    if (undoStack.length === 0) {
      if (import.meta.env.DEV) {
        console.log('[History] Nothing to undo');
      }
      return;
    }

    // Pop from undo stack
    const command = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    if (import.meta.env.DEV) {
      console.log('[History] Undoing command:', command.name);
    }

    // Call undo
    command.undo();

    // Push to redo stack
    set({
      undoStack: newUndoStack,
      redoStack: [...redoStack, command],
    });

    if (import.meta.env.DEV) {
      console.log('[History] After undo - undoStack:', newUndoStack.length, 'redoStack:', redoStack.length + 1);
    }
  },

  // Redo the last undone command
  redo: () => {
    const { undoStack, redoStack } = get();

    if (import.meta.env.DEV) {
      console.log('[History] REDO called - undoStack:', undoStack.length, 'redoStack:', redoStack.length);
    }

    if (redoStack.length === 0) {
      if (import.meta.env.DEV) {
        console.log('[History] Nothing to redo');
      }
      return;
    }

    // Pop from redo stack
    const command = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    if (import.meta.env.DEV) {
      console.log('[History] Redoing command:', command.name);
    }

    // Call redo
    command.redo();

    // Push to undo stack
    set({
      undoStack: [...undoStack, command],
      redoStack: newRedoStack,
    });

    if (import.meta.env.DEV) {
      console.log('[History] After redo - undoStack:', undoStack.length + 1, 'redoStack:', newRedoStack.length);
    }
  },

  // Check if undo is available
  canUndo: () => {
    return get().undoStack.length > 0;
  },

  // Check if redo is available
  canRedo: () => {
    return get().redoStack.length > 0;
  },

  // Clear both stacks
  clear: () => {
    set({
      undoStack: [],
      redoStack: [],
    });
  },
}));
