/**
 * SettingsDialog - Modal for customizing keybindings and preferences.
 *
 * Shows a table of all configurable actions with their current key bindings.
 * Click a binding to capture a new key.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  useSettingsStore,
  DEFAULT_KEYBINDINGS,
  KEY_ACTION_LABELS,
  MOUSE_BUTTON_LABELS,
  MOUSE_ACTION_LABELS,
  type KeyAction,
  type MouseButtonAction,
} from '../../stores/settingsStore';
import type { UnitSystem } from '../../utils/units';
import './SettingsDialog.css';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const {
    unitSystem, setUnitSystem,
    keybindings, setKeybinding, resetKeybindings,
    mouseButtons, setMouseButton, resetMouseButtons,
  } = useSettingsStore();

  // Which action is currently being captured (null = none)
  const [capturing, setCapturing] = useState<KeyAction | null>(null);

  // Close dialog on Escape (only when not capturing)
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (capturing) {
        // Cancel capture on Escape
        e.preventDefault();
        e.stopPropagation();
        setCapturing(null);
        return;
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc, true);
    return () => window.removeEventListener('keydown', handleEsc, true);
  }, [isOpen, capturing, onClose]);

  // Key capture handler
  const handleCapture = useCallback(
    (e: KeyboardEvent) => {
      if (!capturing) return;

      // Ignore modifier-only presses
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

      e.preventDefault();
      e.stopPropagation();

      // Build the key string
      let keyStr = '';
      if (e.ctrlKey || e.metaKey) keyStr += 'ctrl+';
      keyStr += e.key.length === 1 ? e.key.toLowerCase() : e.key;

      setKeybinding(capturing, keyStr);
      setCapturing(null);
    },
    [capturing, setKeybinding]
  );

  useEffect(() => {
    if (!capturing) return;
    window.addEventListener('keydown', handleCapture, true);
    return () => window.removeEventListener('keydown', handleCapture, true);
  }, [capturing, handleCapture]);

  if (!isOpen) return null;

  const actions = Object.keys(KEY_ACTION_LABELS) as KeyAction[];

  // Group actions for display
  const toolActions = actions.filter((a) => a.startsWith('tool.'));
  const toggleActions = actions.filter((a) => a.startsWith('toggle.') || a === 'show.help');
  const restoreActions = actions.filter((a) => a.startsWith('restore.'));

  const renderRow = (action: KeyAction) => {
    const isCapturing = capturing === action;
    const isModified = keybindings[action] !== DEFAULT_KEYBINDINGS[action];

    return (
      <div key={action} className={`kb-row ${isCapturing ? 'capturing' : ''}`}>
        <span className="kb-label">{KEY_ACTION_LABELS[action]}</span>
        <button
          className={`kb-key ${isCapturing ? 'active' : ''} ${isModified ? 'modified' : ''}`}
          onClick={() => setCapturing(isCapturing ? null : action)}
          title={isCapturing ? 'Press a key...' : 'Click to rebind'}
        >
          {isCapturing ? '...' : formatKeyDisplay(keybindings[action])}
        </button>
      </div>
    );
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="settings-body">
          {/* Unit System */}
          <div className="settings-section">
            <h3>Units</h3>
            <div className="settings-unit-row">
              <label>Measurement System</label>
              <select
                value={unitSystem}
                onChange={(e) => setUnitSystem(e.target.value as UnitSystem)}
              >
                <option value="metric">Metric (m, ha)</option>
                <option value="imperial">Imperial (ft, ac)</option>
              </select>
            </div>
          </div>

          {/* Keybindings */}
          <div className="settings-section">
            <div className="settings-section-header">
              <h3>Keybindings</h3>
              <button className="kb-reset-btn" onClick={resetKeybindings}>
                Reset All
              </button>
            </div>

            <div className="kb-group">
              <div className="kb-group-title">Tools</div>
              {toolActions.map(renderRow)}
            </div>

            <div className="kb-group">
              <div className="kb-group-title">Toggles</div>
              {toggleActions.map(renderRow)}
            </div>

            <div className="kb-group">
              <div className="kb-group-title">Restore Brush</div>
              {restoreActions.map(renderRow)}
            </div>
          </div>

          {/* Mouse Buttons */}
          <div className="settings-section">
            <div className="settings-section-header">
              <h3>Mouse Buttons</h3>
              <button className="kb-reset-btn" onClick={resetMouseButtons}>
                Reset All
              </button>
            </div>

            <div className="kb-group">
              {Object.keys(MOUSE_BUTTON_LABELS).map((btnStr) => {
                const btn = Number(btnStr);
                const currentAction = mouseButtons[btn] || 'none';
                return (
                  <div key={btn} className="kb-row">
                    <span className="kb-label">{MOUSE_BUTTON_LABELS[btn]}</span>
                    <select
                      className="kb-key"
                      value={currentAction}
                      onChange={(e) => setMouseButton(btn, e.target.value as MouseButtonAction)}
                    >
                      {Object.entries(MOUSE_ACTION_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Pretty-print a key binding for display */
function formatKeyDisplay(key: string): string {
  return key
    .split('+')
    .map((part) => {
      if (part === 'ctrl') return 'Ctrl';
      if (part === 'cmd') return 'Cmd';
      if (part.length === 1) return part.toUpperCase();
      return part;
    })
    .join(' + ');
}
