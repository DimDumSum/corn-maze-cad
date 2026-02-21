/**
 * useKeyboardShortcuts Hook - Global keyboard shortcut handling
 */

import { useEffect } from 'react';
import { useUiStore } from '../stores/uiStore';
import { useDesignStore } from '../stores/designStore';
import type { ToolName } from '../../../shared/constants';
import {
  selectToolSelectAll,
  selectToolClearSelection,
  selectToolDeleteSelected,
  selectToolSetCopyMode,
  selectToolDuplicate,
  selectToolIsVertexEditing,
  selectToolExitVertexEditing,
  selectToolDeleteSelectedVertices,
  selectToolNudgeVertices,
} from '../tools/SelectTool';
import { lineToolFinish, lineToolCancel } from '../tools/LineTool';
import { moveToolSetCopyMode } from '../tools/MoveTool';
import {
  circleToolFinish,
  circleToolCancel,
  circleToolAdjustSegments,
  circleToolToggleFillMode,
} from '../tools/CircleTool';
import { rectangleToolToggleFillMode } from '../tools/RectangleTool';
import {
  arcToolFinish,
  arcToolCancel,
  arcToolCycleMode,
  arcToolAdjustSegments,
} from '../tools/ArcTool';
import {
  textToolFinish,
  textToolCancel,
} from '../tools/TextTool';
import { finalizeSolutionPath, clearSolutionPath } from '../tools/SolutionPathTool';
import { finalizeDeadEnd, clearDeadEnd } from '../tools/DeadEndTool';
import {
  clipArtToolFinish,
  clipArtToolCancel,
} from '../tools/ClipArtTool';
import {
  flipToolExecute,
  flipToolSetMode,
  flipToolAdjustAngle,
  flipToolSetCopyMode,
  flipToolActivate,
  flipToolCancel,
} from '../tools/FlipTool';

interface KeyboardShortcutsOptions {
  onShowHelp?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Get store actions
      const {
        setTool,
        toggleGrid,
        toggleSnap,
        cancelDrawing,
        isDrawing,
        setAngleConstraint,
      } = useUiStore.getState();
      const { undo, redo, canUndo, canRedo } = useDesignStore.getState();

      // Don't handle shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Capture number keys and decimal point for dimension input (SketchUp-style type-to-specify)
      if (/^[0-9.]$/.test(e.key)) {
        const { appendInputBuffer } = useUiStore.getState();
        e.preventDefault();
        appendInputBuffer(e.key);
        if (import.meta.env.DEV) {
          console.log('[Keyboard] Captured key for dimension input:', e.key);
        }
        return;
      }

      // Backspace - delete last character from input buffer
      if (e.key === 'Backspace') {
        const { inputBuffer, setInputBuffer } = useUiStore.getState();
        if (inputBuffer.length > 0) {
          e.preventDefault();
          setInputBuffer(inputBuffer.slice(0, -1));
          return;
        }
      }

      // Escape - cancel current drawing or clear selection (also clears input buffer)
      if (e.key === 'Escape') {
        const { selectedTool, clearInputBuffer } = useUiStore.getState();

        // Always clear input buffer on Escape
        clearInputBuffer();

        if (isDrawing) {
          e.preventDefault();
          // Line tool has special cancel logic
          if (selectedTool === 'line') {
            lineToolCancel();
          } else {
            cancelDrawing();
          }
          return;
        }

        // Cancel circle tool
        if (selectedTool === 'circle') {
          e.preventDefault();
          circleToolCancel();
          return;
        }

        // Cancel arc tool
        if (selectedTool === 'arc') {
          e.preventDefault();
          arcToolCancel();
          return;
        }

        // Cancel text tool
        if (selectedTool === 'text') {
          e.preventDefault();
          textToolCancel();
          return;
        }

        // Cancel clipart tool
        if (selectedTool === 'clipart') {
          e.preventDefault();
          clipArtToolCancel();
          return;
        }

        // Cancel solution path tool
        if (selectedTool === 'solution_path') {
          e.preventDefault();
          clearSolutionPath();
          return;
        }

        // Cancel dead end tool
        if (selectedTool === 'dead_end') {
          e.preventDefault();
          clearDeadEnd();
          return;
        }

        // Cancel flip tool
        if (selectedTool === 'flip') {
          e.preventDefault();
          flipToolCancel();
          return;
        }

        // Exit vertex editing mode first (if active), then clear selection
        if (selectedTool === 'select') {
          e.preventDefault();
          if (selectToolIsVertexEditing()) {
            selectToolExitVertexEditing();
          } else {
            selectToolClearSelection();
          }
          return;
        }
      }

      // Enter - finish current line or circle
      if (e.key === 'Enter') {
        const { selectedTool } = useUiStore.getState();
        if (selectedTool === 'line' && isDrawing) {
          e.preventDefault();
          lineToolFinish();
          return;
        }
        if (selectedTool === 'circle') {
          e.preventDefault();
          circleToolFinish();
          return;
        }
        if (selectedTool === 'arc') {
          e.preventDefault();
          arcToolFinish();
          return;
        }
        if (selectedTool === 'text') {
          e.preventDefault();
          textToolFinish();
          return;
        }
        if (selectedTool === 'clipart') {
          e.preventDefault();
          clipArtToolFinish();
          return;
        }
        if (selectedTool === 'solution_path') {
          e.preventDefault();
          finalizeSolutionPath();
          return;
        }
        if (selectedTool === 'dead_end') {
          e.preventDefault();
          finalizeDeadEnd();
          return;
        }
        if (selectedTool === 'flip') {
          e.preventDefault();
          flipToolExecute();
          return;
        }
      }

      // Tab - toggle fill mode (rectangle, circle) or cycle arc mode
      if (e.key === 'Tab') {
        const { selectedTool } = useUiStore.getState();
        if (selectedTool === 'rectangle') {
          e.preventDefault();
          rectangleToolToggleFillMode();
          return;
        }
        if (selectedTool === 'circle') {
          e.preventDefault();
          circleToolToggleFillMode();
          return;
        }
        if (selectedTool === 'arc') {
          e.preventDefault();
          arcToolCycleMode();
          return;
        }
      }

      // Arrow Up/Down - adjust segment count (for circle and arc tools) or flip angle (for flip tool)
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const { selectedTool } = useUiStore.getState();
        if (selectedTool === 'circle') {
          e.preventDefault();
          const delta = e.key === 'ArrowUp' ? (e.shiftKey ? 12 : 1) : (e.shiftKey ? -12 : -1);
          circleToolAdjustSegments(delta);
          return;
        }
        if (selectedTool === 'arc') {
          e.preventDefault();
          const delta = e.key === 'ArrowUp' ? (e.shiftKey ? 12 : 1) : (e.shiftKey ? -12 : -1);
          arcToolAdjustSegments(delta);
          return;
        }
        if (selectedTool === 'flip') {
          e.preventDefault();
          const delta = e.key === 'ArrowUp' ? (e.shiftKey ? 45 : 15) : (e.shiftKey ? -45 : -15);
          flipToolAdjustAngle(delta);
          return;
        }
      }

      // Arrow Left/Right - set flip mode (for flip tool)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const { selectedTool } = useUiStore.getState();
        if (selectedTool === 'flip') {
          e.preventDefault();
          if (e.key === 'ArrowLeft') {
            flipToolSetMode('vertical');
          } else {
            flipToolSetMode('horizontal');
          }
          return;
        }
      }

      // Shift - enable angle constraint (for draw tool)
      if (e.key === 'Shift') {
        setAngleConstraint(true);
      }

      // Ctrl - enable copy mode (for select, move and flip tools)
      if (e.key === 'Control' || e.key === 'Meta') {
        const { selectedTool } = useUiStore.getState();
        if (selectedTool === 'select') {
          selectToolSetCopyMode(true);
        }
        if (selectedTool === 'move') {
          moveToolSetCopyMode(true);
        }
        if (selectedTool === 'flip') {
          flipToolSetCopyMode(true);
        }
      }

      // Tool shortcuts (single keys)
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        const toolMap: Record<string, ToolName> = {
          v: 'select',
          h: 'pan',
          p: 'draw',
          l: 'line',
          r: 'rectangle',
          e: 'eraser',
          g: 'move',     // G for "grab"
          m: 'measure',  // M for "measure"
          c: 'circle',
          a: 'arc',
          t: 'text',
          i: 'clipart',  // I for "image/clipart"
          f: 'flip',
        };

        const key = e.key.toLowerCase();
        if (key in toolMap) {
          e.preventDefault();
          setTool(toolMap[key]);
          return;
        }

        // Snap toggle (S key)
        if (key === 's') {
          e.preventDefault();
          toggleSnap();
          return;
        }

        // Help modal (? key)
        if (key === '?' && options.onShowHelp) {
          e.preventDefault();
          options.onShowHelp();
          return;
        }
      }

      // Grid toggle (Ctrl+G) - separate from Move tool shortcut
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        toggleGrid();
        return;
      }

      // Undo (Ctrl+Z or Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (canUndo()) {
          e.preventDefault();
          undo();
        }
        return;
      }

      // Redo (Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z)
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z')) {
          if (canRedo()) {
            e.preventDefault();
            redo();
          }
          return;
        }
      }

      // Select tool shortcuts
      if (e.ctrlKey || e.metaKey) {
        const { selectedTool } = useUiStore.getState();

        // Select All (Ctrl+A) - when using select tool
        if (e.key === 'a' && selectedTool === 'select') {
          e.preventDefault();
          selectToolSelectAll();
          return;
        }

        // Duplicate (Ctrl+D) - when using select tool
        if (e.key === 'd' && selectedTool === 'select') {
          e.preventDefault();
          selectToolDuplicate();
          return;
        }
      }

      // Delete/Backspace - delete selection or vertices
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedTool } = useUiStore.getState();
        if (selectedTool === 'select') {
          e.preventDefault();
          // In vertex editing mode, delete selected vertices
          if (selectToolIsVertexEditing()) {
            selectToolDeleteSelectedVertices();
          } else {
            selectToolDeleteSelected();
          }
          return;
        }
      }

      // Arrow keys - nudge selected vertices (when in vertex editing mode)
      if (e.key.startsWith('Arrow')) {
        const { selectedTool } = useUiStore.getState();
        if (selectedTool === 'select' && selectToolIsVertexEditing()) {
          e.preventDefault();
          const nudgeAmount = e.shiftKey ? 0.1 : 0.5; // Shift = fine nudge
          switch (e.key) {
            case 'ArrowUp':
              selectToolNudgeVertices(0, nudgeAmount);
              break;
            case 'ArrowDown':
              selectToolNudgeVertices(0, -nudgeAmount);
              break;
            case 'ArrowLeft':
              selectToolNudgeVertices(-nudgeAmount, 0);
              break;
            case 'ArrowRight':
              selectToolNudgeVertices(nudgeAmount, 0);
              break;
          }
          return;
        }
      }

      // Zoom shortcuts
      if (e.ctrlKey || e.metaKey) {
        // Zoom in (Ctrl+= or Ctrl++)
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          const { zoomCamera } = useUiStore.getState();
          zoomCamera(0.1);
          return;
        }

        // Zoom out (Ctrl+-)
        if (e.key === '-') {
          e.preventDefault();
          const { zoomCamera } = useUiStore.getState();
          zoomCamera(-0.1);
          return;
        }

        // Reset zoom (Ctrl+0)
        if (e.key === '0') {
          e.preventDefault();
          const { resetCamera } = useUiStore.getState();
          resetCamera();
          return;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const { setAngleConstraint, selectedTool } = useUiStore.getState();

      // Shift released - disable angle constraint
      if (e.key === 'Shift') {
        setAngleConstraint(false);
      }

      // Ctrl released - disable copy mode (for select, move and flip tools)
      if (e.key === 'Control' || e.key === 'Meta') {
        if (selectedTool === 'select') {
          selectToolSetCopyMode(false);
        }
        if (selectedTool === 'move') {
          moveToolSetCopyMode(false);
        }
        if (selectedTool === 'flip') {
          flipToolSetCopyMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [options.onShowHelp]);
}
