'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AdminService,
  type UnifiedApprovalItem,
} from '@/lib/services/admin-service';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  CheckSquare,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  User,
  Building,
  FileText,
  ExternalLink,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';

export default function ApprovalsQueuePage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Bulk action modal
  const [bulkActionType, setBulkActionType] = useState<'approve' | 'reject' | null>(null);
  const [bulkComment, setBulkComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Single item review modal
  const [activeItem, setActiveItem] = useState<UnifiedApprovalItem | null>(null);
  const [singleComment, setSingleComment] = useState('');

  // Fetch approvals
  const {
    data: approvals,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-unified-approvals', categoryFilter, urgencyFilter, statusFilter, search],
    queryFn: () =>
      AdminService.getUnifiedApprovals({
        category: categoryFilter,
        urgency: urgencyFilter,
        status: statusFilter,
        search,
      }),
  });

  // Single Action Mutation
  const singleActionMutation = useMutation({
    mutationFn: ({ id, action, comment }: { id: string; action: 'approve' | 'reject'; comment: string }) =>
      AdminService.actionApproval(id, action, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-unified-approvals'] });
      setActiveItem(null);
      setSingleComment('');
      setActionError(null);
    },
    onError: (err: Error) => {
      setActionError(err.message || 'Action failed.');
    },
  });

  // Bulk Action Mutation
  const bulkActionMutation = useMutation({
    mutationFn: ({ ids, action, comment }: { ids: string[]; action: 'approve' | 'reject'; comment: string }) =>
      AdminService.bulkActionApprovals(ids, action, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-unified-approvals'] });
      setSelectedIds([]);
      setBulkActionType(null);
      setBulkComment('');
      setActionError(null);
    },
    onError: (err: Error) => {
      setActionError(err.message || 'Bulk action failed.');
    },
  });

  const handleSelectAll = () => {
    if (!approvals) return;
    if (selectedIds.length === approvals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(approvals.map((a) => a.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkActionType) return;
    if (!bulkComment.trim()) {
      setActionError('Decision comment is mandatory for administrative audit records.');
      return;
    }
    bulkActionMutation.mutate({
      ids: selectedIds,
      action: bulkActionType,
      comment: bulkComment,
    });
  };

  const handleSingleSubmit = (action: 'approve' | 'reject') => {
    if (!activeItem) return;
    if (!singleComment.trim()) {
      setActionError('Decision comment is mandatory for administrative audit records.');
      return;
    }
    singleActionMutation.mutate({
      id: activeItem.id,
      action,
      comment: singleComment,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !approvals) {
    return (
      <ErrorState
        title="Failed to Load Approvals Queue"
        message="Could not load unified administrative approvals."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unified Administrative Approvals Queue"
        description="Consolidated review for student leaves, bonafide certificates, fee concessions, and doubt escalations."
      />

      {/* FILTER CONTROLS & SAVED FILTERS */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search applicant or keyword..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold"
            >
              <option value="all">All Request Categories</option>
              <option value="leave">Student Leave Requests</option>
              <option value="service_certificate">Service Certificates</option>
              <option value="fee_concession">Fee Concessions</option>
            </select>

            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold"
            >
              <option value="all">All Urgency Levels</option>
              <option value="urgent">Urgent / Attendance Risk</option>
              <option value="normal">Normal Priority</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold"
            >
              <option value="pending">Pending Action</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Statuses</option>
            </select>
          </div>
        </div>

        {/* Saved Filter Shortcuts */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)] text-xs">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Saved Filters:
          </span>
          <button
            type="button"
            onClick={() => {
              setUrgencyFilter('urgent');
              setStatusFilter('pending');
              setCategoryFilter('all');
            }}
            className="px-2 py-0.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 font-bold"
          >
            Urgent Leaves & Risks
          </button>
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('service_certificate');
              setStatusFilter('pending');
              setUrgencyFilter('all');
            }}
            className="px-2 py-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-semibold"
          >
            Certificates Only
          </button>
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('fee_concession');
              setStatusFilter('pending');
              setUrgencyFilter('all');
            }}
            className="px-2 py-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] font-semibold"
          >
            Fee Concessions
          </button>
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="p-3 px-4 rounded-xl bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 font-extrabold">
            <CheckSquare className="w-4 h-4 text-indigo-600" />
            <span>{selectedIds.length} item(s) selected for bulk review</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setBulkActionType('reject');
                setActionError(null);
              }}
              className="px-3 py-1.5 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
            >
              Reject Selected
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkActionType('approve');
                setActionError(null);
              }}
              className="px-3 py-1.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Approve Selected
            </button>
          </div>
        </div>
      )}

      {/* APPROVALS LIST */}
      {approvals.length === 0 ? (
        <EmptyState
          title="Approval Queue Clear"
          description="There are no pending requests matching your current filter settings."
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2 text-xs font-semibold text-[var(--text-muted)]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === approvals.length && approvals.length > 0}
                onChange={handleSelectAll}
                className="rounded border-[var(--border)] text-[var(--accent)]"
              />
              <span>Select All In Queue</span>
            </label>
            <span>Showing {approvals.length} item(s)</span>
          </div>

          {approvals.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => handleToggleSelect(item.id)}
                  className="rounded border-[var(--border)] text-[var(--accent)] mt-1"
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                        item.urgency === 'urgent'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                      }`}
                    >
                      {item.category.replace('_', ' ')}
                    </span>
                    {item.urgency === 'urgent' && (
                      <span className="text-[10px] font-extrabold text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Urgent Attention
                      </span>
                    )}
                    <StatusBadge
                      status={
                        item.status === 'approved'
                          ? 'success'
                          : item.status === 'rejected'
                          ? 'danger'
                          : 'warning'
                      }
                      label={item.status}
                    />
                  </div>

                  <h4 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                    {item.title}
                  </h4>

                  <p className="text-xs text-[var(--text-muted)] line-clamp-1 max-w-xl">
                    {item.details}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] pt-1">
                    <span className="font-semibold text-[var(--text)]">{item.applicantName} ({item.applicantCode})</span>
                    <span>•</span>
                    <span>Dept: {item.department}</span>
                    <span>•</span>
                    <span>{new Date(item.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveItem(item);
                    setSingleComment('');
                    setActionError(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--accent)] transition-all cursor-pointer"
                >
                  Inspect & Decide
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SINGLE ITEM REVIEW DIALOG */}
      {activeItem && (
        <Dialog
          isOpen={true}
          onClose={() => setActiveItem(null)}
          title={`Review Request: ${activeItem.title}`}
          description={`Submitted by ${activeItem.applicantName} (${activeItem.applicantCode})`}
          className="max-w-xl"
        >
          <div className="space-y-4">
            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">
                {actionError}
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-[var(--surface-2)] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Applicant:</span>
                <span className="font-bold text-[var(--text)]">{activeItem.applicantName} ({activeItem.applicantCode})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Department & Role:</span>
                <span className="font-bold text-[var(--text)]">{activeItem.department} • {activeItem.applicantRole}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Urgency:</span>
                <span className="font-bold uppercase text-rose-600">{activeItem.urgency}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-[var(--text)] block mb-1">Request Details</span>
              <p className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] leading-relaxed">
                {activeItem.details}
              </p>
            </div>

            {activeItem.attachmentUrl && (
              <div>
                <a
                  href={activeItem.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  <span>Inspect Supporting Document Attachment</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Administrative Decision Comment *
              </label>
              <textarea
                rows={3}
                required
                value={singleComment}
                onChange={(e) => setSingleComment(e.target.value)}
                placeholder="Enter justification rationale for institutional audit trail..."
                className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>

            <div className="pt-3 flex justify-between gap-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-muted)]"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={singleActionMutation.isPending}
                  onClick={() => handleSingleSubmit('reject')}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700"
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  disabled={singleActionMutation.isPending}
                  onClick={() => handleSingleSubmit('approve')}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Approve Request
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* BULK ACTION CONFIRMATION DIALOG */}
      {bulkActionType && (
        <Dialog
          isOpen={true}
          onClose={() => setBulkActionType(null)}
          title={`Bulk ${bulkActionType === 'approve' ? 'Approve' : 'Reject'} (${selectedIds.length} Requests)`}
          description="Applies a unified administrative decision comment across all selected items."
        >
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold">
                {actionError}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Batch Justification Comment *
              </label>
              <textarea
                rows={3}
                required
                value={bulkComment}
                onChange={(e) => setBulkComment(e.target.value)}
                placeholder="State reason for bulk action (mandatory for audit compliance)..."
                className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setBulkActionType(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bulkActionMutation.isPending}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white ${
                  bulkActionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {bulkActionMutation.isPending
                  ? 'Processing...'
                  : `Confirm Bulk ${bulkActionType === 'approve' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
