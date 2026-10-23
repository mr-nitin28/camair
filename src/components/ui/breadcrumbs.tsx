'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumbs({
  items,
  showHome = true,
  className = '',
}: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-[var(--text-muted)] ${className}`}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {showHome && (
          <li className="inline-flex items-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors"
              aria-label="Home"
            >
              <Home className="w-3.5 h-3.5" />
            </Link>
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={index}>
              {(showHome || index > 0) && (
                <li aria-hidden="true" className="text-slate-400 dark:text-slate-600">
                  <ChevronRight className="w-3.5 h-3.5" />
                </li>
              )}
              <li className="inline-flex items-center">
                {isLast || !item.href ? (
                  <span
                    className="font-bold text-[var(--text)] select-none"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:text-[var(--text)] transition-colors font-medium"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
