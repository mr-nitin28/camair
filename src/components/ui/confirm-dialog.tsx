'use client';

import React, { useState } from 'react';
import { Dialog } from './dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  requiredKeyword?: string; // If provided, user must type this exact string
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  className?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  requiredKeyword,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  variant = 'danger',
  className = '',
}: ConfirmDialogProps) {
  const [typedInput, setTypedInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isConfirmed = !requiredKeyword || typedInput.trim() === requiredKeyword.trim();

  const handleConfirm = async () => {
    if (!isConfirmed || isLoading) return;
    try {
      setIsLoading(true);
      await onConfirm();
      handleClose();
    } catch (error) {
      console.error('ConfirmDialog action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTypedInput('');
    setIsLoading(false);
    onClose();
  };

  const variantButtonStyles = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
    primary: 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white focus:ring-[var(--accent)]',
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="md"
      className={className}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmed || isLoading}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variantButtonStyles[variant]}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900 shrink-0">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {requiredKeyword && (
          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            <label
              htmlFor="confirmation-keyword"
              className="block text-xs font-bold text-[var(--text)]"
            >
              To confirm this irreversible action, type{' '}
              <span className="font-mono bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-rose-600 dark:text-rose-400 select-all font-bold">
                {requiredKeyword}
              </span>{' '}
              below:
            </label>
            <input
              id="confirmation-keyword"
              type="text"
              autoFocus
              data-autofocus="true"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isConfirmed && !isLoading) {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
              placeholder={`Type "${requiredKeyword}" here`}
              disabled={isLoading}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] font-mono"
            />
          </div>
        )}
      </div>
    </Dialog>
  );
}
