import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from './Button';

export function WizardProgress({ steps, currentStep }) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        {/* Background track line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/10 rounded-full" />
        
        {/* Active track line */}
        <motion.div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary-500 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.3 }}
        />

        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-300 border-2",
                  isCompleted ? "bg-primary-500 border-primary-500 text-white" : 
                  isCurrent ? "bg-[#0f0f18] border-primary-400 text-primary-400" : 
                  "bg-[#0f0f18] border-white/20 text-gray-500"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span 
                className={cn(
                  "absolute top-10 text-[10px] sm:text-xs font-medium whitespace-nowrap hidden sm:block",
                  isCompleted ? "text-gray-300" : 
                  isCurrent ? "text-primary-300" : 
                  "text-gray-600"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
