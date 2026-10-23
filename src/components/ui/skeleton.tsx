'use client';

import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800/80 ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonStat() {
  return (
    <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

export function SkeletonCard({ height, className = '' }: { height?: number; className?: string } = {}) {
  return (
    <div
      style={height ? { minHeight: height } : undefined}
      className={`p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 256 }: { height?: number }) {
  return (
    <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div style={{ height }} className="w-full flex items-end gap-3 pt-6 pb-2 px-2">
        {[40, 75, 55, 90, 65, 80, 50, 85].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center h-full">
            <Skeleton
              className="w-full rounded-t-md"
              style={{ height: `${h}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--surface)] shadow-sm">
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="p-4 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <Skeleton
                key={cIdx}
                className="h-4 flex-1"
                style={{ maxWidth: cIdx === 0 ? '30%' : undefined }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonPageHeader() {
  return (
    <div className="space-y-3 pb-6 border-b border-[var(--border)] mb-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
