import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { clsx } from 'clsx';

const MENU_WIDTH = 176;
const MENU_MARGIN = 6;
const ITEM_HEIGHT = 36;

/**
 * Row "..." actions menu. Renders via a portal with fixed positioning computed
 * from the trigger button's screen position, so it always floats above the
 * page correctly instead of being clipped by a scrollable/overflow-hidden
 * table ancestor.
 */
const RowActionMenu = ({ actions = [], width = MENU_WIDTH, triggerClassName = '', ariaLabel = 'Row actions', triggerIcon: TriggerIcon = MoreHorizontal }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const buttonRef = useRef(null);

  const visibleActions = actions.filter(Boolean);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return undefined;

    let rafId = 0;
    let stopped = false;

    const place = () => {
      if (stopped) return;
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const menuHeight = visibleActions.length * ITEM_HEIGHT + 8;
      const openUpward = rect.bottom + menuHeight + MENU_MARGIN > window.innerHeight;
      const left = Math.min(rect.right - width, window.innerWidth - width - MENU_MARGIN);
      const idealTop = openUpward ? rect.top - menuHeight - MENU_MARGIN : rect.bottom + MENU_MARGIN;
      const top = Math.min(Math.max(MENU_MARGIN, idealTop), Math.max(MENU_MARGIN, window.innerHeight - menuHeight - MENU_MARGIN));

      setCoords((current) => (
        current && current.left === left && current.top === top
          ? current
          : { left, top }
      ));

      rafId = window.requestAnimationFrame(place);
    };

    rafId = window.requestAnimationFrame(place);
    return () => {
      stopped = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [open, visibleActions.length, width]);

  if (!visibleActions.length) return null;

  return (
    <div className="flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((value) => !value); }}
        className={clsx('p-1.5 rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600', triggerClassName)}
        aria-label={ariaLabel}
      >
        <TriggerIcon className="h-4 w-4" />
      </button>
      {open && coords && createPortal(
        <>
          <button className="fixed inset-0 z-40 cursor-default" type="button" aria-label="Close actions" onClick={() => setOpen(false)} />
          <div
            style={{ position: 'fixed', top: coords.top, left: coords.left, width }}
            className="z-50 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
          >
            {visibleActions.map((action, index) => {
              if (action.divider) return <div key={`divider-${index}`} className="my-1 h-px bg-neutral-100 mx-2" />;
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    action.onClick?.();
                  }}
                  className={clsx(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition',
                    action.tone === 'rose' ? 'text-red-600 hover:bg-red-50' : 'text-neutral-700 hover:bg-neutral-50'
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {action.label}
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
};

export default RowActionMenu;
