'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import {
  CreditCard,
  ArrowLeft,
  CheckCircle,
  Clock,
  Sparkles,
  Loader2,
  DollarSign,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

// Detailed Mock Fee Invoices & Transactions
const mockFees = [
  {
    id: 'fee-sem6',
    academic_year: 'B.Tech CSE - Semester 6',
    due_date: '2026-06-30',
    tuition_fee: 85000,
    exam_fee: 2500,
    library_fee: 1500,
    other_fee: 1000,
    payments: [] as any[],
  },
  {
    id: 'fee-sem5',
    academic_year: 'B.Tech CSE - Semester 5',
    due_date: '2025-12-15',
    tuition_fee: 85000,
    exam_fee: 2500,
    library_fee: 1500,
    other_fee: 1000,
    payments: [
      {
        id: 'pay-sem5',
        amount_paid: 90000,
        payment_method: 'Net Banking',
        transaction_id: 'TXN_9082348572',
        status: 'Success',
        paid_at: '2025-12-12T10:30:00Z',
      },
    ],
  },
  {
    id: 'fee-sem4',
    academic_year: 'B.Tech CSE - Semester 4',
    due_date: '2025-06-15',
    tuition_fee: 80000,
    exam_fee: 2000,
    library_fee: 1000,
    other_fee: 1000,
    payments: [
      {
        id: 'pay-sem4',
        amount_paid: 84000,
        payment_method: 'UPI',
        transaction_id: 'TXN_4829304859',
        status: 'Success',
        paid_at: '2025-06-12T14:15:00Z',
      },
    ],
  },
];

export default function FeesPage() {
  const { student } = useAppStore();
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paying, setPaying] = useState(false);

  // Local state to simulate payments locally
  const [localPayments, setLocalPayments] = useState<Record<string, any[]>>({});

  // Load local payments on mount
  useEffect(() => {
    const saved = localStorage.getItem('local_fee_payments');
    if (saved) {
      try {
        setLocalPayments(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse local payments:', e);
      }
    }
  }, []);

  const displayFees = useMemo(() => {
    const baseFees = mockFees;
    return baseFees.map((fee: any) => {
      const extra = localPayments[fee.id] || [];
      return {
        ...fee,
        payments: [...(fee.payments || []), ...extra],
      };
    });
  }, [localPayments]);

  // Calculate stats with correct numeric conversion to prevent string concatenation bugs
  const totals = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pendingFeeId: string | null = null;

    displayFees.forEach((fee: any) => {
      const tuition = Number(fee.tuition_fee) || 0;
      const exam = Number(fee.exam_fee) || 0;
      const library = Number(fee.library_fee) || 0;
      const other = Number(fee.other_fee) || 0;
      const feeSum = tuition + exam + library + other;
      total += feeSum;

      const paymentsSum = fee.payments
        ?.filter((p: any) => p.status === 'Success')
        .reduce((sum: number, p: any) => sum + (Number(p.amount_paid) || 0), 0) || 0;

      paid += paymentsSum;

      if (feeSum - paymentsSum > 0 && !pendingFeeId) {
        pendingFeeId = fee.id;
      }
    });

    const pending = Math.max(0, total - paid);
    return { total, paid, pending, pendingFeeId };
  }, [displayFees]);

  // Transaction history
  const transactionHistory = useMemo(() => {
    const txs: any[] = [];
    displayFees.forEach((fee: any) => {
      fee.payments?.forEach((p: any) => {
        txs.push({
          ...p,
          amount_paid: Number(p.amount_paid) || 0,
          feeDescription: fee.academic_year,
        });
      });
    });
    return txs.sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
  }, [displayFees]);

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totals.pendingFeeId) return;

    setPaying(true);
    const targetFeeId = totals.pendingFeeId;
    const amount = totals.pending;
    const paymentTxId = `TXN_${Math.floor(Math.random() * 9000000000) + 1000000000}`;

    // Fallback to LocalStorage persistence (for offline dev sandbox)
    setTimeout(() => {
      const newPay = {
        id: `local-pay-${Date.now()}`,
        amount_paid: amount,
        payment_method: paymentMethod,
        transaction_id: paymentTxId,
        status: 'Success',
        paid_at: new Date().toISOString(),
      };

      const updated = {
        ...localPayments,
        [targetFeeId]: [...(localPayments[targetFeeId] || []), newPay],
      };

      setLocalPayments(updated);
      localStorage.setItem('local_fee_payments', JSON.stringify(updated));

      setPayModalOpen(false);
      setPaying(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Fee & Payment Ledger</h2>
          <p className="text-slate-600 text-xs mt-1">Review academic invoices, transactions history, and settle outstanding balances.</p>
        </div>
        {totals.pending > 0 && (
          <button
            onClick={() => setPayModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow shadow-indigo-650/10 shrink-0 self-start sm:self-auto"
          >
            <CreditCard className="w-4.5 h-4.5 text-indigo-200" /> Settle Due (₹{totals.pending.toLocaleString()})
          </button>
        )}
      </div>

      {/* Stats Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-slideUp">
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-wider block">Total Billed Fees</span>
            <span className="text-xl font-bold text-slate-800 block">₹{totals.total.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-wider block">Total Settled</span>
            <span className="text-xl font-bold text-emerald-600 block">₹{totals.paid.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-wider block">Outstanding Due</span>
            <span className={`text-xl font-bold block ${totals.pending > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-500'}`}>
              ₹{totals.pending.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Invoice breakdown & Transactions history */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slideUp">
        
        {/* Academic invoices */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-200/60">Semester Wise Invoices</h3>
          
          <div className="space-y-6">
            {displayFees.map((fee: any) => {
              const tuition = Number(fee.tuition_fee) || 0;
              const exam = Number(fee.exam_fee) || 0;
              const library = Number(fee.library_fee) || 0;
              const other = Number(fee.other_fee) || 0;
              const total = tuition + exam + library + other;

              const paid = fee.payments
                ?.filter((p: any) => p.status === 'Success')
                .reduce((sum: number, p: any) => sum + (Number(p.amount_paid) || 0), 0) || 0;
              const balance = Math.max(0, total - paid);

              return (
                <div key={fee.id} className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-white shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">{fee.academic_year} Invoice</h4>
                      <span className="text-[9.5px] text-slate-500 font-semibold block mt-1">Due: {new Date(fee.due_date).toLocaleDateString()}</span>
                    </div>
                    <span
                      className={`text-[9.5px] font-semibold uppercase px-2.5 py-0.5 border rounded-full ${
                        balance === 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}
                    >
                      {balance === 0 ? 'Settled' : 'Payment Due'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[9.5px] font-medium text-slate-500 uppercase block tracking-wider">Tuition Fee</span>
                      <p className="font-semibold text-slate-700 mt-1">₹{tuition.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-medium text-slate-500 uppercase block tracking-wider">Exam Fee</span>
                      <p className="font-semibold text-slate-700 mt-1">₹{exam.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-medium text-slate-500 uppercase block tracking-wider">Library Fee</span>
                      <p className="font-semibold text-slate-700 mt-1">₹{library.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-medium text-slate-500 uppercase block tracking-wider">Other Fee</span>
                      <p className="font-semibold text-slate-700 mt-1">₹{other.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction History log */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-200/60">Transaction History</h3>

          {transactionHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">No payments logs found.</div>
          ) : (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {transactionHistory.map((tx: any) => (
                <div key={tx.id} className="flex items-start justify-between gap-3 text-xs pb-3.5 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="space-y-0.5 overflow-hidden">
                    <span className="font-semibold text-slate-800 block truncate">{tx.feeDescription}</span>
                    <span className="text-[9.5px] text-slate-500 block truncate">{tx.transaction_id}</span>
                    <span className="text-[9.5px] text-slate-500 block font-semibold">
                      {new Date(tx.paid_at).toLocaleDateString()} • {tx.payment_method}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-semibold text-emerald-700 block">₹{tx.amount_paid.toLocaleString()}</span>
                    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md block mt-1">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pay Modal */}
      {payModalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-scaleUp">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-650" />
                <h3 className="font-extrabold text-sm text-slate-900">Settle Tuition Balance</h3>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="p-1.5 text-slate-450 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimulatePayment} className="p-6 space-y-5 font-semibold text-xs text-slate-700">
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-center">
                <span className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-widest block">Pending Payment Amount</span>
                <span className="text-2xl font-bold text-slate-800 block mt-1">₹{totals.pending.toLocaleString()}</span>
              </div>

              <div>
                <label className="block text-[9.5px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Select Payment Option
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['UPI', 'Card', 'Net Banking'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition border ${
                        paymentMethod === method
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow shadow-indigo-600/10'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100/50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold rounded-xl transition shadow shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                >
                  {paying ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    'Confirm Pay'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
