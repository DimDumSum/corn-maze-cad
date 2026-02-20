/**
 * useTool Hook - Returns the current tool based on the selected tool in uiStore
 */

import { useUiStore } from '../stores/uiStore';
import type { Tool } from './types';
import { SelectTool } from './SelectTool';
import { PanTool } from './PanTool';
import { DrawPathTool } from './DrawPathTool';
import { LineTool } from './LineTool';
import { RectangleTool } from './RectangleTool';
import { EraserTool } from './EraserTool';
import { MeasureTool } from './MeasureTool';
import { MoveTool } from './MoveTool';
import { CircleTool } from './CircleTool';
import { ArcTool } from './ArcTool';
import { TextTool } from './TextTool';
import { ClipArtTool } from './ClipArtTool';
import { FlipTool } from './FlipTool';
import { EntranceTool } from './EntranceTool';
import { ExitTool } from './ExitTool';
import { EmergencyExitTool } from './EmergencyExitTool';
import { SolutionPathTool } from './SolutionPathTool';
import { DeadEndTool } from './DeadEndTool';

/**
 * Hook to get the current active tool based on uiStore selection
 * @returns The currently selected Tool object
 */
export function useTool(): Tool {
  const selectedTool = useUiStore((state) => state.selectedTool);

  switch (selectedTool) {
    case 'select':
      return SelectTool;
    case 'pan':
      return PanTool;
    case 'draw':
      return DrawPathTool;
    case 'line':
      return LineTool;
    case 'rectangle':
      return RectangleTool;
    case 'eraser':
      return EraserTool;
    case 'measure':
      return MeasureTool;
    case 'move':
      return MoveTool;
    case 'circle':
      return CircleTool;
    case 'arc':
      return ArcTool;
    case 'text':
      return TextTool;
    case 'clipart':
      return ClipArtTool;
    case 'flip':
      return FlipTool;
    case 'entrance':
      return EntranceTool;
    case 'exit':
      return ExitTool;
    case 'emergency_exit':
      return EmergencyExitTool;
    case 'solution_path':
      return SolutionPathTool;
    case 'dead_end':
      return DeadEndTool;
    default:
      return SelectTool;
  }
}
