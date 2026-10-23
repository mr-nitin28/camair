'use client';

import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
  className?: string;
}

export function FormField({
  label,
  error,
  helperText,
  required,
  children,
  className = '',
}: FormFieldProps) {
  const generatedId = useId();

  if (!React.isValidElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>(children)) {
    return <div className={`space-y-1.5 ${className}`}>{children}</div>;
  }

  const fieldId = children.props.id || generatedId;
  const errorId = `${fieldId}-error`;
  const helperId = `${fieldId}-helper`;

  const describedBy = [
    error ? errorId : null,
    helperText ? helperId : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-xs font-bold text-[var(--text)] select-none"
        >
          {label}
          {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      {React.cloneElement(children, {
        id: fieldId,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
      })}

      {helperText && !error && (
        <p id={helperId} className="text-[11px] text-[var(--text-muted)] font-medium">
          {helperText}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 mt-1"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
