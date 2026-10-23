'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AdminService,
  type AdminFeeStructure,
  type AdminStudentFeeAssignment,
  type FinanceCollectionAnalytics,
} from '@/lib/services/admin-service';
import { formatMinorUnits } from '@/lib/calculations';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabList, TabTrigger, TabContent } from '@/components/ui/tabs';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle,
  Receipt,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default function FeesFinancialsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'assignments' | 'structures' | 'analytics'>('assignments');
  const [search, setSearch] = useState('');
  const [agingFilter, setAgingFilter] = useState('all');

  // Concession Modal
  const [isConcessionOpen, setIsConcessionOpen] = useState(false);
  const [targetAssignment, setTargetAssignment] = useState<AdminStudentFeeAssignment | null>(null);
  const [concessionAmountRs, setConcessionAmountRs] = useState<number>(0);
  const [concessionReason, setConcessionReason] = useState('');
  const [concessionError, setConcessionError] = useState<string | null>(null);

  // Record Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmountRs, setPaymentAmountRs] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'NetBanking' | 'Challan' | 'DD' | 'Cash'>('UPI');
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  // Queries
  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['admin-finance-analytics'],
    queryFn: () => AdminService.getFinanceAnalytics(),
  });

  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['admin-fee-assignments', agingFilter, search],
    queryFn: () =>
      AdminService.getStudentFeeAssignments({
        agingBucket: agingFilter,
        search,
      }),
  });

  const { data: structures, isLoading: loadingStructures } = useQuery({
    queryKey: ['admin-fee-structures'],
    queryFn: () => AdminService.getFeeStructures(),
  });

  // Apply Concession Mutation
  const concessionMutation = useMutation({
    mutationFn: ({ id, minorUnits, reason }: { id: string; minorUnits: number; reason: string }) =>
      AdminService.applyFeeConcession(id, minorUnits, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fee-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-finance-analytics'] });
      setIsConcessionOpen(false);
      setTargetAssignment(null);
      setConcessionAmountRs(0);
      setConcessionReason('');
      setConcessionError(null);
    },
    onError: (err: Error) => {
      setConcessionError(err.message || 'Failed to apply concession.');
    },
  });

  // Record Payment Mutation
  const paymentMutation = useMutation({
    mutationFn: ({ id, minorUnits, method }: { id: string; minorUnits: number; method: 'UPI' | 'NetBanking' | 'Challan' | 'DD' | 'Cash' }) => {
      const idempotencyKey = `idem-${id}-${Date.now().toString(36)}`;
      return AdminService.recordFeePayment(id, minorUnits, method, idempotencyKey);
    },
    onSuccess: (receipt) => {
      queryClient.invalidateQueries({ queryKey: ['admin-fee-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-finance-analytics'] });
      setIsPaymentOpen(false);
      setPaymentSuccessMsg(`Payment of ${formatMinorUnits(receipt.amountMinorUnits)} successfully recorded (Ref: ${receipt.transactionReference}).`);
    },
  });

  const handleOpenConcession = (assignment: AdminStudentFeeAssignment) => {
    setTargetAssignment(assignment);
    setConcessionAmountRs(assignment.concessionMinor / 100);
    setConcessionReason(assignment.concessionReason || '');
    setConcessionError(null);
    setIsConcessionOpen(true);
  };

  const handleOpenPayment = (assignment: AdminStudentFeeAssignment) => {
    setTargetAssignment(assignment);
    setPaymentAmountRs(assignment.outstandingMinor / 100);
    setIsPaymentOpen(true);
  };

  const handleConcessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAssignment) return;
    const minorUnits = Math.round(concessionAmountRs * 100);
    concessionMutation.mutate({
      id: targetAssignment.id,
      minorUnits,
      reason: concessionReason,
    });
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAssignment) return;
    const minorUnits = Math.round(paymentAmountRs * 100);
    paymentMutation.mutate({
      id: targetAssignment.id,
      minorUnits,
      method: paymentMethod,
    });
  };

  const isLoading = loadingAnalytics || loadingAssignments || loadingStructures;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Command Center & Fee Ledger"
        description="Server-controlled double-entry fee structures, verified payment reconciliations, and aging overdue balances."
      />

      {paymentSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{paymentSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setPaymentSuccessMsg(null)}
            className="text-[10px] uppercase font-extrabold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. FINANCIAL ANALYTICS BANNER */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Total Net Revenue
            </span>
            <div className="text-2xl font-black text-[var(--text)] mt-1 tabular-nums">
              {formatMinorUnits(analytics.totalAssignedMinor)}
            </div>
            <span className="text-[11px] text-[var(--text-muted)] font-semibold block mt-1">
              Active semester fee billings
            </span>
          </div>

          <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
              Verified Collected
            </span>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
              {formatMinorUnits(analytics.totalCollectedMinor)}
            </div>
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block mt-1">
              {analytics.collectionRatePercent}% Collection Rate
            </span>
          </div>

          <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 block">
              Total Outstanding
            </span>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1 tabular-nums">
              {formatMinorUnits(analytics.totalOutstandingMinor)}
            </div>
            <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 block mt-1">
              Unsettled student ledgers
            </span>
          </div>

          {/* Aging Breakdown Tile */}
          <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Overdue Aging Buckets
            </span>
            <div className="grid grid-cols-3 gap-1 py-1 text-center">
              <div className="rounded bg-[var(--surface-2)] p-1">
                <span className="text-[9px] font-bold text-[var(--text-muted)] block">&lt;30d</span>
                <span className="text-[11px] font-extrabold text-[var(--text)] tabular-nums">
                  {formatMinorUnits(analytics.agingBreakdown.lessThan30dMinor)}
                </span>
              </div>
              <div className="rounded bg-amber-50 dark:bg-amber-950/30 p-1">
                <span className="text-[9px] font-bold text-amber-800 dark:text-amber-300 block">30-60d</span>
                <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
                  {formatMinorUnits(analytics.agingBreakdown.thirtyToSixtyMinor)}
                </span>
              </div>
              <div className="rounded bg-rose-50 dark:bg-rose-950/30 p-1">
                <span className="text-[9px] font-bold text-rose-800 dark:text-rose-300 block">&gt;60d</span>
                <span className="text-[11px] font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">
                  {formatMinorUnits(analytics.agingBreakdown.moreThanSixtyMinor)}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">Integer minor-units double-entry precision</span>
          </div>
        </div>
      )}

      {/* 2. MAIN WORKSPACE TABS */}
      <Tabs defaultValue="assignments" value={activeTab} onValueChange={(v) => setActiveTab(v as 'assignments' | 'structures' | 'analytics')}>
        <TabList className="mb-4">
          <TabTrigger value="assignments">
            <CreditCard className="w-4 h-4 mr-1.5" />
            <span>Student Fee Ledgers ({assignments?.length || 0})</span>
          </TabTrigger>
          <TabTrigger value="structures">
            <Layers className="w-4 h-4 mr-1.5" />
            <span>Fee Structures ({structures?.length || 0})</span>
          </TabTrigger>
        </TabList>

        {/* LEDGER TAB */}
        <TabContent value="assignments">
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm flex items-center justify-between gap-3 flex-wrap">
              <div className="relative w-72">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter student ledgers..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text)]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-muted)]">Aging Filter:</span>
                <select
                  value={agingFilter}
                  onChange={(e) => setAgingFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] font-semibold"
                >
                  <option value="all">All Aging Buckets</option>
                  <option value="Current">Current / On Time</option>
                  <option value="<30d">&lt;30 Days Overdue</option>
                  <option value="30-60d">30 to 60 Days Overdue</option>
                  <option value=">60d">&gt;60 Days Overdue</option>
                </select>
              </div>
            </div>

            {/* Assignments Table */}
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] uppercase text-[10px] font-extrabold tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Assigned Fee</th>
                    <th className="py-3 px-4">Scholarship / Waiver</th>
                    <th className="py-3 px-4">Net Payable</th>
                    <th className="py-3 px-4">Verified Paid</th>
                    <th className="py-3 px-4">Outstanding</th>
                    <th className="py-3 px-4">Aging Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {assignments?.map((a) => (
                    <tr key={a.id} className="hover:bg-[var(--surface-2)] transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-[var(--text)] block">{a.studentName}</span>
                        <span className="font-mono text-[11px] text-[var(--accent)] font-semibold">
                          {a.studentCode} • {a.departmentCode} Sem {a.semester}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-[var(--text-muted)]">
                        {formatMinorUnits(a.assignedFeeMinor)}
                      </td>
                      <td className="py-3 px-4">
                        {a.concessionMinor > 0 ? (
                          <div>
                            <span className="font-mono font-bold text-emerald-600 block">
                              -{formatMinorUnits(a.concessionMinor)}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] block truncate max-w-xs">
                              {a.concessionReason}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold text-[var(--text)]">
                        {formatMinorUnits(a.netPayableMinor)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                        {formatMinorUnits(a.verifiedPaidMinor)}
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold text-rose-600">
                        {formatMinorUnits(a.outstandingMinor)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          status={a.isFullyPaid ? 'success' : a.agingBucket === 'Current' ? 'info' : 'danger'}
                          label={a.isFullyPaid ? 'Settled' : a.agingBucket}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenConcession(a)}
                            className="px-2 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                          >
                            Waiver
                          </button>
                          {!a.isFullyPaid && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(a)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            >
                              Collect
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabContent>

        {/* STRUCTURES TAB */}
        <TabContent value="structures">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {structures?.map((s) => (
              <div key={s.id} className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-extrabold text-[var(--text)]">{s.name}</h4>
                  <span className="text-xs font-mono font-bold text-[var(--accent)] px-2 py-0.5 rounded bg-[var(--accent-soft)]">
                    {s.academicYear}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs py-3 border-y border-[var(--border)] my-3">
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Tuition Fee</span>
                    <span className="font-mono font-bold text-[var(--text)]">{formatMinorUnits(s.tuitionFeeMinor)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Development Fee</span>
                    <span className="font-mono font-bold text-[var(--text)]">{formatMinorUnits(s.devFeeMinor)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Laboratory Fee</span>
                    <span className="font-mono font-bold text-[var(--text)]">{formatMinorUnits(s.labFeeMinor)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Examination Fee</span>
                    <span className="font-mono font-bold text-[var(--text)]">{formatMinorUnits(s.examFeeMinor)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-muted)]">
                    <span>Library & IT Fee</span>
                    <span className="font-mono font-bold text-[var(--text)]">{formatMinorUnits(s.libraryFeeMinor)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--text-muted)]">Total Assessment</span>
                  <span className="text-base font-extrabold font-mono text-[var(--accent)]">
                    {formatMinorUnits(s.totalFeeMinor)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TabContent>
      </Tabs>

      {/* CONCESSION / SCHOLARSHIP WAIVER MODAL */}
      {isConcessionOpen && targetAssignment && (
        <Dialog
          isOpen={true}
          onClose={() => setIsConcessionOpen(false)}
          title={`Apply Fee Waiver / Scholarship: ${targetAssignment.studentName}`}
          description="Enforces double-entry ledger calculation. Concession cannot exceed total assigned fee."
        >
          <form onSubmit={handleConcessionSubmit} className="space-y-4">
            {concessionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-bold">
                {concessionError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-[var(--surface-2)] text-xs flex justify-between">
              <span className="text-[var(--text-muted)]">Assigned Fee Base:</span>
              <span className="font-mono font-extrabold text-[var(--text)]">
                {formatMinorUnits(targetAssignment.assignedFeeMinor)}
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Concession Amount (₹) *
              </label>
              <input
                type="number"
                min={0}
                max={targetAssignment.assignedFeeMinor / 100}
                step="1"
                required
                value={concessionAmountRs}
                onChange={(e) => setConcessionAmountRs(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-mono font-bold text-[var(--text)]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Scholarship / Waiver Justification *
              </label>
              <textarea
                rows={3}
                required
                value={concessionReason}
                onChange={(e) => setConcessionReason(e.target.value)}
                placeholder="e.g. Merit Concession 10% approved by Academic Council"
                className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsConcessionOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={concessionMutation.isPending}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {concessionMutation.isPending ? 'Updating Ledger...' : 'Commit Waiver'}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {/* RECORD OFFLINE PAYMENT MODAL */}
      {isPaymentOpen && targetAssignment && (
        <Dialog
          isOpen={true}
          onClose={() => setIsPaymentOpen(false)}
          title={`Record Payment: ${targetAssignment.studentName}`}
          description="Issues a verified payment entry with integer-minor double-entry balancing and idempotency."
        >
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-[var(--surface-2)] text-xs flex justify-between">
              <span className="text-[var(--text-muted)]">Outstanding Balance:</span>
              <span className="font-mono font-extrabold text-rose-600">
                {formatMinorUnits(targetAssignment.outstandingMinor)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[var(--text)] block mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  min={1}
                  step="1"
                  required
                  value={paymentAmountRs}
                  onChange={(e) => setPaymentAmountRs(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text)] block mb-1">
                  Payment Mode *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'UPI' | 'NetBanking' | 'Challan' | 'DD' | 'Cash')}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs"
                >
                  <option value="UPI">UPI / QR</option>
                  <option value="NetBanking">Net Banking</option>
                  <option value="Challan">Bank Challan</option>
                  <option value="DD">Demand Draft</option>
                  <option value="Cash">Cash Receipt</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paymentMutation.isPending}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {paymentMutation.isPending ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
