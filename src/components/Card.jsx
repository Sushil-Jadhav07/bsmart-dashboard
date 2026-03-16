import React from 'react';
import { clsx } from 'clsx';

const Card = ({ 
  children, 
  className = '', 
  padding = 'normal',
  shadow = 'soft',
  hover = false 
}) => {
  const paddingStyles = {
    none: '',
    small: 'p-3',
    normal: 'p-5',
    large: 'p-6'
  };

  return (
    <div 
      className={clsx(
        'bg-white rounded-xl border border-neutral-200',
        paddingStyles[padding],
        shadow === 'soft' && 'shadow-soft',
        shadow === 'card' && 'shadow-card',
        shadow === 'none' && '',
        hover && 'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={clsx('mb-4', className)}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={clsx('text-lg font-semibold text-neutral-800', className)}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '' }) => (
  <p className={clsx('text-sm text-neutral-500 mt-1', className)}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={clsx('mt-4 pt-4 border-t border-neutral-100', className)}>
    {children}
  </div>
);

export default Card;
