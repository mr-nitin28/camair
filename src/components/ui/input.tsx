'use client';

import React, { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon: Icon, rightElement, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {Icon && (
          <div className="absolute left-3 text-[var(--text-muted)] pointer-events-none">
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] px-3 py-2 text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all disabled:opacity-50 disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed ${
            Icon ? 'pl-9' : ''
          } ${rightElement ? 'pr-9' : ''} ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 flex items-center text-[var(--text-muted)]">
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
