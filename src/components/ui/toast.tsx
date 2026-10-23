'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  X, 
  RotateCcw 
} from 'lucide-react';
import { usePrefersReducedMotion, createSlideUpVariants } from '@/lib/motion';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  onUndo?: () => void;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const prefersReduced = usePrefersReducedMotion();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ duration = 5000, ...toast }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { ...toast, id, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
    error: <XCircle className="w-4 h-4 text-rose-500 shrink-0" />,
    info: <Info className="w-4 h-4 text-indigo-500 shrink-0" />,
  };

  const slideVariants = createSlideUpVariants(prefersReduced);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast viewport */}
      <div
        className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              variants={slideVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="pointer-events-auto bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-2xl p-4 shadow-xl flex items-start gap-3"
            >
              {icons[t.type || 'info']}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-[var(--text)] tracking-tight">
                  {t.title}
                </h4>
                {t.description && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
                    {t.description}
                  </p>
                )}
                {t.onUndo && (
                  <button
                    type="button"
                    onClick={() => {
                      t.onUndo?.();
                      removeToast(t.id);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Undo</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
