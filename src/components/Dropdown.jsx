import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

const MENU_MIN_WIDTH = 140;
const ITEM_HEIGHT = 36;
const MENU_MAX_HEIGHT = 288;

const Dropdown = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  size = 'sm',
  className = '',
  fullWidth = false,
  label,
}) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const ref = useRef(null);

  const selected = options.find((o) => o.value === value);
  const isSm = size === 'sm';

  useLayoutEffect(() => {
    if (!open || !ref.current) return undefined;

    let rafId = 0;
    let stopped = false;

    const place = () => {
      if (stopped) return;
      const button = ref.current?.querySelector('button');
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const menuWidth = fullWidth ? rect.width : Math.max(rect.width, MENU_MIN_WIDTH);
      const menuHeight = Math.min(options.length * ITEM_HEIGHT + 8, MENU_MAX_HEIGHT);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - menuWidth - 8);
      const openUpward = rect.bottom + menuHeight + 8 > window.innerHeight;
      const idealTop = openUpward ? rect.top - menuHeight - 8 : rect.bottom + 8;
      const top = Math.min(Math.max(8, idealTop), Math.max(8, window.innerHeight - menuHeight - 8));

      setCoords((current) => (
        current && current.left === left && current.top === top && current.menuWidth === menuWidth
          ? current
          : { left, top, menuWidth }
      ));

      rafId = window.requestAnimationFrame(place);
    };

    rafId = window.requestAnimationFrame(place);
    return () => {
      stopped = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [open, options.length, fullWidth]);

  return (
    <div ref={ref} className={clsx('relative', fullWidth && 'w-full', className)}>
      {label && (
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={clsx(
          'flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 outline-none transition',
          'hover:border-neutral-300 focus:border-primary focus:ring-2 focus:ring-primary/10',
          isSm ? 'h-9 px-3 text-xs font-medium min-w-[120px]' : 'h-11 px-3 text-sm font-medium rounded-xl',
          fullWidth && 'w-full',
        )}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown
          className={clsx(
            'shrink-0 text-neutral-400 transition-transform',
            isSm ? 'h-3 w-3' : 'h-4 w-4',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && coords
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close dropdown"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setOpen(false)}
              />
              <div
                className="fixed z-20 max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
                style={{ left: coords.left, top: coords.top, width: coords.menuWidth }}
              >
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={clsx(
                      'flex w-full items-center px-3 py-2 text-left text-sm transition',
                      value === option.value
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'text-neutral-700 hover:bg-neutral-50',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
};

export default Dropdown;
