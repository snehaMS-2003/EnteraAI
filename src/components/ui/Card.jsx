import React from 'react';
import { cn } from './Button';

const Card = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('glass-card p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
});
Card.displayName = 'Card';

export { Card };
