/**
 * ValidationDialog - Shows constraint violations and provides fix options
 * Workflow: Auto-Fix returns to preview, Manual Edit keeps violations visible
 */

import { AlertTriangle, Wrench, Edit3, Play, X } from 'lucide-react';
import type { Violation } from '../../stores/designStore';
import './ValidationDialog.css';

interface ValidationDialogProps {
  violations: Violation[];
  summary: {
    wallWidth: number;
    edgeBuffer: number;
    total: number;
  };
  onAutoFix: () => void;
  onManualEdit: () => void;
  onCarveAnyway: () => void;
  onCancel: () => void;
  isFixing?: boolean;
}

export function ValidationDialog({
  violations,
  summary,
  onAutoFix,
  onManualEdit,
  onCarveAnyway,
  onCancel,
  isFixing = false,
}: ValidationDialogProps) {
  return (
    <div className="validation-dialog-overlay">
      <div className="validation-dialog">
        {/* Header */}
        <div className="validation-header">
          <AlertTriangle className="warning-icon" size={24} />
          <h2>{summary.total} Constraint Violation{summary.total !== 1 ? 's' : ''} Found</h2>
          <button className="close-btn" onClick={onCancel} title="Cancel">
            <X size={20} />
          </button>
        </div>

        {/* Summary */}
        <div className="validation-summary">
          {summary.wallWidth > 0 && (
            <div className="summary-item wall-width">
              <span className="count">{summary.wallWidth}</span>
              <span className="label">Wall too thin</span>
            </div>
          )}
          {summary.edgeBuffer > 0 && (
            <div className="summary-item edge-buffer">
              <span className="count">{summary.edgeBuffer}</span>
              <span className="label">Too close to edge</span>
            </div>
          )}
        </div>

        {/* Violation List */}
        <div className="violation-list">
          {violations.slice(0, 5).map((v) => (
            <div key={v.id} className={`violation-item ${v.type}`}>
              <div className="violation-icon">
                {v.type === 'wall_width' ? '⬌' : '↔'}
              </div>
              <div className="violation-details">
                <div className="violation-message">{v.message}</div>
                <div className="violation-values">
                  <span className="actual">{v.actualValue}m</span>
                  <span className="separator">/</span>
                  <span className="required">{v.requiredValue}m min</span>
                </div>
              </div>
            </div>
          ))}
          {violations.length > 5 && (
            <div className="more-violations">
              +{violations.length - 5} more violations
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="validation-actions">
          <button
            className="action-btn auto-fix"
            onClick={onAutoFix}
            disabled={isFixing}
            title="Automatically adjust elements to fix violations"
          >
            <Wrench size={18} />
            <span>{isFixing ? 'Fixing...' : 'Auto-Fix'}</span>
          </button>

          <button
            className="action-btn manual-edit"
            onClick={onManualEdit}
            title="Close dialog and manually adjust elements"
          >
            <Edit3 size={18} />
            <span>Edit Manually</span>
          </button>

          <button
            className="action-btn carve-anyway"
            onClick={onCarveAnyway}
            title="Ignore violations and carve as-is"
          >
            <Play size={18} />
            <span>Carve Anyway</span>
          </button>

          <button className="action-btn cancel" onClick={onCancel}>
            <X size={18} />
            <span>Cancel</span>
          </button>
        </div>

        {/* Help text */}
        <div className="validation-help">
          <p><strong>Auto-Fix</strong> moves elements to meet constraints (preview only, not carved)</p>
          <p><strong>Edit Manually</strong> shows violations on canvas while you adjust</p>
        </div>
      </div>
    </div>
  );
}
