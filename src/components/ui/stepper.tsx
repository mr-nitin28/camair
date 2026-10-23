'use client';

import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id?: string;
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'upcoming';
  timestamp?: string;
}

export interface StepperProps {
  steps: StepItem[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Stepper({
  steps,
  orientation = 'horizontal',
  className = '',
}: StepperProps) {
  if (orientation === 'vertical') {
    return (
      <div className={`space-y-6 ${className}`}>
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';

          return (
            <div key={idx} className="relative flex gap-4">
              {/* Vertical connector line */}
              {!isLast && (
                <div
                  className={`absolute left-4 top-8 bottom-[-24px] w-0.5 ${
                    isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Step indicator node */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 select-none z-10 ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isCurrent
                    ? 'border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] ring-4 ring-[var(--accent-soft)]'
                    : 'border-slate-300 dark:border-slate-600 bg-[var(--surface-2)] text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>

              {/* Step text content */}
              <div className="pt-0.5 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`text-xs font-bold ${
                      isCurrent
                        ? 'text-[var(--accent)]'
                        : isCompleted
                        ? 'text-[var(--text)]'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {step.title}
                  </h4>
                  {step.timestamp && (
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {step.timestamp}
                    </span>
                  )}
                </div>
                {step.description && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';

          return (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center text-center max-w-[120px]">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 select-none mb-2 ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : isCurrent
                      ? 'border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] ring-4 ring-[var(--accent-soft)]'
                      : 'border-slate-300 dark:border-slate-600 bg-[var(--surface-2)] text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`text-xs font-bold ${
                    isCurrent
                      ? 'text-[var(--accent)]'
                      : isCompleted
                      ? 'text-[var(--text)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {step.title}
                </span>
                {step.description && (
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                    {step.description}
                  </span>
                )}
              </div>

              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mx-2 -mt-6 ${
                    isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
