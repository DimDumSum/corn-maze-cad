/**
 * Tooltip — rich info hover bubble that replaces native title attributes.
 *
 * Usage:
 *   <Tooltip tip="Select tool" desc="Click to select and move elements" shortcut="V">
 *     <button>...</button>
 *   </Tooltip>
 */

import { useState, useRef, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

interface TooltipProps {
  /** Bold heading line */
  tip: string;
  /** Optional longer description */
  desc?: string;
  /** Optional keyboard shortcut badge */
  shortcut?: string;
  /** Preferred placement */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Wrapped element */
  children: ReactNode;
}

export function Tooltip({ tip, desc, shortcut, side = 'bottom', children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (!wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      let x: number;
      let y: number;

      switch (side) {
        case 'top':
          x = rect.left + rect.width / 2;
          y = rect.top - 6;
          break;
        case 'left':
          x = rect.left - 6;
          y = rect.top + rect.height / 2;
          break;
        case 'right':
          x = rect.right + 6;
          y = rect.top + rect.height / 2;
          break;
        case 'bottom':
        default:
          x = rect.left + rect.width / 2;
          y = rect.bottom + 6;
          break;
      }
      setPos({ x, y });
      setVisible(true);
    }, 400);
  }, [side]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setVisible(false);
  }, []);

  const transformOrigin = {
    top: 'center bottom',
    bottom: 'center top',
    left: 'right center',
    right: 'left center',
  }[side];

  const translate = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  }[side];

  return (
    <>
      <span
        ref={wrapRef}
        className="tooltip-trigger"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>

      {visible &&
        createPortal(
          <div
            className={`tooltip-bubble tooltip-${side}`}
            style={{
              left: pos.x,
              top: pos.y,
              transform: translate,
              transformOrigin,
            }}
            role="tooltip"
          >
            <div className="tooltip-header">
              <span className="tooltip-title">{tip}</span>
              {shortcut && <kbd className="tooltip-kbd">{shortcut}</kbd>}
            </div>
            {desc && <p className="tooltip-desc">{desc}</p>}
          </div>,
          document.body,
        )}
    </>
  );
}
