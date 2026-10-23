'use client';

import React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] mb-4">
        <Icon className="w-7 h-7" aria-hidden="true" />
      </div>
      <h3 className="text-base font-extrabold text-[var(--text)] tracking-tight">
        {title}
      </h3>
      <p className="mt-1.5 text-xs md:text-sm text-[var(--text-muted)] max-w-sm">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
