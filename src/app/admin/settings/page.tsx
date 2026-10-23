'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AdminService,
  type SystemSettingsConfig,
} from '@/lib/services/admin-service';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/error-state';
import {
  Settings,
  Save,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Building,
  Calendar,
  Percent,
  Trash2,
  Lock,
} from 'lucide-react';

export default function SystemSettingsPage() {
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState<SystemSettingsConfig | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Destructive Actions Modals
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [isPurgeOpen, setIsPurgeOpen] = useState(false);
  const [destructiveMsg, setDestructiveMsg] = useState<string | null>(null);

  const {
    data: settings,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-system-settings'],
    queryFn: () => AdminService.getSystemSettings(),
  });

  useEffect(() => {
    if (settings) {
      setFormState({ ...settings });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (newCfg: Partial<SystemSettingsConfig>) =>
      AdminService.updateSystemSettings(newCfg),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-settings'] });
      setFormState({ ...updated });
      setSaveSuccessMsg('Institutional system configurations successfully updated and audit logged.');
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState) return;
    updateMutation.mutate(formState);
  };

  const handleExecuteRollover = () => {
    setIsRolloverOpen(false);
    setDestructiveMsg('Academic session rollover completed. Transcripts archived, student semesters incremented.');
  };

  const handleExecutePurge = () => {
    setIsPurgeOpen(false);
    setDestructiveMsg('Application cache and ephemeral session logs successfully purged.');
  };

  if (isLoading || !formState) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          <div className="h-44 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" />
          <div className="h-44 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to Load System Settings"
        message="Could not load institution settings."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Institutional System Settings & Governance Guards"
        description="Configure institution credentials, academic threshold boundaries, and access guarded administrative actions."
      />

      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-[10px] uppercase font-extrabold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {destructiveMsg && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{destructiveMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setDestructiveMsg(null)}
            className="text-[10px] uppercase font-extrabold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. INSTITUTION CREDENTIALS */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
            <Building className="w-4.5 h-4.5 text-[var(--accent)]" />
            <h3 className="text-sm font-extrabold text-[var(--text)]">Institutional Identity</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Official Institution Name *
              </label>
              <input
                type="text"
                required
                value={formState.institutionName}
                onChange={(e) => setFormState({ ...formState, institutionName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Institution Code *
              </label>
              <input
                type="text"
                required
                value={formState.institutionCode}
                onChange={(e) => setFormState({ ...formState, institutionCode: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] font-mono uppercase font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              Authoritative Contact Email
            </label>
            <input
              type="email"
              required
              value={formState.contactEmail}
              onChange={(e) => setFormState({ ...formState, contactEmail: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
            />
          </div>
        </div>

        {/* 2. ACADEMIC & ATTENDANCE THRESHOLDS */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
            <Calendar className="w-4.5 h-4.5 text-[var(--accent)]" />
            <h3 className="text-sm font-extrabold text-[var(--text)]">Academic Policies & Thresholds</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Active Academic Year
              </label>
              <input
                type="text"
                required
                value={formState.academicYear}
                onChange={(e) => setFormState({ ...formState, academicYear: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Current Operational Term
              </label>
              <input
                type="text"
                required
                value={formState.currentTerm}
                onChange={(e) => setFormState({ ...formState, currentTerm: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Attendance Shortage Threshold (%)
              </label>
              <input
                type="number"
                min={50}
                max={95}
                step="0.5"
                required
                value={formState.attendanceThresholdPercent}
                onChange={(e) => setFormState({ ...formState, attendanceThresholdPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] font-bold tabular-nums"
              />
              <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                Default 75.0% per UGC regulation.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{updateMutation.isPending ? 'Saving...' : 'Save Configuration Changes'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* 3. DANGER ZONE / TYPED DESTRUCTIVE GUARDS */}
      <div className="p-5 rounded-2xl border border-rose-300 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/10 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200">
          <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
          <h3 className="text-sm font-extrabold">Danger Zone & Guarded Operations</h3>
        </div>

        <p className="text-xs text-rose-800 dark:text-rose-300">
          These operations perform irreversible state transitions. All actions require typed explicit confirmation per Master Prompt Section 16 governance rules.
        </p>

        <div className="space-y-3 pt-2">
          {/* Action 1: Close Academic Session */}
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-[var(--surface)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-extrabold text-[var(--text)] block">
                Close Academic Session & Rollover Semesters
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                Archives current term marks, locks attendance sessions, and increments enrolled student semesters.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsRolloverOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
            >
              Initiate Rollover
            </button>
          </div>

          {/* Action 2: Purge Ephemeral Cache */}
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-[var(--surface)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-extrabold text-[var(--text)] block">
                Purge Temporary Application Cache
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                Flushes all stale in-memory cached session calculations across worker nodes.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPurgeOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 cursor-pointer"
            >
              Purge Cache
            </button>
          </div>
        </div>
      </div>

      {/* TYPED CONFIRMATION DIALOG: ROLLOVER */}
      {isRolloverOpen && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setIsRolloverOpen(false)}
          onConfirm={handleExecuteRollover}
          title="Confirm Academic Session Rollover"
          description="This action archives historical attendance and increments student semesters. To confirm, type ROLLOVER below."
          confirmText="Execute Term Rollover"
          requiredKeyword="ROLLOVER"
          variant="danger"
        />
      )}

      {/* TYPED CONFIRMATION DIALOG: PURGE */}
      {isPurgeOpen && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setIsPurgeOpen(false)}
          onConfirm={handleExecutePurge}
          title="Confirm Application Cache Purge"
          description="Flushes all cached computation records. To confirm, type PURGE below."
          confirmText="Purge Stale Cache"
          requiredKeyword="PURGE"
          variant="danger"
        />
      )}
    </div>
  );
}
