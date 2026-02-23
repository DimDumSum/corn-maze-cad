/**
 * Tooltip — compact hover label that replaces native title attributes.
 *
 * Usage:
 *   <Tooltip tip="Select tool" shortcut="V">
 *     <button>...</button>
 *   </Tooltip>
 */

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

interface TooltipProps {
  /** Bold heading line */
  tip: string;
  /** Optional keyboard shortcut badge */
  shortcut?: string;
  /** Preferred placement */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Wrapped element */
  children: ReactNode;
}

export function Tooltip({ tip, shortcut, side = 'bottom', children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setVisible(false);
  }, []);

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
    }, 800);
  }, [side]);

  // Dismiss on any click/scroll/keypress anywhere in the document
  useEffect(() => {
    if (!visible) return;
    const dismiss = () => hide();
    window.addEventListener('pointerdown', dismiss, true);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('keydown', dismiss, true);
    return () => {
      window.removeEventListener('pointerdown', dismiss, true);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('keydown', dismiss, true);
    };
  }, [visible, hide]);

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
        onPointerDown={hide}
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
            <span className="tooltip-title">{tip}</span>
            {shortcut && <kbd className="tooltip-kbd">{shortcut}</kbd>}
          </div>,
          document.body,
        )}
    </>
  );
}
