import React from 'react';
import { cn } from './Button';

const Select = React.forwardRef(({ className, label, children, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <select
        className={cn(
          'glass-input flex h-10 w-full px-3 py-2 text-sm bg-gray-900',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    </div>
  );
});
Select.displayName = 'Select';

export { Select };
