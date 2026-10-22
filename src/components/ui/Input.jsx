import React from 'react';
import { cn } from './Button';

const Input = React.forwardRef(({ className, type, label, error, required, id, helperText, ...props }, ref) => {
  const inputId = id || props.name;
  const errorId = inputId ? `${inputId}-error` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
          {required && <span className="text-red-400 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'glass-input flex h-10 w-full px-3 py-2 text-sm transition-colors duration-200',
          error && 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500/30 text-red-100 placeholder-red-300/40',
          className
        )}
        ref={ref}
        {...props}
      />
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
Input.displayName = 'Input';

export { Input };
