'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion, MOTION_DURATIONS } from '@/lib/motion';

export interface ProgressRingProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  threshold?: number; // e.g. 75 for attendance
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 8,
  threshold = 75,
  label,
  showValue = true,
  className = '',
}: ProgressRingProps) {
  const prefersReduced = usePrefersReducedMotion();
  const clampedValue = Math.min(100, Math.max(0, value));
  
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  // Determine color based on threshold
  let strokeColor = 'text-emerald-500';
  if (clampedValue < threshold) {
    strokeColor = clampedValue < threshold - 10 ? 'text-rose-500' : 'text-amber-500';
  }

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center ${className}`}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `Progress: ${clampedValue.toFixed(1)}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 origin-center"
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-slate-200 dark:stroke-slate-800"
          fill="transparent"
        />

        {/* Threshold marker tick if defined (e.g. 75% institutional requirement) */}
        {threshold > 0 && threshold < 100 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth + 4}
            strokeDasharray={`3.5 ${circumference}`}
            strokeDashoffset={circumference - (threshold / 100) * circumference}
            className="stroke-amber-500 dark:stroke-amber-400 opacity-90"
            fill="transparent"
            strokeLinecap="butt"
          />
        )}

        {/* Animated Progress Indicator */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{
            duration: prefersReduced ? 0.01 : MOTION_DURATIONS.chart,
            ease: [0.16, 1, 0.3, 1],
          }}
          strokeLinecap="round"
          className={`${strokeColor} stroke-current`}
          fill="transparent"
        />
      </svg>

      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-sm font-extrabold text-[var(--text)] tabular-nums tracking-tight">
            {clampedValue.toFixed(0)}%
          </span>
          {label && (
            <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
