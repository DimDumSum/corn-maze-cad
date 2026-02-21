/**
 * Settings Store - User preferences for keybindings and units.
 *
 * Persists to localStorage so preferences survive across sessions.
 */

import { create } from 'zustand';
import type { UnitSystem } from '../utils/units';
import type { ToolName } from '../../../shared/constants';

// --- Keybinding action names ---
export type KeyAction =
  // Tool selection
  | 'tool.select'
  | 'tool.pan'
  | 'tool.draw'
  | 'tool.line'
  | 'tool.rectangle'
  | 'tool.eraser'
  | 'tool.restore'
  | 'tool.move'
  | 'tool.measure'
  | 'tool.circle'
  | 'tool.arc'
  | 'tool.text'
  | 'tool.clipart'
  | 'tool.flip'
  // Toggles
  | 'toggle.snap'
  | 'toggle.grid'
  | 'show.help'
  // Restore brush
  | 'restore.brushUp'
  | 'restore.brushDown';

/** Map from action → shortcut key (lowercase, single char for tool keys). */
export const DEFAULT_KEYBINDINGS: Record<KeyAction, string> = {
  'tool.select': 'v',
  'tool.pan': 'h',
  'tool.draw': 'p',
  'tool.line': 'l',
  'tool.rectangle': 'r',
  'tool.eraser': 'e',
  'tool.restore': 'u',
  'tool.move': 'g',
  'tool.measure': 'm',
  'tool.circle': 'c',
  'tool.arc': 'a',
  'tool.text': 't',
  'tool.clipart': 'i',
  'tool.flip': 'f',
  'toggle.snap': 's',
  'toggle.grid': 'ctrl+g',
  'show.help': '?',
  'restore.brushUp': ']',
  'restore.brushDown': '[',
};

/** Mapping from tool actions to ToolName values. */
export const TOOL_ACTION_MAP: Partial<Record<KeyAction, ToolName>> = {
  'tool.select': 'select',
  'tool.pan': 'pan',
  'tool.draw': 'draw',
  'tool.line': 'line',
  'tool.rectangle': 'rectangle',
  'tool.eraser': 'eraser',
  'tool.restore': 'restore',
  'tool.move': 'move',
  'tool.measure': 'measure',
  'tool.circle': 'circle',
  'tool.arc': 'arc',
  'tool.text': 'text',
  'tool.clipart': 'clipart',
  'tool.flip': 'flip',
};

// Human-readable labels for the settings UI
export const KEY_ACTION_LABELS: Record<KeyAction, string> = {
  'tool.select': 'Select Tool',
  'tool.pan': 'Pan Tool',
  'tool.draw': 'Draw Path',
  'tool.line': 'Line Tool',
  'tool.rectangle': 'Rectangle',
  'tool.eraser': 'Eraser',
  'tool.restore': 'Restore Rows',
  'tool.move': 'Move / Grab',
  'tool.measure': 'Measure',
  'tool.circle': 'Circle',
  'tool.arc': 'Arc',
  'tool.text': 'Text',
  'tool.clipart': 'Clipart',
  'tool.flip': 'Flip',
  'toggle.snap': 'Toggle Snap',
  'toggle.grid': 'Toggle Grid',
  'show.help': 'Show Help',
  'restore.brushUp': 'Brush Size +',
  'restore.brushDown': 'Brush Size -',
};

// --- localStorage persistence ---
const STORAGE_KEY = 'corn-maze-cad-settings';

function loadFromStorage(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        unitSystem: parsed.unitSystem || 'metric',
        keybindings: { ...DEFAULT_KEYBINDINGS, ...(parsed.keybindings || {}) },
      };
    }
  } catch {
    // ignore parse errors
  }
  return {};
}

function saveToStorage(state: { unitSystem: UnitSystem; keybindings: Record<KeyAction, string> }) {
  try {
    // Only persist overrides (different from defaults)
    const overrides: Partial<Record<KeyAction, string>> = {};
    for (const [action, key] of Object.entries(state.keybindings)) {
      if (key !== DEFAULT_KEYBINDINGS[action as KeyAction]) {
        overrides[action as KeyAction] = key;
      }
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ unitSystem: state.unitSystem, keybindings: overrides })
    );
  } catch {
    // ignore storage errors
  }
}

// --- Store ---

interface SettingsState {
  unitSystem: UnitSystem;
  keybindings: Record<KeyAction, string>;

  setUnitSystem: (system: UnitSystem) => void;
  setKeybinding: (action: KeyAction, key: string) => void;
  resetKeybindings: () => void;
  getActionForKey: (key: string, modifiers: { ctrl: boolean; shift: boolean }) => KeyAction | null;
}

const stored = loadFromStorage();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  unitSystem: stored.unitSystem || 'metric',
  keybindings: stored.keybindings || { ...DEFAULT_KEYBINDINGS },

  setUnitSystem: (system) => {
    set({ unitSystem: system });
    saveToStorage({ unitSystem: system, keybindings: get().keybindings });
  },

  setKeybinding: (action, key) => {
    const updated = { ...get().keybindings, [action]: key };
    set({ keybindings: updated });
    saveToStorage({ unitSystem: get().unitSystem, keybindings: updated });
  },

  resetKeybindings: () => {
    const defaults = { ...DEFAULT_KEYBINDINGS };
    set({ keybindings: defaults });
    saveToStorage({ unitSystem: get().unitSystem, keybindings: defaults });
  },

  getActionForKey: (key, modifiers) => {
    const bindings = get().keybindings;
    const normalizedKey = key.toLowerCase();

    for (const [action, binding] of Object.entries(bindings)) {
      const parts = binding.toLowerCase().split('+');
      const bindKey = parts[parts.length - 1];
      const needsCtrl = parts.includes('ctrl') || parts.includes('cmd');

      if (needsCtrl && !modifiers.ctrl) continue;
      if (!needsCtrl && modifiers.ctrl) continue;
      if (bindKey === normalizedKey) {
        return action as KeyAction;
      }
    }
    return null;
  },
}));
