'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { usePrefersReducedMotion, MOTION_DURATIONS } from '@/lib/motion';

export interface AttendanceGaugeProps {
  attended: number;
  total: number;
  threshold?: number; // Institutional threshold, default 75%
  size?: number;
  strokeWidth?: number;
  studentName?: string;
  className?: string;
}

/**
 * AttendanceGauge
 * 
 * Signature circular progress meter engineered for CampAI (CampusOS).
 * Features:
 * - Mathematical threshold indicator (institutional 75% tick)
 * - Deficit / Buffer recovery calculation ("Classes needed to reach 75%" vs "Safe classes to miss")
 * - Dynamic color semantics: Emerald (safe >= 75%), Amber (warning 65-74%), Rose (critical < 65%)
 * - Fully accessible ARIA attributes and prefers-reduced-motion compliance
 * - High-DPI SVG rendering with tabular numeric alignment
 */
export function AttendanceGauge({
  attended,
  total,
  threshold = 75,
  size = 140,
  strokeWidth = 10,
  studentName,
  className = '',
}: AttendanceGaugeProps) {
  const prefersReduced = usePrefersReducedMotion();

  // Percentage calculation clamped to 0-100%
  const percentage = total > 0 ? (attended / total) * 100 : 100;
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  // Recovery / Buffer calculations
  // Deficit: classes needed consecutively to reach threshold T:
  // (attended + x) / (total + x) >= T / 100 => x >= (T * total - 100 * attended) / (100 - T)
  let deficitClasses = 0;
  let safeToMiss = 0;

  if (clampedPercentage < threshold) {
    deficitClasses = Math.ceil((threshold * total - 100 * attended) / (100 - threshold));
    if (deficitClasses < 0) deficitClasses = 0;
  } else {
    // Buffer: how many can be missed while staying >= threshold:
    // attended / (total + y) >= T / 100 => y <= (100 * attended - T * total) / T
    safeToMiss = Math.floor((100 * attended - threshold * total) / threshold);
    if (safeToMiss < 0) safeToMiss = 0;
  }

  // Geometry
  const center = size / 2;
  const radius = center - strokeWidth / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  // Semantic Status
  const isSafe = clampedPercentage >= threshold;
  const isWarning = clampedPercentage >= threshold - 10 && !isSafe;
  const isCritical = clampedPercentage < threshold - 10;

  const statusColor = isSafe
    ? 'text-emerald-500 stroke-emerald-500'
    : isWarning
    ? 'text-amber-500 stroke-amber-500'
    : 'text-rose-500 stroke-rose-500';

  const badgeBg = isSafe
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    : isWarning
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';

  return (
    <div
      className={`flex flex-col items-center p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:border-[var(--border-strong)] transition-all duration-200 ${className}`}
      role="region"
      aria-label="Attendance Meter & Recovery Status"
    >
      <div className="relative inline-flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 origin-center overflow-visible"
        >
          {/* Subtle Outer Ambient Glow Ring for Dark Mode */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth + 6}
            className="stroke-[var(--surface-2)] opacity-40 dark:opacity-20"
            fill="transparent"
          />

          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            className="stroke-slate-200 dark:stroke-slate-800"
            fill="transparent"
          />

          {/* Threshold Marker Line (75% Institutional Standard) */}
          {threshold > 0 && threshold < 100 && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              strokeWidth={strokeWidth + 4}
              strokeDasharray={`3.5 ${circumference}`}
              strokeDashoffset={circumference - (threshold / 100) * circumference}
              className="stroke-amber-400 dark:stroke-amber-300 opacity-90 drop-shadow-sm"
              fill="transparent"
              strokeLinecap="butt"
            />
          )}

          {/* Animated Progress Meter */}
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
            className={`${statusColor} transition-colors duration-300`}
            fill="transparent"
          />
        </svg>

        {/* Centered Typography Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
          <span className="text-2xl font-black tracking-tight text-[var(--text)] tabular-nums">
            {clampedPercentage.toFixed(1)}%
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mt-0.5">
            {attended} / {total} Hrs
          </span>
        </div>
      </div>

      {/* Recovery / Buffer Action Strip */}
      <div className="mt-4 w-full text-center">
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeBg}`}
        >
          {isSafe ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Above Cutoff ({threshold}%)</span>
            </>
          ) : isWarning ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Critical Zone</span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Shortage Alert</span>
            </>
          )}
        </div>

        {/* Advisory Subtext */}
        <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
          {isSafe ? (
            safeToMiss > 0 ? (
              <>
                You have a safe buffer of{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                  {safeToMiss} {safeToMiss === 1 ? 'class' : 'classes'}
                </strong>
                .
              </>
            ) : (
              'You are exactly at the 75% boundary.'
            )
          ) : (
            <>
              Attend next{' '}
              <strong className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                {deficitClasses} consecutive {deficitClasses === 1 ? 'class' : 'classes'}
              </strong>{' '}
              to clear the 75% requirement.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
