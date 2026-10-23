'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  StudentService,
  type FeeItemDetails,
} from '@/lib/services/student-service';
import { formatMinorUnits } from '@/lib/calculations';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building,
  Printer,
  FileDown,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function StudentFeesPage() {
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const {
    data: feeLedger,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['student-fee-ledger'],
    queryFn: () => StudentService.getFeeLedger(),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="student-fees-loading">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !feeLedger) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not load fee ledger"
          message={error instanceof Error ? error.message : 'Failed to retrieve official financial records.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const { balanceMetrics, breakdown } = feeLedger;

  return (
    <div className="space-y-6" data-testid="student-fees">
      {/* Header */}
      <PageHeader
        title="Fee Ledger & Official Receipts"
        description="Official institutional fee statement, waivers, verified ledger credits, and receipts"
        badge={<StatusBadge label="Finance Admin Audited" variant="info" size="sm" />}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)] font-mono">
              Due: {new Date(feeLedger.dueDate).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        }
      />

      {/* Top Ledger Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Outstanding Balance */}
        <StatCard
          title="Outstanding Balance"
          value={formatMinorUnits(balanceMetrics.outstandingBalanceMinorUnits)}
          subtext={
            balanceMetrics.isFullyPaid
              ? 'All assessed dues cleared'
              : `Payable on or before ${new Date(feeLedger.dueDate).toLocaleDateString()}`
          }
          icon={CreditCard}
          delta={{
            value: balanceMetrics.isFullyPaid ? 'Cleared' : 'Pending',
            isPositive: balanceMetrics.isFullyPaid,
          }}
        />

        {/* Total Concession / Waiver */}
        <StatCard
          title="Concession / Waiver"
          value={formatMinorUnits(balanceMetrics.concessionMinorUnits)}
          subtext="Merit Scholarship Concession"
          icon={ShieldCheck}
          delta={{
            value: 'Approved',
            isPositive: true,
          }}
        />

        {/* Verified Paid Amount */}
        <StatCard
          title="Verified Credits Paid"
          value={formatMinorUnits(balanceMetrics.verifiedPaidMinorUnits)}
          subtext="Reconciled by Finance Desk"
          icon={CheckCircle2}
          delta={{
            value: '1 Verified',
            isPositive: true,
          }}
        />
      </div>

      {/* Itemized Fee Structure Breakdown */}
      <div className="p-5 md:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">
              {feeLedger.structureName}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {feeLedger.programmeName} • Semester {feeLedger.semesterNumber} • Session {feeLedger.academicYear}
            </p>
          </div>
          <StatusBadge label="Assigned Fee Schedule" variant="info" size="sm" />
        </div>

        {/* Table of items */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--surface-2)]/60 text-[var(--text-muted)] border-b border-[var(--border)] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Fee Component</th>
                <th className="py-2.5 px-3">Account Head</th>
                <th className="py-2.5 px-3 text-right">Assigned Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              <tr>
                <td className="py-3 px-3 font-semibold text-[var(--text)]">Tuition & Faculty Instruction Fee</td>
                <td className="py-3 px-3 font-mono text-[var(--text-muted)]">AC-TUI-01</td>
                <td className="py-3 px-3 text-right font-mono font-bold text-[var(--text)]">
                  {formatMinorUnits(breakdown.tuitionFeeMinorUnits)}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-[var(--text)]">Computing & Hardware Lab Infrastructure</td>
                <td className="py-3 px-3 font-mono text-[var(--text-muted)]">AC-LAB-02</td>
                <td className="py-3 px-3 text-right font-mono font-bold text-[var(--text)]">
                  {formatMinorUnits(breakdown.labFeeMinorUnits)}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-[var(--text)]">Digital Library & Journal Subscriptions</td>
                <td className="py-3 px-3 font-mono text-[var(--text-muted)]">AC-LIB-03</td>
                <td className="py-3 px-3 text-right font-mono font-bold text-[var(--text)]">
                  {formatMinorUnits(breakdown.libraryFeeMinorUnits)}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-[var(--text)]">End-Term Examination Fee</td>
                <td className="py-3 px-3 font-mono text-[var(--text-muted)]">AC-EXAM-04</td>
                <td className="py-3 px-3 text-right font-mono font-bold text-[var(--text)]">
                  {formatMinorUnits(breakdown.examFeeMinorUnits)}
                </td>
              </tr>

              {/* Total Assigned */}
              <tr className="bg-[var(--surface-2)]/30 font-bold border-t border-[var(--border)]">
                <td colSpan={2} className="py-2.5 px-3 text-[var(--text)]">
                  Total Gross Assessed Amount
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[var(--text)]">
                  {formatMinorUnits(feeLedger.assignedAmountMinorUnits)}
                </td>
              </tr>

              {/* Concession */}
              <tr className="text-emerald-600 dark:text-emerald-400 font-bold">
                <td colSpan={2} className="py-2.5 px-3">
                  Less: Merit Scholarship Concession
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  -{formatMinorUnits(balanceMetrics.concessionMinorUnits)}
                </td>
              </tr>

              {/* Net Payable */}
              <tr className="bg-[var(--surface-2)]/80 text-sm font-black border-t-2 border-[var(--border)]">
                <td colSpan={2} className="py-3 px-3 text-[var(--text)]">
                  Net Payable Amount
                </td>
                <td className="py-3 px-3 text-right font-mono text-[var(--accent)]">
                  {formatMinorUnits(balanceMetrics.netPayableMinorUnits)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Verified Payment History & Receipts */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">
              Verified Payment History Ledger
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Reconciled transactions recorded by the Institutional Finance Accounts Office
            </p>
          </div>
          <StatusBadge label="Read-Only Ledger" variant="neutral" size="sm" />
        </div>

        {feeLedger.payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payment records"
            description="No transactions have been recorded on this fee account yet."
            className="py-12 border-none"
          />
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--surface-2)]/60 text-[var(--text-muted)] border-b border-[var(--border)] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Receipt No.</th>
                  <th className="py-3 px-4">Transaction / Gateway Ref</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Verified Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-medium">
                {feeLedger.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--surface-2)]/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-[var(--accent)]">
                      {p.receiptNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                      {p.gatewayReference}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[var(--text)]">
                      {p.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[var(--text-muted)]">
                      {p.verifiedAt ? new Date(p.verifiedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge label="Verified" variant="success" size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[var(--text)]">
                      {formatMinorUnits(p.amountMinorUnits)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(p)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)] hover:underline cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Institutional Payment Advisory Box */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-[var(--text)]">Official Payment Instructions & Policy</h4>
          <p className="text-[var(--text-muted)] leading-relaxed">
            All semester payments must be remitted strictly via the Institute Official NetBanking / UPI Gateway or by Demand Draft deposited at the Finance Office. Students cannot mark invoices paid directly. Payments reflect in the ledger within 24 to 48 hours following bank reconciliation.
          </p>
        </div>
      </div>

      {/* Official Receipt Dialog */}
      <Dialog
        isOpen={selectedReceipt !== null}
        onClose={() => setSelectedReceipt(null)}
        title="Official Payment Receipt"
        description="Metropolitan Institute of Technology — Finance & Accounts Desk"
        maxWidth="md"
      >
        {selectedReceipt && (
          <div className="space-y-4 p-2 text-xs">
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span className="text-[var(--text-muted)]">Receipt Number:</span>
                <span className="font-mono text-[var(--text)]">{selectedReceipt.receiptNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Transaction Reference:</span>
                <span className="font-mono text-[var(--text)]">{selectedReceipt.gatewayReference}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Payment Mode:</span>
                <span className="font-semibold text-[var(--text)]">{selectedReceipt.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Verified On:</span>
                <span className="font-mono text-[var(--text)]">
                  {new Date(selectedReceipt.verifiedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] font-bold text-sm">
                <span>Total Amount Paid:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatMinorUnits(selectedReceipt.amountMinorUnits)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--accent-fg)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
