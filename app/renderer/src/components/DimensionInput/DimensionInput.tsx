/**
 * DimensionInput — polished numeric input for dimensions.
 *
 * Improvements over raw <input type="number">:
 *  - Built-in ▲/▼ stepper buttons always visible
 *  - Click-and-drag scrubbing (hold on the label to scrub the value)
 *  - Unit label rendered inside the control
 *  - Highlights on focus, commit-on-Enter / revert-on-Escape
 *  - Clamps to min/max
 */

import { useState, useRef, useCallback, useEffect, type ChangeEvent, type KeyboardEvent } from 'react';
import './DimensionInput.css';

export interface DimensionInputProps {
  /** Current display value (in user units, NOT meters) */
  value: number;
  /** Callback with the new display-unit value */
  onChange: (v: number) => void;
  /** Label shown to the left (e.g. "Width") */
  label?: string;
  /** Unit shown after the number (e.g. "ft") */
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Decimal places shown while not editing */
  decimals?: number;
  disabled?: boolean;
}

export function DimensionInput({
  value,
  onChange,
  label,
  unit,
  min = 0,
  max = 9999,
  step = 0.5,
  decimals = 1,
  disabled = false,
}: DimensionInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrubRef = useRef<{ startX: number; startVal: number } | null>(null);

  const clamp = useCallback(
    (v: number) => Math.min(max, Math.max(min, v)),
    [min, max],
  );

  const commit = useCallback(
    (raw: string) => {
      const n = parseFloat(raw);
      if (!isNaN(n)) onChange(clamp(n));
      setEditing(false);
    },
    [onChange, clamp],
  );

  /* ── Stepper ──────────────────────────────────────────── */
  const bump = useCallback(
    (dir: 1 | -1) => {
      onChange(clamp(parseFloat((value + step * dir).toFixed(10))));
    },
    [value, step, onChange, clamp],
  );

  /* ── Scrub on label drag ──────────────────────────────── */
  const onLabelPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      scrubRef.current = { startX: e.clientX, startVal: value };
    },
    [value, disabled],
  );

  const onLabelPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!scrubRef.current) return;
      const dx = e.clientX - scrubRef.current.startX;
      const delta = Math.round(dx / 4) * step;
      onChange(clamp(parseFloat((scrubRef.current.startVal + delta).toFixed(10))));
    },
    [step, onChange, clamp],
  );

  const onLabelPointerUp = useCallback(() => {
    scrubRef.current = null;
  }, []);

  /* ── Focus / Keyboard ─────────────────────────────────── */
  const startEdit = useCallback(() => {
    setDraft(value.toFixed(decimals));
    setEditing(true);
  }, [value, decimals]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.select();
    }
  }, [editing]);

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commit(draft);
      } else if (e.key === 'Escape') {
        setEditing(false);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        bump(1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        bump(-1);
      }
    },
    [draft, commit, bump],
  );

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setDraft(e.target.value);
  }, []);

  return (
    <div className={`dim-input ${disabled ? 'disabled' : ''}`}>
      {label && (
        <label
          className="dim-label"
          onPointerDown={onLabelPointerDown}
          onPointerMove={onLabelPointerMove}
          onPointerUp={onLabelPointerUp}
        >
          {label}
        </label>
      )}
      <div className="dim-control">
        <button
          className="dim-step dim-step-down"
          tabIndex={-1}
          aria-label="Decrease"
          disabled={disabled || value <= min}
          onClick={() => bump(-1)}
        >
          &minus;
        </button>

        {editing ? (
          <input
            ref={inputRef}
            className="dim-field"
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={handleChange}
            onKeyDown={handleKey}
            onBlur={() => commit(draft)}
            disabled={disabled}
          />
        ) : (
          <button
            className="dim-display"
            onClick={startEdit}
            disabled={disabled}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') startEdit();
              else if (e.key === 'ArrowUp') { e.preventDefault(); bump(1); }
              else if (e.key === 'ArrowDown') { e.preventDefault(); bump(-1); }
            }}
          >
            {value.toFixed(decimals)}
          </button>
        )}

        <button
          className="dim-step dim-step-up"
          tabIndex={-1}
          aria-label="Increase"
          disabled={disabled || value >= max}
          onClick={() => bump(1)}
        >
          +
        </button>
      </div>
      {unit && <span className="dim-unit">{unit}</span>}
    </div>
  );
}
