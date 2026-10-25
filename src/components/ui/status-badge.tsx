'use client';

import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Info, 
  ShieldAlert,
  type LucideIcon 
} from 'lucide-react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md';

export interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  status?: string;
  size?: BadgeSize;
  icon?: LucideIcon;
  showIcon?: boolean;
  className?: string;
}

const defaultIcons: Record<BadgeVariant, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
  neutral: Clock,
};

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
  warning: 'bg-amber-50 text-amber-900 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
  danger: 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60',
  info: 'bg-indigo-50 text-indigo-800 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60',
  neutral: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/70 dark:text-slate-200 dark:border-slate-700',
};

const sizeStyles: Record<BadgeSize, { badge: string; icon: string }> = {
  sm: { badge: 'px-2 py-0.5 text-[11px] gap-1 rounded-md font-bold shadow-2xs', icon: 'w-3 h-3' },
  md: { badge: 'px-2.5 py-1 text-xs gap-1.5 rounded-lg font-bold shadow-2xs', icon: 'w-3.5 h-3.5' },
};

function resolveStatusToVariant(status?: string, defaultVariant: BadgeVariant = 'neutral'): BadgeVariant {
  if (!status) return defaultVariant;
  const s = status.toLowerCase();
  if (['active', 'published', 'approved', 'graded', 'verified', 'completed', 'success', 'cleared', 'eligible', 'good standing', 'present', 'on track'].includes(s)) {
    return 'success';
  }
  if (['pending', 'submitted', 'under_review', 'clarification_requested', 'late', 'warning', 'in progress', 'near limit', 'due soon'].includes(s)) {
    return 'warning';
  }
  if (['rejected', 'error', 'danger', 'at_risk', 'failed', 'absent', 'shortage', 'unpaid', 'overdue'].includes(s)) {
    return 'danger';
  }
  if (['info', 'scheduled', 'group', 'student', 'faculty', 'admin', 'enrolled'].includes(s)) {
    return 'info';
  }
  return 'neutral';
}

export function StatusBadge({
  label,
  variant,
  status,
  size = 'md',
  icon: CustomIcon,
  showIcon = true,
  className = '',
}: StatusBadgeProps) {
  const effectiveVariant = variant || resolveStatusToVariant(status, 'neutral');
  const IconComponent = CustomIcon || defaultIcons[effectiveVariant];
  const { badge, icon } = sizeStyles[size];
  const style = variantStyles[effectiveVariant];

  return (
    <span
      className={`inline-flex items-center border tracking-tight select-none ${badge} ${style} ${className}`}
    >
      {showIcon && <IconComponent className={`${icon} shrink-0`} aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
}
