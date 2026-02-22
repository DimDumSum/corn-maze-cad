/**
 * PanelTray - SketchUp-style right-side collapsible panel tray
 *
 * Sections:
 * - Entity Info: Shows selected element properties
 * - Constraints: Edit maze generation constraints
 * - Project: Field area, element count, maze info
 */

import { useState } from 'react';
import { ChevronDown, Navigation } from 'lucide-react';
import { useDesignStore } from '../../stores/designStore';
import { useConstraintStore } from '../../stores/constraintStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUiStore } from '../../stores/uiStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { fmtShort, fmtArea, fmtUnit, fmtFromMeters, fmtToMeters } from '../../utils/fmt';
import { SettingsDialog } from '../SettingsDialog/SettingsDialog';
import { Tooltip } from '../Tooltip';
import { DimensionInput } from '../DimensionInput';
import type { UnitSystem } from '../../utils/units';
import * as api from '../../api/client';
import './PanelTray.css';

interface PanelSectionProps {
  title: string;
  tooltip?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function PanelSection({ title, tooltip, defaultOpen = true, children }: PanelSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const header = (
    <div className="panel-header" onClick={() => setIsOpen(!isOpen)}>
      <ChevronDown size={12} className={`chevron ${!isOpen ? 'collapsed' : ''}`} />
      <span className="panel-title">{title}</span>
    </div>
  );

  return (
    <div className="panel-section">
      {tooltip ? (
        <Tooltip tip={title} desc={tooltip} side="left">
          {header}
        </Tooltip>
      ) : (
        header
      )}
      <div className={`panel-body ${!isOpen ? 'collapsed' : ''}`}>
        {children}
      </div>
    </div>
  );
}

export function PanelTray() {
  const { designElements, selectedElementIds, maze, field, planterConfig, setPlanterConfig, planterRowGrid, setPlanterRowGrid, showPlanterRows, setShowPlanterRows, setMaze, aerialUnderlay, setAerialUnderlay } = useDesignStore();
  const { pathWidthMin, wallWidthMin, edgeBuffer, cornerRadius, updateConstraint, resetToDefaults } = useConstraintStore();
  const { isDirty } = useProjectStore();
  const { setTool, selectedTool, showSatellite, setShowSatellite, showCarvedOverlay, setShowCarvedOverlay, showCarvedBorder, setShowCarvedBorder, restoreBrushWidth, setRestoreBrushWidth } = useUiStore();
  const camera = useUiStore((s) => s.camera);
  const [applyingGrid, setApplyingGrid] = useState(false);
  const [fetchingSatellite, setFetchingSatellite] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const { unitSystem, setUnitSystem } = useSettingsStore();
  const { updateDesignElement } = useDesignStore();

  // Get selected elements
  const selectedElements = designElements.filter(el => selectedElementIds.has(el.id));

  // Calculate field area
  const fieldArea = field ? calculateFieldArea(field.geometry) : 0;

  const unit = fmtUnit();

  return (
    <div className="panel-tray">
      {/* Entity Info */}
      <PanelSection title="Entity Info" tooltip="Properties of the currently selected element.">
        {selectedElements.length === 0 ? (
          <div className="element-info-empty">No selection</div>
        ) : selectedElements.length === 1 ? (
          <>
            <div className="prop-row">
              <span className="prop-label">Type</span>
              <span className="element-type-badge">{selectedElements[0].type}</span>
            </div>
            <div className="prop-row">
              <span className="prop-label">Points</span>
              <span className="prop-value">{selectedElements[0].points.length}</span>
            </div>
            <DimensionInput
              label="Width"
              value={parseFloat(fmtFromMeters(selectedElements[0].width).toFixed(1))}
              min={0}
              max={65}
              step={0.5}
              unit={unit}
              onChange={(val) => {
                if (val >= 0) {
                  updateDesignElement(selectedElements[0].id, { width: fmtToMeters(val) });
                }
              }}
            />
            {selectedElements[0].rotation !== undefined && selectedElements[0].rotation !== 0 && (
              <div className="prop-row">
                <span className="prop-label">Rotation</span>
                <span className="prop-value">{selectedElements[0].rotation.toFixed(1)}&deg;</span>
              </div>
            )}
            <div className="prop-row">
              <span className="prop-label">Closed</span>
              <span className="prop-value">{selectedElements[0].closed ? 'Yes' : 'No'}</span>
            </div>
          </>
        ) : (
          <>
            <div className="prop-row">
              <span className="prop-label">Selected</span>
              <span className="prop-value selection-count">{selectedElements.length} elements</span>
            </div>
          </>
        )}
      </PanelSection>

      {/* Restore Brush (shown when restore tool is active) */}
      {selectedTool === 'restore' && (
        <PanelSection title="Restore Brush" tooltip="Adjust the brush size for restoring carved areas back to standing corn.">
          <DimensionInput
            label="Brush Width"
            value={parseFloat(fmtFromMeters(restoreBrushWidth).toFixed(1))}
            min={1}
            max={65}
            step={0.5}
            unit={unit}
            onChange={(val) => setRestoreBrushWidth(fmtToMeters(val || 1))}
          />
          <div className="prop-row" style={{ opacity: 0.6, fontSize: 'var(--font-size-sm)' }}>
            <span>[ / ] keys to adjust</span>
          </div>
        </PanelSection>
      )}

      {/* Constraints */}
      <PanelSection title="Constraints" tooltip="Minimum dimensions the maze generator and validator enforce.">
        <Tooltip tip="Path Width" desc="Minimum width of walkable paths through the maze. Wider paths are easier to navigate." side="left">
          <div style={{ width: '100%' }}>
            <DimensionInput
              label="Path Width"
              value={parseFloat(fmtFromMeters(pathWidthMin).toFixed(1))}
              min={1}
              max={65}
              step={0.5}
              unit={unit}
              onChange={(val) => updateConstraint('pathWidthMin', fmtToMeters(val || 1))}
            />
          </div>
        </Tooltip>
        <Tooltip tip="Wall Width" desc="Minimum number of standing corn rows that form a wall between paths." side="left">
          <div style={{ width: '100%' }}>
            <DimensionInput
              label="Wall Width"
              value={parseFloat(fmtFromMeters(wallWidthMin).toFixed(1))}
              min={0.5}
              max={33}
              step={0.5}
              unit={unit}
              onChange={(val) => updateConstraint('wallWidthMin', fmtToMeters(val || 0.5))}
            />
          </div>
        </Tooltip>
        <Tooltip tip="Edge Buffer" desc="Minimum clearance between designs and the field boundary." side="left">
          <div style={{ width: '100%' }}>
            <DimensionInput
              label="Edge Buffer"
              value={parseFloat(fmtFromMeters(edgeBuffer).toFixed(1))}
              min={0}
              max={65}
              step={0.5}
              unit={unit}
              onChange={(val) => updateConstraint('edgeBuffer', fmtToMeters(val || 0))}
            />
          </div>
        </Tooltip>
        <Tooltip tip="Corner Radius" desc="Minimum turning radius at path junctions. Larger values make smoother turns." side="left">
          <div style={{ width: '100%' }}>
            <DimensionInput
              label="Corner Radius"
              value={parseFloat(fmtFromMeters(cornerRadius).toFixed(1))}
              min={0}
              max={33}
              step={0.5}
              unit={unit}
              onChange={(val) => updateConstraint('cornerRadius', fmtToMeters(val || 0))}
            />
          </div>
        </Tooltip>
        <button className="panel-reset-btn" onClick={resetToDefaults}>
          Reset Defaults
        </button>
      </PanelSection>

      {/* Planter Specs */}
      <PanelSection title="Planter Specs" tooltip="Configure your planter to align maze walls with actual corn rows.">
        <Tooltip tip="Rows" desc="Number of rows your planter sows in a single pass." side="left">
          <div className="constraint-row" style={{ width: '100%' }}>
            <label>Rows</label>
            <select
              className="constraint-input"
              value={planterConfig.rows}
              onChange={(e) => setPlanterConfig({ rows: Number(e.target.value) })}
              style={{ width: '60px' }}
            >
              {[4, 6, 8, 12, 16, 18].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </Tooltip>
        <Tooltip tip="Spacing" desc="Distance between adjacent corn rows, set by your planter." side="left">
          <div className="constraint-row" style={{ width: '100%' }}>
            <label>Spacing</label>
            <select
              className="constraint-input"
              value={planterConfig.spacingInches}
              onChange={(e) => setPlanterConfig({ spacingInches: Number(e.target.value) })}
              style={{ width: '60px' }}
            >
              {[24, 30, 36].map(n => (
                <option key={n} value={n}>{n}"</option>
              ))}
            </select>
          </div>
        </Tooltip>
        <Tooltip tip="Direction" desc="Compass heading of the planting rows (0 = North). Drag the compass icon to pick on the field." side="left">
          <div className="constraint-row" style={{ width: '100%' }}>
            <label>Direction</label>
            <input
              type="number"
              className="constraint-input"
              value={planterConfig.directionDeg}
              onChange={(e) => setPlanterConfig({ directionDeg: ((Number(e.target.value) % 360) + 360) % 360 })}
              min={0} max={359} step={1}
              style={{ width: '48px' }}
            />
            <span className="constraint-unit">&deg;</span>
            <button
              className="panel-reset-btn"
              onClick={() => setTool('planting_direction')}
              title="Click & drag on field to set direction"
              style={{ padding: '2px 4px', display: 'flex', alignItems: 'center' }}
            >
              <Navigation size={12} />
            </button>
          </div>
        </Tooltip>
        <Tooltip tip="Headlands" desc="Number of border passes around the field edge before the interior maze." side="left">
          <div style={{ width: '100%' }}>
            <DimensionInput
              label="Headlands"
              value={planterConfig.headlands}
              min={0}
              max={10}
              step={1}
              decimals={0}
              unit="passes"
              onChange={(val) => setPlanterConfig({ headlands: Math.max(0, val) })}
            />
          </div>
        </Tooltip>

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          <button
            className="panel-apply-btn"
            disabled={!field || applyingGrid}
            onClick={async () => {
              if (!field) return;
              setApplyingGrid(true);
              try {
                // Compute visual corn row overlay
                const result = await api.computePlanterGrid(
                  planterConfig.rows,
                  planterConfig.spacingInches,
                  planterConfig.directionDeg,
                  planterConfig.headlands,
                );
                if (!result.error) {
                  setPlanterRowGrid({
                    planterConfig: {
                      rows: result.planter_config.rows ?? result.planter_config.planter_rows,
                      spacingInches: result.planter_config.spacingInches ?? result.planter_config.spacing_inches,
                      directionDeg: result.planter_config.directionDeg ?? result.planter_config.direction_deg,
                      headlands: result.planter_config.headlands,
                    },
                    headlandLines: result.headland_lines,
                    interiorLines: result.interior_lines,
                    headlandBoundary: result.headland_boundary,
                    planterWidth: result.planter_width,
                    headlandInset: result.headland_inset,
                    totalRows: result.total_rows,
                    headlandRowCount: result.headland_row_count,
                    interiorRowCount: result.interior_row_count,
                  });
                  setShowPlanterRows(true);

                  // Generate maze walls (standing corn rows clipped to interior)
                  const rowSpacingM = planterConfig.spacingInches * 0.0254;
                  const rowsPerCell = Math.max(1, Math.round((pathWidthMin || 3.0) / rowSpacingM));
                  const mazeSpacing = rowsPerCell * rowSpacingM;
                  const mazeResult = await api.generateMaze(
                    mazeSpacing,
                    'standing',
                    undefined,
                    planterConfig.directionDeg,
                    result.headland_inset,
                    rowSpacingM,
                  );
                  if (!mazeResult.error) {
                    setMaze(mazeResult);
                  }
                }
              } catch (err) {
                if (import.meta.env.DEV) {
                  console.error('[PanelTray] Planter grid failed:', err);
                }
              }
              setApplyingGrid(false);
            }}
          >
            {applyingGrid ? 'Computing...' : 'Apply'}
          </button>
        </div>

        {showPlanterRows && planterRowGrid && (
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: '3px', borderTop: '1px solid var(--border-color-light)', paddingTop: 'var(--space-3)' }}>
            <div className="prop-row">
              <span className="prop-label">Headland rows</span>
              <span className="prop-value">{planterRowGrid.headlandRowCount.toLocaleString()}</span>
            </div>
            <div className="prop-row">
              <span className="prop-label">Interior rows</span>
              <span className="prop-value">{planterRowGrid.interiorRowCount.toLocaleString()}</span>
            </div>
            <div className="prop-row">
              <span className="prop-label">Row spacing</span>
              <span className="prop-value">{planterRowGrid.planterConfig.spacingInches}" ({fmtShort(planterRowGrid.planterConfig.spacingInches * 0.0254)})</span>
            </div>
            <div className="prop-row">
              <span className="prop-label">Planter width</span>
              <span className="prop-value">{fmtShort(planterRowGrid.planterWidth)}</span>
            </div>
          </div>
        )}
      </PanelSection>

      {/* View Overlays */}
      <PanelSection title="View" tooltip="Toggle visual overlays on the canvas.">
        <Tooltip tip="Satellite" desc="Show satellite imagery beneath the maze design." side="left">
          <div className="constraint-row" style={{ width: '100%' }}>
            <label>Satellite</label>
            <input
              type="checkbox"
              checked={showSatellite}
              onChange={async (e) => {
                const checked = e.target.checked;
                if (checked && !aerialUnderlay && field) {
                  setFetchingSatellite(true);
                  try {
                    const result = await api.fetchSatelliteImage(18);
                    if (!result.error && result.imageData && result.bounds) {
                      setAerialUnderlay({
                        imageData: result.imageData,
                        bounds: result.bounds,
                        opacity: 0.6,
                      });
                    }
                  } catch (err) {
                    if (import.meta.env.DEV) {
                      console.error('[PanelTray] Satellite fetch failed:', err);
                    }
                  }
                  setFetchingSatellite(false);
                }
                setShowSatellite(checked);
              }}
              disabled={!field || fetchingSatellite}
            />
            {fetchingSatellite && <span className="constraint-unit" style={{ fontSize: 'var(--font-size-xs)' }}>Loading...</span>}
          </div>
        </Tooltip>
        {showSatellite && aerialUnderlay && (
          <div className="constraint-row">
            <label>Opacity</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={aerialUnderlay.opacity}
              onChange={(e) => {
                setAerialUnderlay({
                  ...aerialUnderlay,
                  opacity: parseFloat(e.target.value),
                });
              }}
              style={{ width: '80px' }}
            />
            <span className="constraint-unit">{Math.round(aerialUnderlay.opacity * 100)}%</span>
          </div>
        )}
        <Tooltip tip="Carve Fill" desc="Show shaded fill on areas that have been carved (mowed paths)." side="left">
          <div className="constraint-row" style={{ width: '100%' }}>
            <label>Carve Fill</label>
            <input
              type="checkbox"
              checked={showCarvedOverlay}
              onChange={(e) => setShowCarvedOverlay(e.target.checked)}
              disabled={!maze?.carvedAreas}
            />
          </div>
        </Tooltip>
        <Tooltip tip="Carve Border" desc="Show outlines around carved areas for clarity." side="left">
          <div className="constraint-row" style={{ width: '100%' }}>
            <label>Carve Border</label>
            <input
              type="checkbox"
              checked={showCarvedBorder}
              onChange={(e) => setShowCarvedBorder(e.target.checked)}
              disabled={!maze?.carvedAreas}
            />
          </div>
        </Tooltip>
      </PanelSection>

      {/* Project Info */}
      <PanelSection title="Project" tooltip="Overview of the current project status.">
        <div className="prop-row">
          <span className="prop-label">Status</span>
          <span className="prop-value">{isDirty ? 'Modified' : 'Saved'}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Field</span>
          <span className="prop-value">{field ? fmtArea(fieldArea) : 'None'}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Maze</span>
          <span className="prop-value">{maze ? `${maze.walls?.length || 0} walls` : 'None'}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Elements</span>
          <span className="prop-value">{designElements.length}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Zoom</span>
          <span className="prop-value">{(camera.scale * 100).toFixed(0)}%</span>
        </div>
        {camera.rotation !== 0 && (
          <div className="prop-row">
            <span className="prop-label">Rotation</span>
            <span className="prop-value">{(camera.rotation * 180 / Math.PI).toFixed(1)}&deg;</span>
          </div>
        )}
      </PanelSection>

      {/* Settings */}
      <PanelSection title="Settings" tooltip="Change units, keyboard shortcuts, and other preferences." defaultOpen={false}>
        <Tooltip tip="Units" desc="Switch between metric (meters) and imperial (feet)." side="left">
          <div className="constraint-row" style={{ width: '100%' }}>
            <label>Units</label>
            <select
              className="constraint-input"
              value={unitSystem}
              onChange={(e) => setUnitSystem(e.target.value as UnitSystem)}
              style={{ width: '80px' }}
            >
              <option value="metric">Metric</option>
              <option value="imperial">Imperial</option>
            </select>
          </div>
        </Tooltip>
        <button
          className="panel-apply-btn"
          onClick={() => setShowSettingsDialog(true)}
          style={{ marginTop: 'var(--space-2)' }}
        >
          Customize Controls
        </button>
      </PanelSection>

      {/* Settings Dialog (modal) */}
      <SettingsDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
      />
    </div>
  );
}

/**
 * Calculate the area of a geometry in square meters
 */
function calculateFieldArea(geometry: any): number {
  if (!geometry?.exterior) return 0;

  const coords = geometry.exterior;
  let area = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
}
