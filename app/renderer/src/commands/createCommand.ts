/**
 * Helper functions for creating commands
 */

import { nanoid } from 'nanoid';
import type { Command } from './types';

/**
 * Create a command with auto-generated ID and timestamp
 *
 * @param name - Human-readable command name (e.g., "Carve Path", "Generate Maze")
 * @param undo - Function to undo the command
 * @param redo - Function to redo the command
 * @returns Command object
 */
export function createCommand(
  name: string,
  undo: () => void,
  redo: () => void
): Command {
  return {
    id: nanoid(),
    name,
    timestamp: Date.now(),
    undo,
    redo,
  };
}
