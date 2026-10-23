'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { usePrefersReducedMotion, createFadeVariants, createDrawerVariants } from '@/lib/motion';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  side?: 'right' | 'left' | 'bottom';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const sideClasses = {
  right: 'top-0 right-0 h-full w-full max-w-md border-l',
  left: 'top-0 left-0 h-full w-full max-w-md border-r',
  bottom: 'bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl border-t',
};

export function Sheet({
  isOpen,
  onClose,
  title,
  description,
  side = 'right',
  children,
  footer,
  className = '',
}: SheetProps) {
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const fadeVariants = createFadeVariants(prefersReduced);
  const drawerVariants = createDrawerVariants(prefersReduced, side);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-title"
          aria-describedby={description ? 'sheet-description' : undefined}
        >
          {/* Backdrop */}
          <motion.div
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[var(--z-modal-backdrop)]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`fixed z-[var(--z-modal)] bg-[var(--surface)] border-[var(--border)] shadow-2xl flex flex-col ${sideClasses[side]} ${className}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)] shrink-0">
              <div>
                <h2 id="sheet-title" className="text-base font-extrabold text-[var(--text)] tracking-tight">
                  {title}
                </h2>
                {description && (
                  <p id="sheet-description" className="text-xs text-[var(--text-muted)] mt-1 font-medium">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-end gap-3 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
