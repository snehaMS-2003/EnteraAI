import React from 'react';
import { cn } from './Button';

const Input = React.forwardRef(({ className, type, label, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <input
        type={type}
        className={cn(
          'glass-input flex h-10 w-full px-3 py-2 text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    </div>
  );
});
Input.displayName = 'Input';

export { Input };
