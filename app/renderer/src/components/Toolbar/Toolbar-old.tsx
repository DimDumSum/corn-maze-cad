/**
 * Toolbar Component - Main toolbar with tool selection, actions, and view toggles
 */

import React from 'react';
import {
  MousePointer,
  Hand,
  Pencil,
  Minus,
  Square,
  Eraser,
  Ruler,
  FolderOpen,
  Grid3x3,
  Download,
  Undo,
  Redo,
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useHistoryStore } from '../../stores/historyStore';
import type { ToolName } from '../../../../shared/constants';
import './Toolbar.css';

interface ToolButtonProps {
  tool: ToolName;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  isActive: boolean;
  onClick: () => void;
}

function ToolButton({ icon, label, shortcut, isActive, onClick }: ToolButtonProps) {
  return (
    <button
      className={`toolbar-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={`${label} (${shortcut})`}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function ActionButton({ icon, label, onClick, disabled = false }: ActionButtonProps) {
  return (
    <button
      className="toolbar-button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
    >
      {icon}
    </button>
  );
}

interface ToolbarProps {
  onImportField: () => void;
  onGenerateMaze: () => void;
  onExport: () => void;
}

export function Toolbar({ onImportField, onGenerateMaze, onExport }: ToolbarProps) {
  const { selectedTool, setTool, showGrid, snapToGrid, toggleGrid, toggleSnap } = useUiStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  const tools: Array<{
    name: ToolName;
    icon: React.ReactNode;
    label: string;
    shortcut: string;
  }> = [
    { name: 'select', icon: <MousePointer size={18} />, label: 'Select', shortcut: 'V' },
    { name: 'pan', icon: <Hand size={18} />, label: 'Pan', shortcut: 'H' },
    { name: 'draw', icon: <Pencil size={18} />, label: 'Draw', shortcut: 'P' },
    { name: 'line', icon: <Minus size={18} />, label: 'Line', shortcut: 'L' },
    { name: 'rectangle', icon: <Square size={18} />, label: 'Rectangle', shortcut: 'R' },
    { name: 'eraser', icon: <Eraser size={18} />, label: 'Eraser', shortcut: 'E' },
    { name: 'measure', icon: <Ruler size={18} />, label: 'Measure', shortcut: 'M' },
  ];

  return (
    <div className="toolbar">
      {/* Tool Section */}
      <div className="toolbar-section tools">
        {tools.map((tool) => (
          <ToolButton
            key={tool.name}
            tool={tool.name}
            icon={tool.icon}
            label={tool.label}
            shortcut={tool.shortcut}
            isActive={selectedTool === tool.name}
            onClick={() => setTool(tool.name)}
          />
        ))}
      </div>

      <div className="toolbar-separator" />

      {/* Action Section */}
      <div className="toolbar-section actions">
        <ActionButton
          icon={<FolderOpen size={18} />}
          label="Import Field"
          onClick={onImportField}
        />
        <ActionButton
          icon={<Grid3x3 size={18} />}
          label="Generate Maze"
          onClick={onGenerateMaze}
        />
        <ActionButton icon={<Download size={18} />} label="Export" onClick={onExport} />

        <div className="toolbar-separator" />

        <ActionButton
          icon={<Undo size={18} />}
          label="Undo"
          onClick={undo}
          disabled={!canUndo()}
        />
        <ActionButton
          icon={<Redo size={18} />}
          label="Redo"
          onClick={redo}
          disabled={!canRedo()}
        />
      </div>

      <div className="toolbar-separator" />

      {/* View Section */}
      <div className="toolbar-section view">
        <label className="toolbar-checkbox">
          <input type="checkbox" checked={showGrid} onChange={toggleGrid} />
          <span>Grid</span>
        </label>
        <label className="toolbar-checkbox">
          <input type="checkbox" checked={snapToGrid} onChange={toggleSnap} />
          <span>Snap</span>
        </label>
      </div>
    </div>
  );
}
