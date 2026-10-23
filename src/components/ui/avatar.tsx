'use client';

import React, { useState } from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  className?: string;
}

const sizeClasses: Record<AvatarSize, { container: string; text: string; dot: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', dot: 'w-1.5 h-1.5' },
  sm: { container: 'w-8 h-8', text: 'text-xs', dot: 'w-2 h-2' },
  md: { container: 'w-10 h-10', text: 'text-sm', dot: 'w-2.5 h-2.5' },
  lg: { container: 'w-12 h-12', text: 'text-base', dot: 'w-3 h-3' },
  xl: { container: 'w-16 h-16', text: 'text-xl', dot: 'w-3.5 h-3.5' },
};

const statusClasses: Record<AvatarStatus, string> = {
  online: 'bg-emerald-500 border-white dark:border-slate-900',
  offline: 'bg-slate-400 border-white dark:border-slate-900',
  busy: 'bg-rose-500 border-white dark:border-slate-900',
  away: 'bg-amber-500 border-white dark:border-slate-900',
};

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  status,
  className = '',
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name || alt);
  const sizeConfig = sizeClasses[size];

  return (
    <div className={`relative inline-block shrink-0 ${sizeConfig.container} ${className}`}>
      {src && !imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full border border-slate-200 dark:border-slate-700"
        />
      ) : (
        <div
          className={`w-full h-full rounded-full bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border)] flex items-center justify-center font-bold tracking-tight select-none ${sizeConfig.text}`}
          aria-label={alt || name || 'Avatar placeholder'}
        >
          {initials}
        </div>
      )}

      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 ${sizeConfig.dot} ${statusClasses[status]}`}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}
