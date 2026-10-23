'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from 'lucide-react';
import { Skeleton } from './skeleton';

export interface StatDelta {
  value: number | string;
  isPositive?: boolean;
  label?: string;
}

export interface StatCardProps {
  title?: string;
  label?: string;
  value: string | number;
  delta?: StatDelta;
  trend?: { value: number | string; direction?: 'up' | 'down' | 'neutral'; isPositive?: boolean };
  subtext?: string;
  icon?: LucideIcon;
  sparklineData?: number[];
  loading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  label,
  value,
  delta,
  trend,
  subtext,
  icon: Icon,
  sparklineData,
  loading = false,
  className = '',
}: StatCardProps) {
  const displayTitle = title || label || '';
  const effectiveDelta: StatDelta | undefined = delta || (trend ? {
    value: trend.value,
    isPositive: trend.direction === 'up' ? true : trend.direction === 'down' ? false : undefined,
  } : undefined);
  if (loading) {
    return (
      <div className={`p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  // Generate sparkline SVG points if data provided
  let sparklinePoints = '';
  if (sparklineData && sparklineData.length > 1) {
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    const step = width / (sparklineData.length - 1);

    sparklinePoints = sparklineData
      .map((val, idx) => {
        const x = idx * step;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x},${y}`;
      })
      .join(' ');
  }

  return (
    <div
      className={`p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all duration-200 shadow-sm flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] select-none">
          {displayTitle}
        </span>
        {Icon && (
          <div className="p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] shrink-0 border border-[var(--border)]">
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-2">
        <div className="text-2xl lg:text-3xl font-extrabold text-[var(--text)] tracking-tight tabular-nums">
          {value}
        </div>

        {sparklinePoints && (
          <div className="w-20 h-6 shrink-0" aria-hidden="true">
            <svg width="80" height="24" className="overflow-visible">
              <polyline
                fill="none"
                stroke={effectiveDelta?.isPositive === false ? '#EF4444' : '#10B981'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparklinePoints}
              />
            </svg>
          </div>
        )}
      </div>

      {(effectiveDelta || subtext) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs flex-wrap">
          {effectiveDelta && (
            <span
              className={`inline-flex items-center gap-0.5 font-bold tabular-nums px-1.5 py-0.5 rounded-md ${
                effectiveDelta.isPositive === true
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : effectiveDelta.isPositive === false
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {effectiveDelta.isPositive === true && <ArrowUpRight className="w-3.5 h-3.5" />}
              {effectiveDelta.isPositive === false && <ArrowDownRight className="w-3.5 h-3.5" />}
              {effectiveDelta.isPositive === undefined && <Minus className="w-3.5 h-3.5" />}
              {typeof effectiveDelta.value === 'number' && effectiveDelta.value > 0 ? `+${effectiveDelta.value}` : effectiveDelta.value}
            </span>
          )}
          {subtext && (
            <span className="text-[var(--text-muted)] font-medium truncate">
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const KpiTile = StatCard;
