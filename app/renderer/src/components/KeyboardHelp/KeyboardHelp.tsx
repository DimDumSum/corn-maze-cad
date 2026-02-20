/**
 * Keyboard Help Modal - Shows all keyboard shortcuts
 */

import React from 'react';
import { X } from 'lucide-react';
import './KeyboardHelp.css';

interface KeyboardHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Tools',
    shortcuts: [
      { keys: ['V'], description: 'Select Tool' },
      { keys: ['H'], description: 'Pan Tool' },
      { keys: ['P'], description: 'Draw Path Tool' },
      { keys: ['L'], description: 'Line Tool' },
      { keys: ['R'], description: 'Rectangle Tool' },
      { keys: ['E'], description: 'Eraser Tool' },
      { keys: ['M'], description: 'Measure Tool' },
    ],
  },
  {
    title: 'Edit',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (alternate)' },
    ],
  },
  {
    title: 'View',
    shortcuts: [
      { keys: ['G'], description: 'Toggle Grid' },
      { keys: ['S'], description: 'Toggle Snap' },
      { keys: ['Ctrl', '+'], description: 'Zoom In' },
      { keys: ['Ctrl', '-'], description: 'Zoom Out' },
      { keys: ['Ctrl', '0'], description: 'Reset Zoom' },
    ],
  },
  {
    title: 'Help',
    shortcuts: [{ keys: ['?'], description: 'Show Keyboard Shortcuts' }],
  },
];

export function KeyboardHelp({ isOpen, onClose }: KeyboardHelpProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="keyboard-help-backdrop" onClick={handleBackdropClick}>
      <div className="keyboard-help-modal">
        {/* Header */}
        <div className="keyboard-help-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="keyboard-help-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="keyboard-help-content">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="keyboard-help-group">
              <h3>{group.title}</h3>
              <div className="keyboard-help-shortcuts">
                {group.shortcuts.map((shortcut, index) => (
                  <div key={index} className="keyboard-help-shortcut">
                    <div className="keyboard-help-keys">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd className="keyboard-help-key">{key}</kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="keyboard-help-plus">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="keyboard-help-description">{shortcut.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="keyboard-help-footer">
          <p>Press Esc or click outside to close</p>
        </div>
      </div>
    </div>
  );
}
