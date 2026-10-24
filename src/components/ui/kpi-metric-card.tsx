'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/lib/motion';

export interface KpiMetricCardProps {
  title: string;
  value: string | number;
  periodLabel?: string; // e.g. "vs last semester" or "vs previous month"
  delta?: {
    percentage: number;
    isPositive?: boolean;
  };
  sparklineData?: number[];
  icon?: LucideIcon;
  badgeText?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * KpiMetricCard
 * 
 * Linear/Stripe-tier executive metric card featuring:
 * - Tabular numbers to avoid layout shift
 * - Micro SVG sparkline with gradient fill
 * - Positive/Negative/Neutral delta pill
 * - Tactile hover lift and subtle focus ring
 * - Fully responsive & accessible
 */
export function KpiMetricCard({
  title,
  value,
  periodLabel = 'vs last term',
  delta,
  sparklineData = [32, 45, 42, 58, 64, 61, 78, 85],
  icon: Icon,
  badgeText,
  onClick,
  className = '',
}: KpiMetricCardProps) {
  const prefersReduced = usePrefersReducedMotion();

  // Compute sparkline points & area
  const width = 110;
  const height = 36;
  const padding = 4;
  const minVal = Math.min(...sparklineData);
  const maxVal = Math.max(...sparklineData);
  const range = maxVal - minVal || 1;

  const points = sparklineData.map((val, idx) => {
    const x = padding + (idx / (sparklineData.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
    return { x, y };
  });

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPathStr = `M ${points[0].x},${height} L ${polylineStr} L ${points[points.length - 1].x},${height} Z`;

  // Color semantics based on delta direction
  const isUp = delta?.isPositive ?? (delta ? delta.percentage >= 0 : true);
  const isNeutral = delta?.percentage === 0;

  const strokeColor = isNeutral
    ? '#94A3B8'
    : isUp
    ? '#10B981'
    : '#EF4444';

  const gradientId = `spark-grad-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.15, ease: 'easeOut' } }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      role={onClick ? 'button' : 'region'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${title}: ${value}`}
      className={`relative p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:border-[var(--border-strong)] transition-all duration-200 flex flex-col justify-between overflow-hidden group ${
        onClick ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]' : ''
      } ${className}`}
    >
      {/* Top Header: Title & Optional Icon / Badge */}
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] select-none">
          {title}
        </span>
        <div className="flex items-center gap-1.5">
          {badgeText && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
              {badgeText}
            </span>
          )}
          {Icon && (
            <div className="p-2 rounded-xl bg-[var(--surface-2)] text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
              <Icon className="w-4 h-4 shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* Main Metric Value & Trend Sparkline */}
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-3xl font-black tracking-tight text-[var(--text)] tabular-nums">
            {value}
          </div>

          {/* Delta Pill */}
          {delta && (
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-md border ${
                  isNeutral
                    ? 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                    : isUp
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                }`}
              >
                {isNeutral ? (
                  <Minus className="w-3 h-3" />
                ) : isUp ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                <span className="tabular-nums">
                  {Math.abs(delta.percentage).toFixed(1)}%
                </span>
              </span>
              <span className="text-[11px] text-[var(--text-muted)] select-none">
                {periodLabel}
              </span>
            </div>
          )}
        </div>

        {/* Inline SVG Micro-Sparkline */}
        <div className="shrink-0 w-[110px] h-[36px]">
          <svg width={width} height={height} className="overflow-visible w-full h-full">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <path d={areaPathStr} fill={`url(#${gradientId})`} />
            <polyline
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylineStr}
            />
            {/* Glowing endpoint marker */}
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="2.5"
              fill={strokeColor}
              className="drop-shadow-sm"
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
}
