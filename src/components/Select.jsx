import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

const Select = forwardRef(({ 
  label,
  error,
  helperText,
  options = [],
  className = '',
  labelClassName = '',
  selectClassName = '',
  fullWidth = false,
  placeholder = 'Select an option',
  ...props 
}, ref) => {
  return (
    <div className={clsx(fullWidth && 'w-full', className)}>
      {label && (
        <label 
          className={clsx(
            'block text-sm font-medium text-neutral-700 mb-1.5',
            labelClassName
          )}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={clsx(
            'block w-full appearance-none rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900',
            'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
            'transition-colors duration-200',
            error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500',
            selectClassName
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>{placeholder}</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown className="h-4 w-4 text-neutral-400" />
        </div>
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-neutral-500">{helperText}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
