/**
 * Generate Maze Command - Undo/Redo support for maze generation
 */

import type { Command } from './types';
import type { MazeWalls } from '../../../shared/types';
import { createCommand } from './createCommand';
import { useProjectStore } from '../stores/projectStore';
import * as api from '../api/client';

/**
 * Create a command for generating a maze
 *
 * @param prevMaze - Maze state before generation (or null if first generation)
 * @param newMaze - Newly generated maze state
 * @returns Command object
 */
export function createGenerateMazeCommand(
  prevMaze: MazeWalls | null,
  newMaze: MazeWalls
): Command {
  return createCommand(
    'Generate Maze',
    // Undo: restore previous maze state (or null if it was the first generation)
    () => {
      const { setMaze } = useProjectStore.getState();
      if (prevMaze) {
        setMaze(prevMaze);
      } else {
        // If there was no previous maze, set to null
        setMaze(null);
      }
      // Sync backend state
      api.setWalls(prevMaze).catch(err => {
        if (import.meta.env.DEV) {
          console.error('[GenerateMaze] Failed to sync undo state:', err);
        }
      });
    },
    // Redo: apply newly generated maze
    () => {
      const { setMaze } = useProjectStore.getState();
      setMaze(newMaze);
      // Sync backend state
      api.setWalls(newMaze).catch(err => {
        if (import.meta.env.DEV) {
          console.error('[GenerateMaze] Failed to sync redo state:', err);
        }
      });
    }
  );
}
