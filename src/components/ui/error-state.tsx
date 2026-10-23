'use client';

import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while processing your request.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/60 dark:bg-rose-950/20 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7" aria-hidden="true" />
      </div>
      <h3 className="text-base font-extrabold text-[var(--text)] tracking-tight">
        {title}
      </h3>
      <p className="mt-1.5 text-xs md:text-sm text-[var(--text-muted)] max-w-sm">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-2)] shadow-sm transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}
