'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

export interface TabBarItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export interface BottomTabBarProps {
  items: TabBarItem[];
  className?: string;
}

export function BottomTabBar({ items, className = '' }: BottomTabBarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile Navigation"
      className={`md:hidden fixed bottom-0 left-0 right-0 z-[var(--z-sticky)] bg-[var(--surface)] border-t border-[var(--border)] px-2 py-1.5 shadow-lg flex items-center justify-around select-none pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] ${className}`}
    >
      {items.slice(0, 5).map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/faculty' && item.href !== '/admin' && pathname?.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 relative min-w-[56px] min-h-[44px] ${
              isActive
                ? 'text-[var(--accent)] font-bold'
                : 'text-[var(--text-muted)] font-semibold hover:text-[var(--text)]'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="relative">
              <Icon className="w-5 h-5 shrink-0" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-2 px-1 text-[9px] font-extrabold bg-rose-600 text-white rounded-full min-w-[14px] text-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight truncate max-w-[64px]">
              {item.label}
            </span>
            {isActive && (
              <span
                className="w-1 h-1 rounded-full bg-[var(--accent)] mt-0.5"
                aria-hidden="true"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
