import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EllipsisVertical } from 'lucide-react';
import Button from './Button.jsx';

const MENU_WIDTH = 208;
const ITEM_HEIGHT = 40;

export default function ActionMenu({ items = [] }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!open || !ref.current) return undefined;

    let rafId = 0;
    let stopped = false;

    const place = () => {
      if (stopped) return;
      const button = ref.current?.querySelector('button');
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const menuHeight = Math.min(items.length * ITEM_HEIGHT + 8, window.innerHeight - 16);
      const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
      const openUpward = rect.bottom + menuHeight + 8 > window.innerHeight;
      const idealTop = openUpward ? rect.top - menuHeight - 8 : rect.bottom + 8;
      const top = Math.min(Math.max(8, idealTop), Math.max(8, window.innerHeight - menuHeight - 8));

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
  }, [open, items.length]);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((value) => !value);
        }}
        icon={EllipsisVertical}
      />

      {open && coords
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close actions"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setOpen(false)}
              />
              <div
                className="fixed z-50 overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
                style={{ top: coords.top, left: coords.left, width: MENU_WIDTH, maxHeight: 'calc(100vh - 16px)' }}
              >
                {items.map((it, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      it.onClick && it.onClick();
                    }}
                    className="w-full whitespace-nowrap px-3 py-2.5 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
}
