'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { usePrefersReducedMotion } from '@/lib/motion';

export interface ResponsiveSheetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string; // e.g. "max-w-lg"
  className?: string;
}

/**
 * ResponsiveSheetDialog
 * 
 * Adaptive container:
 * - Mobile (< 768px): iOS-style drag-down Bottom Sheet with safe-area padding
 * - Tablet/Desktop (>= 768px): Centered Floating Glass Dialog
 * - WCAG AA focus management, keyboard ESC listener, and scroll locking
 */
export function ResponsiveSheetDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-lg',
  className = '',
}: ResponsiveSheetDialogProps) {
  const prefersReduced = usePrefersReducedMotion();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Lock body scroll while open
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

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[var(--z-modal)] flex md:items-center md:justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby={description ? 'dialog-description' : undefined}
        >
          {/* Glass Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0.01 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[var(--z-modal-backdrop)]"
          />

          {/* Dialog Container */}
          <motion.div
            ref={dialogRef}
            initial={{
              y: window.innerWidth < 768 ? '100%' : 20,
              opacity: window.innerWidth < 768 ? 1 : 0,
              scale: window.innerWidth < 768 ? 1 : 0.96,
            }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
            }}
            exit={{
              y: window.innerWidth < 768 ? '100%' : 20,
              opacity: 0,
              scale: window.innerWidth < 768 ? 1 : 0.96,
            }}
            transition={{
              type: prefersReduced ? 'tween' : 'spring',
              stiffness: 380,
              damping: 30,
              duration: prefersReduced ? 0.01 : undefined,
            }}
            drag={window.innerWidth < 768 ? 'y' : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            className={`relative z-[var(--z-modal)] w-full bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden
              /* Mobile: Bottom Sheet pinned to bottom */
              mt-auto rounded-t-3xl md:mt-0 md:rounded-3xl
              /* Desktop: Centered modal */
              md:${maxWidth} md:mx-4
              pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-6
              ${className}
            `}
          >
            {/* Mobile Drag Indicator Bar */}
            <div className="md:hidden flex justify-center pt-3 pb-1 select-none">
              <div className="w-10 h-1.5 rounded-full bg-[var(--text-muted)]/30" />
            </div>

            {/* Header */}
            <div className="px-6 py-4 flex items-start justify-between gap-4 border-b border-[var(--border)]/60">
              <div>
                <h2
                  id="dialog-title"
                  className="text-lg md:text-xl font-black tracking-tight text-[var(--text)]"
                >
                  {title}
                </h2>
                {description && (
                  <p
                    id="dialog-description"
                    className="text-xs text-[var(--text-muted)] mt-1"
                  >
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 -mr-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="px-6 py-5 max-h-[70vh] md:max-h-[60vh] overflow-y-auto custom-scrollbar">
              {children}
            </div>

            {/* Optional Footer */}
            {footer && (
              <div className="px-6 py-4 bg-[var(--surface-2)]/50 border-t border-[var(--border)]/60 flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
