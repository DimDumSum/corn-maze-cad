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
  const { designElements, selectedElementIds, maze, field, planterConfig, setPlanterConfig, setPlanterRowGrid, showPlanterRows, setShowPlanterRows } = useDesignStore();
  const { pathWidthMin, wallWidthMin, edgeBuffer, cornerRadius, updateConstraint, resetToDefaults } = useConstraintStore();
  const { isDirty } = useProjectStore();
  const { setTool } = useUiStore();
  const camera = useUiStore((s) => s.camera);
  const [applyingGrid, setApplyingGrid] = useState(false);

  // Get selected elements
  const selectedElements = designElements.filter(el => selectedElementIds.has(el.id));

  // Calculate field area
  const fieldArea = field ? calculateFieldArea(field.geometry) : 0;
  const fieldAreaHectares = fieldArea / 10000;

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
              <span className="prop-value">{selectedElements[0].width.toFixed(1)}m</span>
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

      {/* Constraints */}
      <PanelSection title="Constraints">
        <div className="constraint-row">
          <label>Path Width</label>
          <input
            type="number"
            className="constraint-input"
            value={pathWidthMin}
            min={1}
            max={20}
            step={0.5}
            onChange={(e) => updateConstraint('pathWidthMin', parseFloat(e.target.value) || 1)}
          />
          <span className="constraint-unit">m</span>
        </div>
        <div className="constraint-row">
          <label>Wall Width</label>
          <input
            type="number"
            className="constraint-input"
            value={wallWidthMin}
            min={0.5}
            max={10}
            step={0.5}
            onChange={(e) => updateConstraint('wallWidthMin', parseFloat(e.target.value) || 0.5)}
          />
          <span className="constraint-unit">m</span>
        </div>
        <div className="constraint-row">
          <label>Edge Buffer</label>
          <input
            type="number"
            className="constraint-input"
            value={edgeBuffer}
            min={0}
            max={20}
            step={0.5}
            onChange={(e) => updateConstraint('edgeBuffer', parseFloat(e.target.value) || 0)}
          />
          <span className="constraint-unit">m</span>
        </div>
        <div className="constraint-row">
          <label>Corner Radius</label>
          <input
            type="number"
            className="constraint-input"
            value={cornerRadius}
            min={0}
            max={10}
            step={0.5}
            onChange={(e) => updateConstraint('cornerRadius', parseFloat(e.target.value) || 0)}
          />
          <span className="constraint-unit">m</span>
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
                const result = await api.computePlanterGrid(
                  planterConfig.rows,
                  planterConfig.spacingInches,
                  planterConfig.directionDeg,
                  planterConfig.headlands,
                );
                if (!result.error) {
                  setPlanterRowGrid({
                    planterConfig: result.planter_config,
                    rowLines: result.row_lines,
                    headlandBoundary: result.headland_boundary,
                    planterWidth: result.planter_width,
                    headlandInset: result.headland_inset,
                    totalRows: result.total_rows,
                  });
                  setShowPlanterRows(true);
                }
              } catch (err) {
                console.error('[PanelTray] Planter grid failed:', err);
              }
              setApplyingGrid(false);
            }}
          >
            {applyingGrid ? 'Computing...' : 'Apply'}
          </button>
          {showPlanterRows && (
            <button
              className="panel-reset-btn"
              onClick={() => {
                setShowPlanterRows(false);
                setPlanterRowGrid(null);
              }}
            >
              Hide
            </button>
          )}
        </div>

        {showPlanterRows && (
          <div className="prop-row" style={{ marginTop: '4px', fontSize: '10px', color: '#888' }}>
            <span>{planterConfig.rows}R &times; {planterConfig.spacingInches}" = {((planterConfig.rows * planterConfig.spacingInches * 0.0254) * 3.28084).toFixed(1)}ft planter</span>
          </div>
        )}
      </PanelSection>

      {/* Project Info */}
      <PanelSection title="Project">
        <div className="prop-row">
          <span className="prop-label">Status</span>
          <span className="prop-value">{isDirty ? 'Modified' : 'Saved'}</span>
        </div>
        <div className="prop-row">
          <span className="prop-label">Field</span>
          <span className="prop-value">{field ? `${fieldAreaHectares.toFixed(2)} ha` : 'None'}</span>
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
