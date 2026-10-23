'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '@/lib/motion';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  delayMs = 150,
  className = '',
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipId = useId();
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleOpen = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(true), delayMs);
  };

  const handleClose = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(false);
  };

  const sidePositions: Record<string, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  if (!React.isValidElement<React.HTMLAttributes<HTMLElement>>(children)) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={handleClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleClose();
      }}
    >
      {React.cloneElement(children, {
        'aria-describedby': isOpen ? tooltipId : undefined,
      })}

      <AnimatePresence>
        {isOpen && content && (
          <motion.div
            id={tooltipId}
            role="tooltip"
            initial={{ opacity: 0, scale: prefersReduced ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: prefersReduced ? 1 : 0.95 }}
            transition={{ duration: prefersReduced ? 0.01 : 0.12 }}
            className={`absolute z-[var(--z-tooltip)] pointer-events-none whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-md dark:bg-slate-800 dark:border dark:border-slate-700 ${sidePositions[side]} ${className}`}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
