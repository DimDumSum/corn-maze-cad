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
import { getRestoreBrushWidth, setRestoreBrushWidth } from '../../tools/RestoreTool';
import { useSettingsStore } from '../../stores/settingsStore';
import { fmtShort, fmtArea, fmtUnit, fmtFromMeters, fmtToMeters } from '../../utils/fmt';
import { SettingsDialog } from '../SettingsDialog/SettingsDialog';
import type { UnitSystem } from '../../utils/units';
import * as api from '../../api/client';
import './PanelTray.css';

interface PanelSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function PanelSection({ title, defaultOpen = true, children }: PanelSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="panel-section">
      <div className="panel-header" onClick={() => setIsOpen(!isOpen)}>
        <ChevronDown size={12} className={`chevron ${!isOpen ? 'collapsed' : ''}`} />
        <span className="panel-title">{title}</span>
      </div>
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
  const { setTool, selectedTool, showSatellite, setShowSatellite, showCarvedOverlay, setShowCarvedOverlay, showCarvedBorder, setShowCarvedBorder } = useUiStore();
  const camera = useUiStore((s) => s.camera);
  const [applyingGrid, setApplyingGrid] = useState(false);
  const [fetchingSatellite, setFetchingSatellite] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const { unitSystem, setUnitSystem } = useSettingsStore();

  // Get selected elements
  const selectedElements = designElements.filter(el => selectedElementIds.has(el.id));

  // Calculate field area
  const fieldArea = field ? calculateFieldArea(field.geometry) : 0;

  return (
    <div className="panel-tray">
      {/* Entity Info */}
      <PanelSection title="Entity Info">
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
            <div className="prop-row">
              <span className="prop-label">Width</span>
              <span className="prop-value">{fmtShort(selectedElements[0].width)}</span>
            </div>
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
        <PanelSection title="Restore Brush">
          <div className="constraint-row">
            <label>Brush Width</label>
            <input
              type="number"
              className="constraint-input"
              value={parseFloat(fmtFromMeters(getRestoreBrushWidth()).toFixed(1))}
              min={1}
              max={65}
              step={0.5}
              onChange={(e) => {
                setRestoreBrushWidth(fmtToMeters(parseFloat(e.target.value) || 1));
              }}
            />
            <span className="constraint-unit">{fmtUnit()}</span>
          </div>
          <div className="prop-row" style={{ opacity: 0.6, fontSize: '11px' }}>
            <span>[ / ] keys to adjust</span>
          </div>
        </PanelSection>
      )}

      {/* Constraints */}
      <PanelSection title="Constraints">
        <div className="constraint-row">
          <label>Path Width</label>
          <input
            type="number"
            className="constraint-input"
            value={parseFloat(fmtFromMeters(pathWidthMin).toFixed(1))}
            min={1}
            max={65}
            step={0.5}
            onChange={(e) => updateConstraint('pathWidthMin', fmtToMeters(parseFloat(e.target.value) || 1))}
          />
          <span className="constraint-unit">{fmtUnit()}</span>
        </div>
        <div className="constraint-row">
          <label>Wall Width</label>
          <input
            type="number"
            className="constraint-input"
            value={parseFloat(fmtFromMeters(wallWidthMin).toFixed(1))}
            min={0.5}
            max={33}
            step={0.5}
            onChange={(e) => updateConstraint('wallWidthMin', fmtToMeters(parseFloat(e.target.value) || 0.5))}
          />
          <span className="constraint-unit">{fmtUnit()}</span>
        </div>
        <div className="constraint-row">
          <label>Edge Buffer</label>
          <input
            type="number"
            className="constraint-input"
            value={parseFloat(fmtFromMeters(edgeBuffer).toFixed(1))}
            min={0}
            max={65}
            step={0.5}
            onChange={(e) => updateConstraint('edgeBuffer', fmtToMeters(parseFloat(e.target.value) || 0))}
          />
          <span className="constraint-unit">{fmtUnit()}</span>
        </div>
        <div className="constraint-row">
          <label>Corner Radius</label>
          <input
            type="number"
            className="constraint-input"
            value={parseFloat(fmtFromMeters(cornerRadius).toFixed(1))}
            min={0}
            max={33}
            step={0.5}
            onChange={(e) => updateConstraint('cornerRadius', fmtToMeters(parseFloat(e.target.value) || 0))}
          />
          <span className="constraint-unit">{fmtUnit()}</span>
        </div>
        <button className="panel-reset-btn" onClick={resetToDefaults}>
          Reset Defaults
        </button>
      </PanelSection>

      {/* Planter Specs */}
      <PanelSection title="Planter Specs" defaultOpen={true}>
        <div className="constraint-row">
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
        <div className="constraint-row">
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
        <div className="constraint-row">
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
        <div className="constraint-row">
          <label>Headlands</label>
          <input
            type="number"
            className="constraint-input"
            value={planterConfig.headlands}
            onChange={(e) => setPlanterConfig({ headlands: Math.max(0, Number(e.target.value)) })}
            min={0} max={10} step={1}
            style={{ width: '48px' }}
          />
          <span className="constraint-unit">passes</span>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
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
                    planterConfig: result.planter_config,
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
                console.error('[PanelTray] Planter grid failed:', err);
              }
              setApplyingGrid(false);
            }}
          >
            {applyingGrid ? 'Computing...' : 'Apply'}
          </button>
        </div>

        {showPlanterRows && planterRowGrid && (
          <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px', borderTop: '1px solid #c0c0c0', paddingTop: '6px' }}>
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
              <span className="prop-value">{planterRowGrid.planterConfig.spacing_inches}" ({fmtShort(planterRowGrid.planterConfig.spacing_inches * 0.0254)})</span>
            </div>
            <div className="prop-row">
              <span className="prop-label">Planter width</span>
              <span className="prop-value">{fmtShort(planterRowGrid.planterWidth)}</span>
            </div>
          </div>
        )}
      </PanelSection>

      {/* View Overlays */}
      <PanelSection title="View" defaultOpen={true}>
        <div className="constraint-row">
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
                  console.error('[PanelTray] Satellite fetch failed:', err);
                }
                setFetchingSatellite(false);
              }
              setShowSatellite(checked);
            }}
            disabled={!field || fetchingSatellite}
          />
          {fetchingSatellite && <span className="constraint-unit" style={{ fontSize: '10px' }}>Loading...</span>}
        </div>
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
        <div className="constraint-row">
          <label>Carve Fill</label>
          <input
            type="checkbox"
            checked={showCarvedOverlay}
            onChange={(e) => setShowCarvedOverlay(e.target.checked)}
            disabled={!maze?.carvedAreas}
          />
        </div>
        <div className="constraint-row">
          <label>Carve Border</label>
          <input
            type="checkbox"
            checked={showCarvedBorder}
            onChange={(e) => setShowCarvedBorder(e.target.checked)}
            disabled={!maze?.carvedAreas}
          />
        </div>
      </PanelSection>

      {/* Project Info */}
      <PanelSection title="Project">
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
      </PanelSection>

      {/* Settings */}
      <PanelSection title="Settings" defaultOpen={false}>
        <div className="constraint-row">
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
        <button
          className="panel-apply-btn"
          onClick={() => setShowSettingsDialog(true)}
          style={{ marginTop: '4px' }}
        >
          Customize Keybindings
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
