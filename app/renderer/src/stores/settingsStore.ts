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

// --- Mouse button action types ---
export type MouseButtonAction = 'primary' | 'pan' | 'contextMenu' | 'none';

export const MOUSE_BUTTON_LABELS: Record<number, string> = {
  0: 'Left Click',
  1: 'Middle Click',
  2: 'Right Click',
  3: 'Back Button',
  4: 'Forward Button',
};

export const MOUSE_ACTION_LABELS: Record<MouseButtonAction, string> = {
  primary: 'Tool Action (default)',
  pan: 'Pan Canvas',
  contextMenu: 'Context Menu',
  none: 'Disabled',
};

export const DEFAULT_MOUSE_BUTTONS: Record<number, MouseButtonAction> = {
  0: 'primary',     // Left click = tool action
  1: 'pan',         // Middle click = pan
  2: 'contextMenu', // Right click = context menu
  3: 'none',        // Back button = none
  4: 'none',        // Forward button = none
};

// --- localStorage persistence ---
const STORAGE_KEY = 'corn-maze-cad-settings';

function loadFromStorage(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge mouse button overrides with defaults
      const mouseButtons = { ...DEFAULT_MOUSE_BUTTONS };
      if (parsed.mouseButtons) {
        for (const [btn, action] of Object.entries(parsed.mouseButtons)) {
          mouseButtons[Number(btn)] = action as MouseButtonAction;
        }
      }
      const lastTextSettings: LastTextSettings = {
        ...DEFAULT_LAST_TEXT_SETTINGS,
        ...(parsed.lastTextSettings || {}),
      };
      return {
        unitSystem: parsed.unitSystem || 'imperial',
        keybindings: { ...DEFAULT_KEYBINDINGS, ...(parsed.keybindings || {}) },
        mouseButtons,
        lastTextSettings,
      };
    }
  } catch {
    // ignore parse errors
  }
  return {};
}

function saveToStorage(state: {
  unitSystem: UnitSystem;
  keybindings: Record<KeyAction, string>;
  mouseButtons: Record<number, MouseButtonAction>;
  lastTextSettings: LastTextSettings;
}) {
  try {
    // Only persist overrides (different from defaults)
    const overrides: Partial<Record<KeyAction, string>> = {};
    for (const [action, key] of Object.entries(state.keybindings)) {
      if (key !== DEFAULT_KEYBINDINGS[action as KeyAction]) {
        overrides[action as KeyAction] = key;
      }
    }
    const mouseOverrides: Record<string, string> = {};
    for (const [btn, action] of Object.entries(state.mouseButtons)) {
      if (action !== DEFAULT_MOUSE_BUTTONS[Number(btn)]) {
        mouseOverrides[btn] = action;
      }
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        unitSystem: state.unitSystem,
        keybindings: overrides,
        mouseButtons: Object.keys(mouseOverrides).length > 0 ? mouseOverrides : undefined,
        lastTextSettings: state.lastTextSettings,
      })
    );
  } catch {
    // ignore storage errors
  }
}

// --- Last text tool settings ---

export interface LastTextSettings {
  fontId: string;
  fontSize: number;    // stored in meters
  fillMode: 'fill' | 'stroke';
  strokeWidth: number; // stored in meters
}

const DEFAULT_LAST_TEXT_SETTINGS: LastTextSettings = {
  fontId: 'dejavu-sans-bold',
  fontSize: 1.0,
  fillMode: 'stroke',
  strokeWidth: 0.2,
};

// --- Store ---

interface SettingsState {
  unitSystem: UnitSystem;
  keybindings: Record<KeyAction, string>;
  mouseButtons: Record<number, MouseButtonAction>;
  lastTextSettings: LastTextSettings;

  setUnitSystem: (system: UnitSystem) => void;
  setKeybinding: (action: KeyAction, key: string) => void;
  resetKeybindings: () => void;
  getActionForKey: (key: string, modifiers: { ctrl: boolean; shift: boolean }) => KeyAction | null;
  setMouseButton: (button: number, action: MouseButtonAction) => void;
  resetMouseButtons: () => void;
  getMouseAction: (button: number) => MouseButtonAction;
  setLastTextSettings: (settings: Partial<LastTextSettings>) => void;
}

const stored = loadFromStorage();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  unitSystem: stored.unitSystem || 'imperial',
  keybindings: stored.keybindings || { ...DEFAULT_KEYBINDINGS },
  mouseButtons: stored.mouseButtons || { ...DEFAULT_MOUSE_BUTTONS },
  lastTextSettings: stored.lastTextSettings || { ...DEFAULT_LAST_TEXT_SETTINGS },

  setUnitSystem: (system) => {
    set({ unitSystem: system });
    saveToStorage({ unitSystem: system, keybindings: get().keybindings, mouseButtons: get().mouseButtons, lastTextSettings: get().lastTextSettings });
  },

  setKeybinding: (action, key) => {
    const updated = { ...get().keybindings, [action]: key };
    set({ keybindings: updated });
    saveToStorage({ unitSystem: get().unitSystem, keybindings: updated, mouseButtons: get().mouseButtons, lastTextSettings: get().lastTextSettings });
  },

  resetKeybindings: () => {
    const defaults = { ...DEFAULT_KEYBINDINGS };
    set({ keybindings: defaults });
    saveToStorage({ unitSystem: get().unitSystem, keybindings: defaults, mouseButtons: get().mouseButtons, lastTextSettings: get().lastTextSettings });
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

  setMouseButton: (button, action) => {
    const updated = { ...get().mouseButtons, [button]: action };
    set({ mouseButtons: updated });
    saveToStorage({ unitSystem: get().unitSystem, keybindings: get().keybindings, mouseButtons: updated, lastTextSettings: get().lastTextSettings });
  },

  resetMouseButtons: () => {
    const defaults = { ...DEFAULT_MOUSE_BUTTONS };
    set({ mouseButtons: defaults });
    saveToStorage({ unitSystem: get().unitSystem, keybindings: get().keybindings, mouseButtons: defaults, lastTextSettings: get().lastTextSettings });
  },

  getMouseAction: (button) => {
    return get().mouseButtons[button] ?? 'none';
  },

  setLastTextSettings: (settings) => {
    const updated = { ...get().lastTextSettings, ...settings };
    set({ lastTextSettings: updated });
    saveToStorage({ unitSystem: get().unitSystem, keybindings: get().keybindings, mouseButtons: get().mouseButtons, lastTextSettings: updated });
  },
}));
