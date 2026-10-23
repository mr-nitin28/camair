'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export interface PermissionDeniedProps {
  requiredRole?: string;
  message?: string;
  returnHref?: string;
  className?: string;
}

export function PermissionDenied({
  requiredRole,
  message,
  returnHref = '/dashboard',
  className = '',
}: PermissionDeniedProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center mb-4">
        <ShieldAlert className="w-7 h-7" aria-hidden="true" />
      </div>
      <h3 className="text-base font-extrabold text-[var(--text)] tracking-tight">
        Access Denied
      </h3>
      <p className="mt-1.5 text-xs md:text-sm text-[var(--text-muted)] max-w-sm">
        {message ||
          (requiredRole
            ? `You need ${requiredRole} privileges to access this resource or execute this action.`
            : 'You do not have sufficient permissions to view this resource.')}
      </p>
      <div className="mt-5">
        <Link
          href={returnHref}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-2)] shadow-sm transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Workspace</span>
        </Link>
      </div>
    </div>
  );
}
