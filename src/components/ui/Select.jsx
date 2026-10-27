import React from 'react';
import { cn } from './Button';

const Select = React.forwardRef(({ className, label, error, required, id, children, helperText, ...props }, ref) => {
  const selectId = id || props.name;
  const errorId = selectId ? `${selectId}-error` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'glass-input flex h-10 w-full px-3 py-2 text-sm bg-gray-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500/30 text-red-100',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-red-400 font-medium flex items-center gap-1" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="mt-1.5 text-xs text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
});
Select.displayName = 'Select';

export { Select };
