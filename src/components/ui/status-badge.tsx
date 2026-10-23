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
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
  warning: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
  danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
  info: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/60',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
};

const sizeStyles: Record<BadgeSize, { badge: string; icon: string }> = {
  sm: { badge: 'px-2 py-0.5 text-[11px] gap-1 rounded-md font-semibold', icon: 'w-3 h-3' },
  md: { badge: 'px-2.5 py-1 text-xs gap-1.5 rounded-lg font-semibold', icon: 'w-3.5 h-3.5' },
};

function resolveStatusToVariant(status?: string, defaultVariant: BadgeVariant = 'neutral'): BadgeVariant {
  if (!status) return defaultVariant;
  const s = status.toLowerCase();
  if (['active', 'published', 'approved', 'graded', 'verified', 'completed', 'success', 'cleared'].includes(s)) {
    return 'success';
  }
  if (['pending', 'submitted', 'under_review', 'clarification_requested', 'late', 'warning', 'in progress'].includes(s)) {
    return 'warning';
  }
  if (['rejected', 'error', 'danger', 'at_risk', 'failed', 'absent', 'shortage'].includes(s)) {
    return 'danger';
  }
  if (['info', 'scheduled', 'group', 'student'].includes(s)) {
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
