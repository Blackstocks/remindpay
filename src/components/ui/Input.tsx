'use client';

import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full min-w-0">
        {label && (
          <label
            htmlFor={id}
            className="block text-[13px] font-medium text-zinc-600 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900',
            'placeholder:text-zinc-300 transition-all duration-150 text-base sm:text-sm',
            'focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent',
            error && 'border-red-300 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
