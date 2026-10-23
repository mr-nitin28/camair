'use client';

import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', disabled, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] p-3 text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all disabled:opacity-50 disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed custom-scrollbar ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
