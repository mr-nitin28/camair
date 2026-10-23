'use client';

import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', children, options, disabled, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={`w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] px-3 py-2 pr-9 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all disabled:opacity-50 disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed cursor-pointer ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <div className="absolute right-3 pointer-events-none text-[var(--text-muted)]">
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
