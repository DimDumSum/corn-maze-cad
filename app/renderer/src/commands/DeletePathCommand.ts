/**
 * Delete Path Command - Undo/Redo support for path deletion
 */

import type { Command } from './types';
import { createCommand } from './createCommand';
import { useProjectStore } from '../stores/projectStore';

/**
 * Create a command for deleting a path element
 *
 * @param pathId - ID of the path being deleted
 * @param pathGeometry - Geometry of the path (to restore on undo)
 * @returns Command object
 */
export function createDeletePathCommand(
  pathId: string,
  pathGeometry: any
): Command {
  return createCommand(
    'Delete Path',
    // Undo: re-add the deleted path
    () => {
      const { addPath } = useProjectStore.getState();
      addPath(pathId, pathGeometry);
    },
    // Redo: remove the path again
    () => {
      const { removePath } = useProjectStore.getState();
      removePath(pathId);
    }
  );
}
