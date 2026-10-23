'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FacultyService,
  type FacultyLeaveQueueItem,
  type LeaveStatus,
} from '@/lib/services/faculty-service';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList, SkeletonCard } from '@/components/ui/skeleton';
import {
  CalendarClock,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  User,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  Send,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

function FacultyLeaveApprovalsContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const queryLeaveId = searchParams.get('id') || undefined;

  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(queryLeaveId || null);
  const [decisionComment, setDecisionComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Fetch Leave Requests Queue
  const {
    data: leaves,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['faculty-leaves-queue', filterStatus],
    queryFn: () => FacultyService.getLeaveRequestsQueue('00000000-0000-0000-0000-000000000020', filterStatus),
  });

  // Active Selected Leave
  const activeLeave = useMemo(() => {
    if (!leaves || leaves.length === 0) return null;
    if (selectedLeaveId) {
      const found = leaves.find((l) => l.id === selectedLeaveId);
      if (found) return found;
    }
    return leaves[0];
  }, [leaves, selectedLeaveId]);

  // Transition Leave Mutation via RPC
  const transitionMutation = useMutation({
    mutationFn: async ({ status, comment }: { status: LeaveStatus; comment?: string }) => {
      if (!activeLeave) return;
      return await FacultyService.actionLeaveRequest({
        leaveId: activeLeave.id,
        status,
        decisionComment: comment,
      });
    },
    onSuccess: (res, vars) => {
      setActionError(null);
      setDecisionComment('');
      setSuccessToast(`Leave request successfully marked as ${vars.status}.`);
      queryClient.invalidateQueries({ queryKey: ['faculty-leaves-queue'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-console-summary'] });
      setTimeout(() => setSuccessToast(null), 4000);
    },
    onError: (err: any) => {
      setActionError(err?.message || 'Failed to action leave request.');
    },
  });

  const handleDecision = (status: LeaveStatus) => {
    setActionError(null);
    if ((status === 'approved' || status === 'rejected') && !decisionComment.trim()) {
      setActionError('Decision comment is strictly required before approving or rejecting a leave application.');
      return;
    }
    transitionMutation.mutate({ status, comment: decisionComment });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard height={80} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <SkeletonList count={5} />
          </div>
          <div className="lg:col-span-7">
            <SkeletonCard height={420} />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !leaves) {
    return (
      <ErrorState
        title="Failed to Load Leave Applications"
        message={error instanceof Error ? error.message : 'Unable to query approvals queue.'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-white" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold mb-1">
            <Link href="/faculty" className="hover:text-primary flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Faculty Console
            </Link>
            <span>•</span>
            <span>Approvals Queue ({leaves.length} Total Applications)</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Student Leave Approvals
          </h1>
        </div>

        {/* Filter Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border/60 text-xs font-bold">
          {(['All', 'submitted', 'under_review', 'approved', 'rejected'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                filterStatus === st
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {st === 'submitted' ? 'Pending' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* 2. SPLIT-PANE QUEUE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Queue List */}
        <div className="lg:col-span-5 rounded-3xl bg-card border border-border shadow-xs overflow-hidden max-h-[720px] flex flex-col">
          <div className="p-3.5 bg-muted/50 border-b border-border text-xs font-bold text-muted-foreground flex items-center justify-between">
            <span>Applications Queue ({leaves.length})</span>
            <span>Select to review</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {leaves.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No Applications in Queue"
                description="No leave applications match the selected status filter."
              />
            ) : (
              leaves.map((l) => {
                const isSelected = activeLeave?.id === l.id;
                return (
                  <div
                    key={l.id}
                    onClick={() => {
                      setSelectedLeaveId(l.id);
                      setActionError(null);
                      setDecisionComment('');
                    }}
                    className={`p-4 transition-colors cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-l-primary'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-foreground">
                          {l.studentName}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground ml-2">
                          ({l.rollNo})
                        </span>
                      </div>
                      <StatusBadge
                        status={
                          l.status === 'approved'
                            ? 'active'
                            : l.status === 'rejected'
                            ? 'error'
                            : 'pending'
                        }
                        label={l.status.toUpperCase()}
                      />
                    </div>

                    <p className="text-xs text-foreground/90 font-medium line-clamp-1">
                      {l.leaveType} • {l.daysCount} Day{l.daysCount === 1 ? '' : 's'}
                    </p>

                    <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                      "{l.reason}"
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] font-semibold text-muted-foreground">
                      <span>{l.startDate} &rarr; {l.endDate}</span>
                      {l.isAttendanceRisk && (
                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                          Attendance &lt; 75%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Application Review & Decision Workspace */}
        <div className="lg:col-span-7">
          {activeLeave ? (
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Application ID: {activeLeave.id}
                  </span>
                  <h2 className="text-xl font-bold text-foreground mt-1">
                    {activeLeave.leaveType}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Submitted on {new Date(activeLeave.submittedAt).toLocaleDateString()} by{' '}
                    <span className="font-bold text-foreground">{activeLeave.studentName}</span> ({activeLeave.rollNo})
                  </p>
                </div>
                <StatusBadge
                  status={
                    activeLeave.status === 'approved'
                      ? 'active'
                      : activeLeave.status === 'rejected'
                      ? 'error'
                      : 'pending'
                  }
                  label={activeLeave.status.toUpperCase()}
                />
              </div>

              {/* Attendance Impact Warning Card */}
              <div
                className={`p-4 rounded-2xl border ${
                  activeLeave.isAttendanceRisk
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-primary/5 border-primary/20'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  {activeLeave.isAttendanceRisk ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  ) : (
                    <CalendarClock className="w-4 h-4 text-primary shrink-0" />
                  )}
                  <span
                    className={
                      activeLeave.isAttendanceRisk
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-primary'
                    }
                  >
                    Attendance Impact Analysis
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase">Current Attendance</span>
                    <p
                      className={`text-lg font-black font-mono ${
                        activeLeave.currentAttendancePercent < 75
                          ? 'text-rose-600'
                          : 'text-foreground'
                      }`}
                    >
                      {activeLeave.currentAttendancePercent}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase">Projected After Leave</span>
                    <p
                      className={`text-lg font-black font-mono ${
                        activeLeave.projectedAttendancePercent < 75
                          ? 'text-rose-600'
                          : 'text-foreground'
                      }`}
                    >
                      {activeLeave.projectedAttendancePercent}%
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-muted-foreground text-[10px] uppercase">Threshold Clearance</span>
                    <p className="text-xs font-bold mt-1 text-foreground">
                      {activeLeave.projectedAttendancePercent >= 75 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Cleared (&ge; 75%)
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Shortage Warning
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Leave Reason & Details */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Documented Reason from Student
                </span>
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs text-foreground leading-relaxed">
                  {activeLeave.reason}
                </div>
              </div>

              {/* Attachment Preview */}
              {activeLeave.attachmentName && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Supporting Verification Document
                  </span>
                  <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">
                        {activeLeave.attachmentName}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-muted text-xs font-bold text-foreground">
                      Verified Attachment
                    </span>
                  </div>
                </div>
              )}

              {/* If already resolved, show decision comment */}
              {activeLeave.decisionComment && (
                <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    Decision Audit Comment
                  </span>
                  <p className="text-xs font-semibold text-foreground">
                    "{activeLeave.decisionComment}"
                  </p>
                </div>
              )}

              {/* Action Form (Only active if not resolved) */}
              {activeLeave.status !== 'approved' && activeLeave.status !== 'rejected' && (
                <div className="space-y-3 pt-3 border-t border-border/60">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>
                      Decision Comment <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-normal">
                      Mandatory per state machine RPC
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter decision rationale or instructions for attendance recovery (required for approval/rejection)..."
                    value={decisionComment}
                    onChange={(e) => {
                      setDecisionComment(e.target.value);
                      setActionError(null);
                    }}
                    className="w-full p-3 rounded-xl bg-muted/40 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                  />

                  {actionError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-semibold">
                      {actionError}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => handleDecision('clarification_requested')}
                      disabled={transitionMutation.isPending}
                      className="px-4 py-2 rounded-xl border border-border/80 text-xs font-bold text-foreground hover:bg-muted transition-colors"
                    >
                      Request Clarification
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision('rejected')}
                      disabled={transitionMutation.isPending}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      Reject Application
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision('approved')}
                      disabled={transitionMutation.isPending}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all hover:scale-[1.02]"
                    >
                      {transitionMutation.isPending ? 'Committing...' : 'Approve Application'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="Select a Leave Application"
              description="Choose an application from the queue to review student reasons and attendance impact."
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function FacultyLeaveApprovalsSplitPane() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <FacultyLeaveApprovalsContent />
    </React.Suspense>
  );
}
