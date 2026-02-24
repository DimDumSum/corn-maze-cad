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
  Paintbrush,
  Ruler,
  Circle,
  Axis3D,
  Type,
  Image,
  ImagePlus,
  Move,
  FlipHorizontal,
  Download,
  FolderOpen,
  Undo2,
  Redo2,
  RotateCcw,
  RotateCw,
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
import type { MazeMetrics } from '../../api/client';
import * as api from '../../api/client';
import { useUiStore } from '../../stores/uiStore';
import { useDesignStore } from '../../stores/designStore';
import { useConstraintStore } from '../../stores/constraintStore';
import { ValidationDialog } from '../ValidationDialog/ValidationDialog';
import { ImageImportDialog } from '../ImageImportDialog';
import { Tooltip } from '../Tooltip';
import { fmtLen, fmtArea } from '../../utils/fmt';
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
    <Tooltip tip={label} shortcut={shortcut}>
      <button
        className={`toolbar-button ${isActive ? 'active' : ''}`}
        onClick={onClick}
        aria-label={label}
        disabled={disabled}
      >
        <Icon size={18} />
      </button>
    </Tooltip>
  );
}

interface ActionButtonProps {
  Icon: LucideIcon;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
}

function ActionButton({ Icon, label, shortcut, onClick, disabled = false }: ActionButtonProps) {
  return (
    <Tooltip tip={label} shortcut={shortcut}>
      <button
        className="toolbar-button"
        onClick={onClick}
        aria-label={label}
        disabled={disabled}
      >
        <Icon size={18} />
      </button>
    </Tooltip>
  );
}

export type ExportFormat = 'kml' | 'png' | 'shapefile' | 'gpx' | 'dxf' | 'printable' | 'prescription';

interface ToolbarProps {
  onImportField?: () => void;
  onImportFromSatellite?: () => void;
  onLoadBoundary?: () => void;
  onExport: (format: ExportFormat) => void;
  onSave?: () => void;
  onLoad?: () => void;
}


export function Toolbar({ onImportField, onImportFromSatellite, onLoadBoundary, onExport, onSave, onLoad }: ToolbarProps) {
  const { selectedTool, setTool, camera, rotateCanvas } = useUiStore();
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

  const anyMenuOpen = showExportMenu;

  const closeAllMenus = () => {
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
      const result = await api.validateDesign({
        elements: designElements,
        field: field?.geometry,
        constraints: {
          wallWidthMin: wallWidthMin || 2,
          edgeBuffer: edgeBuffer || 3,
          pathWidthMin: pathWidthMin || 4.0,
        },
      });
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
      const result = await api.carveBatch(designElements, maze ?? undefined);

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
      const result = await api.autoFixDesign({
        elements: designElements,
        field: field?.geometry,
        constraints: {
          wallWidthMin: wallWidthMin || 2,
          edgeBuffer: edgeBuffer || 3,
        },
      });

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
    { name: 'restore', Icon: Paintbrush, label: 'Restore Rows', shortcut: 'U' },
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
        {onImportField && (
          <Tooltip tip="Import Field">
            <button
              className="toolbar-dropdown-button"
              onClick={onImportField}
              aria-label="Import Field"
            >
              <Download size={16} style={{ transform: 'rotate(180deg)' }} />
              <span>Import Field</span>
            </button>
          </Tooltip>
        )}
        {onImportFromSatellite && (
          <Tooltip tip="Draw Boundary">
            <button
              className="toolbar-dropdown-button"
              onClick={onImportFromSatellite}
              aria-label="Import Field from Satellite"
            >
              <Map size={16} />
              <span>Draw Boundary</span>
            </button>
          </Tooltip>
        )}
        {onLoadBoundary && (
          <Tooltip tip="Load Field Boundary from a previously saved project">
            <button
              className="toolbar-dropdown-button"
              onClick={onLoadBoundary}
              aria-label="Load Boundary from Project"
            >
              <FolderOpen size={16} />
              <span>Load Boundary</span>
            </button>
          </Tooltip>
        )}
        <ActionButton
          Icon={ImagePlus}
          label="Import Image"
          onClick={() => setShowImageImportDialog(true)}
        />
        <Tooltip tip="Carve Designs" shortcut="Enter">
          <button
            className={`carve-button ${designElements.length > 0 ? 'has-elements' : ''} ${violations.length > 0 ? 'has-violations' : ''}`}
            onClick={handleCarve}
            disabled={designElements.length === 0 || isCarving || !maze}
            aria-label="Carve designs"
          >
            {violations.length > 0 ? <AlertTriangle size={16} /> : <Scissors size={16} />}
            {designElements.length > 0 && (
              <span className={`count ${violations.length > 0 ? 'violation-count' : ''}`}>
                {violations.length > 0 ? violations.length : designElements.length}
              </span>
            )}
          </button>
        </Tooltip>
        <div style={{ position: 'relative' }}>
          <Tooltip tip="Export">
            <button
              className="toolbar-dropdown-button"
              onClick={() => { setShowExportMenu(!showExportMenu); }}
              aria-label="Export"
            >
              <Download size={16} />
              <span>Export</span>
              <span className="dropdown-arrow">&#9662;</span>
            </button>
          </Tooltip>
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
        {onSave && <ActionButton Icon={Save} label="Save Project" shortcut="Ctrl+S" onClick={onSave} />}

        <div className="toolbar-separator" />

        <ActionButton Icon={Undo2} label="Undo" shortcut="Ctrl+Z" onClick={undo} disabled={!canUndo()} />
        <ActionButton Icon={Redo2} label="Redo" shortcut="Ctrl+Y" onClick={redo} disabled={!canRedo()} />

        <div className="toolbar-separator" />

        <ActionButton Icon={RotateCcw} label="Rotate Left" shortcut="Shift+{" onClick={() => rotateCanvas(-Math.PI / 12)} />
        <ActionButton Icon={RotateCw} label="Rotate Right" shortcut="Shift+}" onClick={() => rotateCanvas(Math.PI / 12)} />
        {camera.rotation !== 0 && (
          <Tooltip tip="Reset Rotation" shortcut="Ctrl+0">
            <button
              className="toolbar-button rotation-reset"
              onClick={() => rotateCanvas(-camera.rotation)}
              aria-label="Reset rotation"
            >
              <span className="rotation-label">{Math.round(camera.rotation * 180 / Math.PI)}&deg;</span>
            </button>
          </Tooltip>
        )}
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
          background: 'var(--surface-dialog)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)',
          padding: 'var(--space-6)', minWidth: '220px', color: 'var(--text-primary)', fontSize: 'var(--font-size-md)',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
            <strong style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-gray-950)' }}>Maze Analysis</strong>
            <button onClick={() => setShowStats(false)} style={{
              background: 'none', border: 'none', color: 'var(--text-disabled)', cursor: 'pointer', fontSize: 'var(--font-size-xl)'
            }}>x</button>
          </div>
          {loadingMetrics ? (
            <div style={{ color: 'var(--text-disabled)' }}>Analyzing...</div>
          ) : mazeMetrics ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Difficulty</span>
                <span style={{
                  color: mazeMetrics.difficulty_score < 0.3 ? '#2e7d32'
                    : mazeMetrics.difficulty_score < 0.7 ? 'var(--color-orange)' : 'var(--color-red)',
                  fontWeight: 'bold',
                }}>
                  {(mazeMetrics.difficulty_score * 100).toFixed(0)}%
                  {mazeMetrics.difficulty_score < 0.3 ? ' Easy' : mazeMetrics.difficulty_score < 0.7 ? ' Medium' : ' Hard'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Dead Ends</span>
                <span>{mazeMetrics.dead_end_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Junctions</span>
                <span>{mazeMetrics.junction_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Wall Length</span>
                <span>{fmtLen(mazeMetrics.total_wall_length, 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Wall Segments</span>
                <span>{mazeMetrics.path_count}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Field Area</span>
                <span>{fmtArea(mazeMetrics.field_area_m2)}</span>
              </div>
              <button onClick={fetchMetrics} className="panel-apply-btn" style={{
                marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-5)',
              }}>
                Refresh
              </button>
            </div>
          ) : (
            <div style={{ color: 'var(--text-disabled)' }}>No data. Generate a maze first.</div>
          )}
        </div>
      )}
    </div>
  );
}
