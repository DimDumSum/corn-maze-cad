/**
 * Carve Path Command - Undo/Redo support for path carving operations
 */

import type { Command } from './types';
import type { MazeWalls } from '../../../shared/types';
import { createCommand } from './createCommand';
import { useProjectStore } from '../stores/projectStore';

/**
 * Create a command for carving a path through maze walls
 *
 * @param prevMaze - Maze state before carving (or null if no maze)
 * @param newMaze - Maze state after carving
 * @param pathGeometry - The path that was carved (for display purposes)
 * @returns Command object
 */
export function createCarvePathCommand(
  prevMaze: MazeWalls | null,
  newMaze: MazeWalls,
  _pathGeometry: any
): Command {
  return createCommand(
    'Carve Path',
    // Undo: restore previous maze state
    () => {
      const { setMaze } = useProjectStore.getState();
      setMaze(prevMaze);
    },
    // Redo: apply new maze state
    () => {
      const { setMaze } = useProjectStore.getState();
      setMaze(newMaze);
    }
  );
}
