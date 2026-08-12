import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Button = React.forwardRef(({ className, variant = 'primary', size = 'default', children, ...props }, ref) => {
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-primary-500/50',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm',
    outline: 'border border-primary-500/50 text-primary-400 hover:bg-primary-500/10',
    ghost: 'text-gray-300 hover:text-white hover:bg-white/10',
  };

  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 px-3 text-sm',
    lg: 'h-12 px-8 text-lg',
    icon: 'h-10 w-10',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
});
Button.displayName = 'Button';

export { Button };
