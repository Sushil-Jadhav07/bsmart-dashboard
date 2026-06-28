import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

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
  const ref = useRef(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isSm = size === 'sm';

  return (
    <div ref={ref} className={clsx('relative', fullWidth && 'w-full', className)}>
      {label && (
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-full min-w-[140px] overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
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
        </>
      )}
    </div>
  );
};

export default Dropdown;
