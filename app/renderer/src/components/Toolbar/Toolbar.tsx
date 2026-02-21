/**
 * Toolbar Component - Main toolbar with tool selection, actions, and view toggles
 */

import { useState } from 'react';
import {
  MousePointer,
  Hand,
  Pencil,
  Minus,
  Square,
  Eraser,
  Ruler,
  Circle,
  Axis3D,
  Type,
  Image,
  ImagePlus,
  Move,
  FlipHorizontal,
  Grid3x3,
  Download,
  Undo2,
  Redo2,
  Scissors,
  AlertTriangle,
  BarChart3,
  Save,
  LogIn,
  LogOut,
  ShieldAlert,
  Route,
  GitBranch,
  Map,
  type LucideIcon,
} from 'lucide-react';
import type { MazeAlgorithm, MazeMetrics } from '../../api/client';
import * as api from '../../api/client';
import { useUiStore } from '../../stores/uiStore';
import { useDesignStore } from '../../stores/designStore';
import { useConstraintStore } from '../../stores/constraintStore';
import { ValidationDialog } from '../ValidationDialog/ValidationDialog';
import { ImageImportDialog } from '../ImageImportDialog';
import type { ToolName } from '../../../../shared/constants';
import './Toolbar.css';

interface ToolButtonProps {
  Icon: LucideIcon;
  label: string;
  shortcut: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function ToolButton({ Icon, label, shortcut, isActive, onClick, disabled = false }: ToolButtonProps) {
  return (
    <button
      className={`toolbar-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={`${label} (${shortcut})`}
      aria-label={label}
      disabled={disabled}
    >
      <Icon size={18} />
    </button>
  );
}

interface ActionButtonProps {
  Icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function ActionButton({ Icon, label, onClick, disabled = false }: ActionButtonProps) {
  return (
    <button
      className="toolbar-button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
    >
      <Icon size={18} />
    </button>
  );
}

export type ExportFormat = 'kml' | 'png' | 'shapefile' | 'gpx' | 'dxf' | 'printable' | 'prescription';

interface ToolbarProps {
  onImportField?: () => void;
  onImportFromSatellite?: () => void;
  onGenerateMaze: (algorithm?: MazeAlgorithm) => void;
  onExport: (format: ExportFormat) => void;
  onSave?: () => void;
  onLoad?: () => void;
}

export function Toolbar({ onImportFromSatellite, onGenerateMaze, onExport, onSave, onLoad }: ToolbarProps) {
  const { selectedTool, setTool } = useUiStore();
  const {
    designElements,
    isCarving,
    violations,
    clearElements,
    setViolations,
    setIsCarving,
    setShowViolationsOnCanvas,
    setDesignElements,
    selectElements,
    undo,
    redo,
    canUndo,
    canRedo,
    maze,
    setMaze,
    field,
    pushSnapshot,
  } = useDesignStore();
  const { pathWidthMin, wallWidthMin, edgeBuffer } = useConstraintStore();

  // Validation dialog state
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationSummary, setValidationSummary] = useState({ wallWidth: 0, edgeBuffer: 0, total: 0 });
  const [isFixing, setIsFixing] = useState(false);

  // Image import dialog state
  const [showImageImportDialog, setShowImageImportDialog] = useState(false);

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Maze algorithm dropdown state
  const [showAlgoMenu, setShowAlgoMenu] = useState(false);

  const anyMenuOpen = showAlgoMenu || showExportMenu;

  const closeAllMenus = () => {
    setShowAlgoMenu(false);
    setShowExportMenu(false);
  };

  // Maze stats panel state
  const [showStats, setShowStats] = useState(false);
  const [mazeMetrics, setMazeMetrics] = useState<MazeMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const metrics = await api.getMazeMetrics();
      setMazeMetrics(metrics);
    } catch {
      setMazeMetrics(null);
    }
    setLoadingMetrics(false);
  };

  const handleShowStats = () => {
    setShowStats(!showStats);
    if (!showStats) {
      fetchMetrics();
    }
  };

  const handleCarve = async () => {
    if (designElements.length === 0) return;
    if (!maze) {
      if (import.meta.env.DEV) {
        console.warn('[Toolbar] Cannot carve: No maze exists. Generate a maze first.');
      }
      return;
    }

    setIsCarving(true);

    try {
      // Validate first
      const validateRes = await fetch('http://localhost:8000/geometry/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elements: designElements,
          maze: maze?.geometry,
          field: field?.geometry,
          constraints: {
            wallWidthMin: wallWidthMin || 2,
            edgeBuffer: edgeBuffer || 3,
            pathWidthMin: pathWidthMin || 4.0,
          },
        }),
      });

      const result = await validateRes.json();
      setViolations(result.violations || []);

      if (!result.valid) {
        if (import.meta.env.DEV) {
          console.log('[Toolbar] Validation failed:', result.violations?.length, 'violations');
        }
        // Show validation dialog with options
        setValidationSummary(result.summary || { wallWidth: 0, edgeBuffer: 0, total: result.violations?.length || 0 });
        setShowValidationDialog(true);
        setIsCarving(false);
        return;
      }

      // No violations - proceed to carve
      await performCarve();
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[Toolbar] Validation failed:', err);
      }
      setIsCarving(false);
    }
  };

  const performCarve = async () => {
    // Push snapshot BEFORE carving so we can undo the carve operation
    // This captures both the current designElements AND the current maze state
    pushSnapshot();

    setIsCarving(true);
    try {
      const carveRes = await fetch('http://localhost:8000/geometry/carve-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements: designElements, maze: maze?.geometry }),
      });

      const result = await carveRes.json();

      if (result.error) {
        if (import.meta.env.DEV) {
          console.error('[Toolbar] Carve failed:', result.error);
        }
      } else {
        // Update maze with carved result (does NOT push another snapshot)
        setMaze(result.maze);
        // Clear elements without pushing snapshot (already captured in pre-carve snapshot)
        clearElements();
        setViolations([]);
        setShowViolationsOnCanvas(false);
        if (import.meta.env.DEV) {
          console.log('[Toolbar] Carved successfully - undo will restore pre-carve state');
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[Toolbar] Carve failed:', err);
      }
    }
    setIsCarving(false);
  };

  const handleAutoFix = async () => {
    setIsFixing(true);
    try {
      const res = await fetch('http://localhost:8000/geometry/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elements: designElements,
          violations,
          field: field?.geometry,
          constraints: {
            wallWidthMin: wallWidthMin || 2,
            edgeBuffer: edgeBuffer || 3,
          },
        }),
      });

      const result = await res.json();

      if (result.elements) {
        // Replace design elements with fixed versions (with undo support)
        setDesignElements(result.elements);
        setViolations([]);
        setShowViolationsOnCanvas(false);
        setShowValidationDialog(false);

        if (import.meta.env.DEV) {
          console.log('[Toolbar] Auto-fix applied:', result.fixedCount, 'changes made');
          if (result.changes) {
            result.changes.forEach((c: { elementId: string; change: string }) => {
              console.log(`  - ${c.elementId.slice(0, 8)}: ${c.change}`);
            });
          }
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[Toolbar] Auto-fix failed:', err);
      }
    }
    setIsFixing(false);
  };

  const handleManualEdit = () => {
    // Close dialog but keep violations visible on canvas
    setShowValidationDialog(false);
    setShowViolationsOnCanvas(true);

    // Switch to Select tool for editing
    setTool('select');

    // Auto-select the first violating element(s)
    if (violations.length > 0) {
      const firstViolation = violations[0];
      if (firstViolation.elementIds && firstViolation.elementIds.length > 0) {
        selectElements(firstViolation.elementIds);
        if (import.meta.env.DEV) {
          console.log('[Toolbar] Manual edit mode: selected elements', firstViolation.elementIds);
        }
      }
    }
  };

  const handleCarveAnyway = async () => {
    setShowValidationDialog(false);
    setShowViolationsOnCanvas(false);
    await performCarve();
  };

  const handleCancelValidation = () => {
    setShowValidationDialog(false);
    setViolations([]);
    setShowViolationsOnCanvas(false);
  };

  const tools: Array<{
    name: ToolName;
    Icon: LucideIcon;
    label: string;
    shortcut: string;
    disabled?: boolean;
  }> = [
    { name: 'select', Icon: MousePointer, label: 'Select', shortcut: 'V' },
    { name: 'pan', Icon: Hand, label: 'Pan', shortcut: 'H' },
    { name: 'draw', Icon: Pencil, label: 'Draw', shortcut: 'P' },
    { name: 'line', Icon: Minus, label: 'Line', shortcut: 'L' },
    { name: 'rectangle', Icon: Square, label: 'Rectangle', shortcut: 'R' },
    { name: 'circle', Icon: Circle, label: 'Circle', shortcut: 'C' },
    { name: 'arc', Icon: Axis3D, label: 'Arc', shortcut: 'A' },
    { name: 'text', Icon: Type, label: 'Text', shortcut: 'T' },
    { name: 'clipart', Icon: Image, label: 'ClipArt', shortcut: 'I' },
    { name: 'eraser', Icon: Eraser, label: 'Eraser', shortcut: 'E' },
    { name: 'move', Icon: Move, label: 'Move', shortcut: 'G' },
    { name: 'flip', Icon: FlipHorizontal, label: 'Flip', shortcut: 'F' },
    { name: 'measure', Icon: Ruler, label: 'Measure', shortcut: 'M' },
    { name: 'entrance', Icon: LogIn, label: 'Place Entrance', shortcut: '1' },
    { name: 'exit', Icon: LogOut, label: 'Place Exit', shortcut: '2' },
    { name: 'emergency_exit', Icon: ShieldAlert, label: 'Emergency Exit', shortcut: '3' },
    { name: 'solution_path', Icon: Route, label: 'Solution Path', shortcut: '4' },
    { name: 'dead_end', Icon: GitBranch, label: 'Dead End', shortcut: '5' },
  ];

  return (
    <div className="toolbar">
      {/* Tool Section */}
      <div className="toolbar-section tools">
        {tools.map((tool) => (
          <ToolButton
            key={tool.name}
            Icon={tool.Icon}
            label={tool.label}
            shortcut={tool.shortcut}
            isActive={selectedTool === tool.name}
            onClick={() => setTool(tool.name)}
            disabled={tool.disabled}
          />
        ))}
      </div>

      <div className="toolbar-separator" />

      {/* Invisible backdrop to close any open dropdown */}
      {anyMenuOpen && (
        <div className="dropdown-backdrop" onClick={closeAllMenus} />
      )}

      {/* Action Section */}
      <div className="toolbar-section actions">
        {onImportFromSatellite && (
          <button
            className="toolbar-dropdown-button"
            onClick={onImportFromSatellite}
            title="Draw field boundary on satellite image"
            aria-label="Import Field from Satellite"
          >
            <Map size={16} />
            <span>Draw Boundary</span>
          </button>
        )}
        <ActionButton Icon={ImagePlus} label="Import Image" onClick={() => setShowImageImportDialog(true)} />
        <div style={{ position: 'relative' }}>
          <button
            className="toolbar-dropdown-button"
            onClick={() => { setShowAlgoMenu(!showAlgoMenu); setShowExportMenu(false); }}
            title="Generate Maze"
            aria-label="Generate Maze"
          >
            <Grid3x3 size={16} />
            <span>Generate</span>
            <span className="dropdown-arrow">&#9662;</span>
          </button>
          {showAlgoMenu && (
            <div className="export-dropdown">
              <button className="export-dropdown-item" onClick={() => { onGenerateMaze('backtracker'); setShowAlgoMenu(false); }}>
                Recursive Backtracker (Hard)
              </button>
              <button className="export-dropdown-item" onClick={() => { onGenerateMaze('prims'); setShowAlgoMenu(false); }}>
                Prim's Algorithm (Easy)
              </button>
              <button className="export-dropdown-item" onClick={() => { onGenerateMaze('grid'); setShowAlgoMenu(false); }}>
                Simple Grid
              </button>
            </div>
          )}
        </div>
        <button
          className={`carve-button ${designElements.length > 0 ? 'has-elements' : ''} ${violations.length > 0 ? 'has-violations' : ''}`}
          onClick={handleCarve}
          disabled={designElements.length === 0 || isCarving || !maze}
          title={!maze ? 'Generate a maze first' : violations.length > 0 ? `${violations.length} violations - click to review` : `Carve all designs (Enter)`}
          aria-label="Carve designs"
        >
          {violations.length > 0 ? <AlertTriangle size={16} /> : <Scissors size={16} />}
          {designElements.length > 0 && (
            <span className={`count ${violations.length > 0 ? 'violation-count' : ''}`}>
              {violations.length > 0 ? violations.length : designElements.length}
            </span>
          )}
        </button>
        <div style={{ position: 'relative' }}>
          <button
            className="toolbar-dropdown-button"
            onClick={() => { setShowExportMenu(!showExportMenu); setShowAlgoMenu(false); }}
            title="Export"
            aria-label="Export"
          >
            <Download size={16} />
            <span>Export</span>
            <span className="dropdown-arrow">&#9662;</span>
          </button>
          {showExportMenu && (
            <div className="export-dropdown">
              <button className="export-dropdown-item" onClick={() => { onExport('kml'); setShowExportMenu(false); }}>
                KML (MazeGPS)
              </button>
              <button className="export-dropdown-item" onClick={() => { onExport('png'); setShowExportMenu(false); }}>
                PNG + GeoJSON
              </button>
              <button className="export-dropdown-item" onClick={() => { onExport('shapefile'); setShowExportMenu(false); }}>
                Shapefile
              </button>
              <button className="export-dropdown-item" onClick={() => { onExport('gpx'); setShowExportMenu(false); }}>
                GPX (GPS Devices)
              </button>
              <button className="export-dropdown-item" onClick={() => { onExport('dxf'); setShowExportMenu(false); }}>
                DXF (AutoCAD)
              </button>
              <button className="export-dropdown-item" onClick={() => { onExport('printable'); setShowExportMenu(false); }}>
                Printable Map (PNG)
              </button>
              <button className="export-dropdown-item" onClick={() => { onExport('prescription'); setShowExportMenu(false); }}>
                Prescription Map (Planting)
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-separator" />

        <ActionButton Icon={BarChart3} label="Maze Stats" onClick={handleShowStats} disabled={!maze} />
        {onSave && <ActionButton Icon={Save} label="Save Project (Ctrl+S)" onClick={onSave} />}

        <div className="toolbar-separator" />

        <ActionButton Icon={Undo2} label="Undo" onClick={undo} disabled={!canUndo()} />
        <ActionButton Icon={Redo2} label="Redo" onClick={redo} disabled={!canRedo()} />
      </div>

      {/* Validation Dialog */}
      {showValidationDialog && (
        <ValidationDialog
          violations={violations}
          summary={validationSummary}
          onAutoFix={handleAutoFix}
          onManualEdit={handleManualEdit}
          onCarveAnyway={handleCarveAnyway}
          onCancel={handleCancelValidation}
          isFixing={isFixing}
        />
      )}

      {/* Image Import Dialog */}
      {showImageImportDialog && (
        <ImageImportDialog onClose={() => setShowImageImportDialog(false)} />
      )}

      {/* Maze Stats Panel */}
      {showStats && (
        <div className="maze-stats-panel" style={{
          position: 'fixed', top: '52px', right: '12px', zIndex: 1000,
          background: '#f0f0f0', border: '1px solid #b0b0b0', borderRadius: '4px',
          padding: '12px', minWidth: '220px', color: '#333', fontSize: '12px',
          boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <strong style={{ fontSize: '13px', color: '#222' }}>Maze Analysis</strong>
            <button onClick={() => setShowStats(false)} style={{
              background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px'
            }}>x</button>
          </div>
          {loadingMetrics ? (
            <div style={{ color: '#888' }}>Analyzing...</div>
          ) : mazeMetrics ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Difficulty</span>
                <span style={{
                  color: mazeMetrics.difficulty_score < 0.3 ? '#2e7d32'
                    : mazeMetrics.difficulty_score < 0.7 ? '#cc8800' : '#cc3333',
                  fontWeight: 'bold',
                }}>
                  {(mazeMetrics.difficulty_score * 100).toFixed(0)}%
                  {mazeMetrics.difficulty_score < 0.3 ? ' Easy' : mazeMetrics.difficulty_score < 0.7 ? ' Medium' : ' Hard'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Dead Ends</span>
                <span>{mazeMetrics.dead_end_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Junctions</span>
                <span>{mazeMetrics.junction_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Wall Length</span>
                <span>{mazeMetrics.total_wall_length.toFixed(0)}m</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Wall Segments</span>
                <span>{mazeMetrics.path_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#666' }}>Field Area</span>
                <span>{(mazeMetrics.field_area_m2 / 10000).toFixed(2)} ha</span>
              </div>
              <button onClick={fetchMetrics} style={{
                marginTop: '6px', padding: '4px 10px', background: '#4a90d9',
                color: '#fff', border: '1px solid #3a7bc8', borderRadius: '3px', cursor: 'pointer',
                fontSize: '11px',
              }}>
                Refresh
              </button>
            </div>
          ) : (
            <div style={{ color: '#888' }}>No data. Generate a maze first.</div>
          )}
        </div>
      )}
    </div>
  );
}
