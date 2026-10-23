'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import {
  StudentService,
  type LeaveRequestRecord,
  type LeaveRequestStatus,
} from '@/lib/services/student-service';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Stepper } from '@/components/ui/stepper';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import type { LeaveFormValues } from '@/components/leaves/apply-leave-dialog';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Paperclip,
  Ban,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const ApplyLeaveDialog = dynamic(
  () => import('@/components/leaves/apply-leave-dialog'),
  { ssr: false }
);

export default function StudentLeavesPage() {
  const queryClient = useQueryClient();
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [withdrawTargetId, setWithdrawTargetId] = useState<string | null>(null);
  const [expandedLeaveId, setExpandedLeaveId] = useState<string | null>(null);

  const {
    data: leaves,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['student-leave-requests'],
    queryFn: () => StudentService.getLeaveRequests(),
    staleTime: 30 * 1000,
  });

  const submitMutation = useMutation({
    mutationFn: (values: LeaveFormValues) => StudentService.submitLeaveRequest(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-leave-requests'] });
      setIsApplyModalOpen(false);
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (leaveId: string) => StudentService.withdrawLeaveRequest(leaveId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-leave-requests'] });
      setWithdrawTargetId(null);
    },
  });

  const handleFormSubmit = async (values: LeaveFormValues) => {
    await submitMutation.mutateAsync(values);
  };

  const handleConfirmWithdraw = async () => {
    if (withdrawTargetId) {
      await withdrawMutation.mutateAsync(withdrawTargetId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="student-leaves-loading">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !leaves) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not load leave records"
          message={error instanceof Error ? error.message : 'Failed to retrieve leave history.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="student-leaves">
      {/* Header */}
      <PageHeader
        title="Leave Management & Applications"
        description="Official absence approvals, medical leave certificates, and status tracking"
        badge={<StatusBadge label="Regulatory Leave System" variant="info" size="sm" />}
        actions={
          <button
            type="button"
            onClick={() => setIsApplyModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-fg)] transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Apply For Leave</span>
          </button>
        }
      />

      {/* Leave Application History */}
      {leaves.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No leave applications"
          description="You have not submitted any leave requests this semester."
          action={
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-bold"
            >
              Apply For Leave
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {leaves.map((leave) => {
            const isExpanded = expandedLeaveId === leave.id;
            let statusVariant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' = 'neutral';
            if (leave.status === 'approved') statusVariant = 'success';
            else if (leave.status === 'submitted' || leave.status === 'under_review') statusVariant = 'warning';
            else if (leave.status === 'rejected') statusVariant = 'danger';
            else if (leave.status === 'clarification_requested') statusVariant = 'info';

            return (
              <div
                key={leave.id}
                className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4 transition-all"
              >
                {/* Top Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <StatusBadge
                      label={leave.leaveType}
                      variant="info"
                      size="sm"
                    />
                    <StatusBadge
                      label={leave.status.replace('_', ' ').toUpperCase()}
                      variant={statusVariant}
                      size="sm"
                    />
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      {new Date(leave.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      {' → '}
                      {new Date(leave.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {leave.canWithdraw && (
                      <button
                        type="button"
                        onClick={() => setWithdrawTargetId(leave.id)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100 transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Withdraw Request</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedLeaveId(isExpanded ? null : leave.id)}
                      className="p-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Reason & Reviewer Notes */}
                <div className="text-xs text-[var(--text)] leading-relaxed">
                  <p className="font-medium">{leave.reason}</p>
                </div>

                {/* Reviewer / Decision Box */}
                {leave.decisionComment && (
                  <div className="p-3.5 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--border)] text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-[var(--text)]">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[var(--accent)]" />
                        {leave.approverName || 'Department Reviewer'}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        Official Decision Comment
                      </span>
                    </div>
                    <p className="text-[var(--text-muted)]">{leave.decisionComment}</p>
                  </div>
                )}

                {/* Expandable Lifecycle Stepper & Details */}
                {isExpanded && (
                  <div className="pt-4 border-t border-[var(--border)] space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                      Application Workflow Lifecycle
                    </h4>
                    <Stepper
                      steps={leave.timeline}
                      orientation="vertical"
                      className="pl-2"
                    />
                    {leave.attachmentName && (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] pt-2 font-mono">
                        <Paperclip className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Attached Certificate: {leave.attachmentName}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamically imported Leave Apply Dialog */}
      {isApplyModalOpen && (
        <ApplyLeaveDialog
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          onSubmit={handleFormSubmit}
          isSubmitting={submitMutation.isPending}
        />
      )}

      {/* Withdraw Confirmation Dialog */}
      <ConfirmDialog
        isOpen={withdrawTargetId !== null}
        onClose={() => setWithdrawTargetId(null)}
        onConfirm={handleConfirmWithdraw}
        title="Withdraw Leave Application?"
        description="Are you sure you want to withdraw this application? Once withdrawn, the request transitions to a terminal state per institutional policy."
        confirmText="Confirm Withdrawal"
        cancelText="Keep Active"
        variant="danger"
      />
    </div>
  );
}
