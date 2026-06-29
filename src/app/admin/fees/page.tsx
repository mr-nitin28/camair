'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Plus,
  CheckCircle,
  Loader2,
  Download,
} from 'lucide-react';
import Link from 'next/link';

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  semester_id: string;
  courses?: { name: string };
}

interface FeeStructure {
  id: string;
  course_id: string;
  semester_id: string;
  academic_year: string;
  tuition_fee: number;
  exam_fee: number;
  library_fee: number;
  other_fee: number;
  due_date: string;
  courses?: { name: string; code: string };
  semesters?: { number: number };
}

interface PaymentLog {
  id: string;
  student_id: string;
  fee_id: string;
  amount_paid: number;
  payment_method: string;
  transaction_id: string;
  status: 'Pending' | 'Success' | 'Failed';
  paid_at: string;
  students?: { first_name: string; last_name: string; student_id: string };
}

export default function FeesFinancialsPage() {
  const { admin } = useAppStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'defaulters' | 'structures' | 'transactions'>('defaulters');
  
  // Fee Config Form
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [semId, setSemId] = useState('');
  const [tuitionFee, setTuitionFee] = useState(2500);
  const [examFee, setExamFee] = useState(150);
  const [libraryFee, setLibraryFee] = useState(100);
  const [otherFee, setOtherFee] = useState(50);
  const [dueDate, setDueDate] = useState('');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch Lookups
  const { data: lookups } = useQuery({
    queryKey: ['admin-fees-lookups'],
    queryFn: async () => {
      const { data: courses } = await supabase.from('courses').select('*');
      const { data: semesters } = await supabase.from('semesters').select('*');
      return { courses: courses || [], semesters: semesters || [] };
    },
  });

  // Set default selections
  React.useEffect(() => {
    if (lookups?.courses.length && lookups?.semesters.length && !courseId) {
      setCourseId(lookups.courses[0].id);
      setSemId(lookups.semesters[0].id);
    }
  }, [lookups, courseId]);

  // Fetch Fees Data
  const { data: feesData, isLoading } = useQuery({
    queryKey: ['admin-fees-data-registry'],
    queryFn: async () => {
      const { data: students } = await supabase.from('students').select('*, courses(*)');
      const { data: structures } = await supabase.from('fees').select('*, courses(*), semesters(*)');
      const { data: payments } = await supabase.from('payments').select('*, students(*)').order('paid_at', { ascending: false });

      return {
        students: (students as Student[]) || [],
        structures: (structures as FeeStructure[]) || [],
        payments: (payments as PaymentLog[]) || [],
      };
    },
  });

  // Calculate stats & defaulters
  const processedData = useMemo(() => {
    if (!feesData) return { totalBilled: 0, totalCollected: 0, outstanding: 0, rate: 0, defaulters: [] };
    const { students, structures, payments } = feesData;

    let totalBilled = 0;
    const studentBills: Record<string, { totalDue: number; paid: number; student: Student }> = {};

    // 1. Calculate total billed amounts based on student semesters
    students.forEach((s) => {
      const sFees = structures.filter((f) => f.semester_id === s.semester_id);
      const totalDue = sFees.reduce(
        (sum, f) =>
          sum +
          Number(f.tuition_fee) +
          Number(f.exam_fee) +
          Number(f.library_fee) +
          Number(f.other_fee),
        0
      );
      totalBilled += totalDue;
      studentBills[s.id] = { totalDue, paid: 0, student: s };
    });

    // 2. Map successful payments
    payments
      .filter((p) => p.status === 'Success')
      .forEach((p) => {
        if (studentBills[p.student_id]) {
          studentBills[p.student_id].paid += Number(p.amount_paid);
        }
      });

    // 3. Collect defaulters (outstanding balance > 0)
    const defaulters: any[] = [];
    let totalCollected = 0;

    Object.entries(studentBills).forEach(([id, b]) => {
      totalCollected += b.paid;
      const balance = Math.max(0, b.totalDue - b.paid);
      if (balance > 0) {
        defaulters.push({
          student: b.student,
          totalDue: b.totalDue,
          paid: b.paid,
          balance,
        });
      }
    });

    const outstanding = Math.max(0, totalBilled - totalCollected);
    const rate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 100;

    return {
      totalBilled,
      totalCollected,
      outstanding,
      rate,
      defaulters,
    };
  }, [feesData]);

  // Create Fee Structure Mutation
  const createFeeStructureMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('fees').insert({
        course_id: courseId,
        semester_id: semId,
        academic_year: '2026-27',
        tuition_fee: Number(tuitionFee),
        exam_fee: Number(examFee),
        library_fee: Number(libraryFee),
        other_fee: Number(otherFee),
        due_date: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `Configured fee structure values for course id: ${courseId}`,
        affected_records: `fees: configured`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fees-data-registry'] });
      setIsConfigOpen(false);
      setSuccessMsg('Fee structure applied and student invoices updated.');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
  });

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFeeStructureMutation.mutate();
  };

  const handleExportDefaulters = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Student ID,First Name,Last Name,Email,Billed Amount,Amount Paid,Outstanding Balance\n';

    processedData.defaulters.forEach((row: any) => {
      csvContent += `${row.student.student_id},${row.student.first_name},${row.student.last_name},${row.student.email},${row.totalDue},${row.paid},${row.balance}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fee_defaulters_registry.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs text-slate-500 hover:text-indigo-650 font-extrabold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">Fees & Finance Control</h2>
          <p className="text-slate-550 text-xs mt-1 font-semibold">
            Configure fee structures, audit invoice transaction history, and export fee defaulters logs.
          </p>
        </div>

        <button
          onClick={() => setIsConfigOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-sm flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Setup Fee Structure
        </button>
      </div>

      {/* Alert details */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-500/10 border border-emerald-200/40 text-emerald-800 text-xs flex items-center gap-2.5 rounded-xl font-extrabold"
          >
            <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Billed Invoices', value: `₹${processedData.totalBilled.toLocaleString()}`, icon: DollarSign, sub: 'Billed this session' },
          { label: 'Revenue Collected', value: `₹${processedData.totalCollected.toLocaleString()}`, icon: DollarSign, sub: 'Payment receipts success' },
          { label: 'Outstanding Balance', value: `₹${processedData.outstanding.toLocaleString()}`, icon: AlertTriangle, sub: 'Outstanding debt', highlight: processedData.outstanding > 0 ? 'text-red-655 font-extrabold' : 'text-slate-800' },
          { label: 'Collection Rate', value: `${processedData.rate}%`, icon: TrendingUp, sub: 'Target completion rate' },
        ].map((item, i) => (
          <div key={i} className="bg-white/50 backdrop-blur-md border border-slate-200/80 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
            <div className="flex items-start justify-between">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-500 leading-tight">{item.label}</span>
              <item.icon className="w-4.5 h-4.5 text-indigo-650 shrink-0" />
            </div>
            <div className="mt-4">
              <span className={`text-2xl font-extrabold tracking-tight block font-sans ${item.highlight || 'text-slate-900'}`}>
                {isLoading ? '...' : item.value}
              </span>
              <span className="text-[9.5px] text-slate-500 block font-bold mt-0.5">{item.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 pb-1 border-b border-slate-200/60 font-semibold">
        <button
          onClick={() => setActiveTab('defaulters')}
          className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition ${
            activeTab === 'defaulters'
              ? 'border-indigo-600 text-indigo-650 bg-white/20'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Fee Defaulters ({processedData.defaulters.length})
        </button>
        <button
          onClick={() => setActiveTab('structures')}
          className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition ${
            activeTab === 'structures'
              ? 'border-indigo-600 text-indigo-650 bg-white/20'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Fee Structures ({feesData?.structures.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2.5 text-xs font-extrabold border-b-2 transition ${
            activeTab === 'transactions'
              ? 'border-indigo-600 text-indigo-650 bg-white/20'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Transaction Logs ({feesData?.payments.length || 0})
        </button>
      </div>

      {/* Dynamic Tab view content */}
      <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-bold">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          </div>
        ) : activeTab === 'defaulters' ? (
          <div>
            <div className="p-4 border-b border-slate-200/60 bg-white/20 flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-550 uppercase tracking-wider">Outstanding Defaulter Roll</span>
              <button
                onClick={handleExportDefaulters}
                disabled={processedData.defaulters.length === 0}
                className="bg-white/40 border border-slate-200 text-slate-650 hover:bg-white/60 hover:text-slate-800 text-[10px] font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" /> Export Defaulters CSV
              </button>
            </div>
            
            {processedData.defaulters.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/30 border-b border-slate-200/60 text-slate-555 uppercase font-bold text-[9px] tracking-wider">
                      <th className="py-3 px-6">Student details</th>
                      <th className="py-3 px-4">Billed Amount</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-6 text-right">Pending Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                    {processedData.defaulters.map((row: any) => (
                      <tr key={row.student.id} className="hover:bg-white/40 transition">
                        <td className="py-3.5 px-6">
                          <div className="text-slate-900 font-extrabold">
                            {row.student.first_name} {row.student.last_name}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-sans font-semibold">{row.student.student_id} • {row.student.email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-sans font-bold text-slate-800">₹{row.totalDue.toLocaleString()}</td>
                        <td className="py-3.5 px-4 font-sans text-emerald-700 font-extrabold">₹{row.paid.toLocaleString()}</td>
                        <td className="py-3.5 px-6 text-right font-sans text-red-655 font-extrabold">₹{row.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs font-bold">No outstanding defaulters. 100% collection clearance!</div>
            )}
          </div>
        ) : activeTab === 'structures' ? (
          <div>
            <div className="p-4 border-b border-slate-200/60 bg-white/20">
              <span className="text-[10px] font-extrabold text-slate-550 uppercase tracking-wider">Configured Semesters Fee Ledger</span>
            </div>

            {feesData?.structures && feesData.structures.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/30 border-b border-slate-200/60 text-slate-555 uppercase font-bold text-[9px] tracking-wider">
                      <th className="py-3 px-6">Program & Sem Details</th>
                      <th className="py-3 px-4 text-center">Tuition fee</th>
                      <th className="py-3 px-4 text-center">Exam fee</th>
                      <th className="py-3 px-4 text-center">Library fee</th>
                      <th className="py-3 px-4 text-center">Other fee</th>
                      <th className="py-3 px-6 text-right">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                    {feesData.structures.map((str) => (
                      <tr key={str.id} className="hover:bg-white/40 transition">
                        <td className="py-3.5 px-6 font-extrabold text-slate-900">
                          {str.courses?.name} (Semester {str.semesters?.number || 6})
                          <span className="text-[9.5px] text-slate-500 block mt-0.5 font-sans font-semibold">Session {str.academic_year}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-sans font-bold">₹{str.tuition_fee.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center font-sans font-bold">₹{str.exam_fee.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center font-sans font-bold">₹{str.library_fee.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center font-sans font-bold">₹{str.other_fee.toLocaleString()}</td>
                        <td className="py-3.5 px-6 text-right font-sans font-semibold text-slate-600">
                          {new Date(str.due_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs font-bold">No fee structures configured. Setup one above.</div>
            )}
          </div>
        ) : (
          <div>
            <div className="p-4 border-b border-slate-200/60 bg-white/20">
              <span className="text-[10px] font-extrabold text-slate-550 uppercase tracking-wider">Successful payment transactions</span>
            </div>

            {feesData?.payments && feesData.payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/30 border-b border-slate-200/60 text-slate-555 uppercase font-bold text-[9px] tracking-wider">
                      <th className="py-3 px-6">Transaction ID</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-6 text-right">Payment Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                    {feesData.payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-white/40 transition">
                        <td className="py-3.5 px-6 font-sans text-slate-700 font-semibold">{pay.transaction_id}</td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">
                          {pay.students?.first_name} {pay.students?.last_name}
                        </td>
                        <td className="py-3.5 px-4 font-sans text-emerald-700 font-extrabold">₹{pay.amount_paid.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-slate-600">{pay.payment_method}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            pay.status === 'Success' ? 'bg-emerald-500/10 border-emerald-250/20 text-emerald-800' : 'bg-red-500/10 border-red-250/20 text-red-800'
                          }`}>
                            {pay.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right font-sans text-slate-600">
                          {new Date(pay.paid_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs font-bold">No transactions recorded.</div>
            )}
          </div>
        )}
      </div>

      {/* Setup Structure Modal Dialog */}
      <AnimatePresence>
        {isConfigOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfigOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl w-full max-w-md p-6 relative z-10 mx-4 text-slate-800"
            >
              <h3 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-200/60 flex items-center gap-2">
                <DollarSign className="w-4.5 h-4.5 text-indigo-650" />
                Setup Program Fee Structure
              </h3>

              <form onSubmit={handleConfigSubmit} className="space-y-4 mt-4 font-semibold text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Program Course</label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-extrabold"
                    >
                      {lookups?.courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Semester</label>
                    <select
                      value={semId}
                      onChange={(e) => setSemId(e.target.value)}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-extrabold"
                    >
                      {lookups?.semesters
                        .filter((s) => s.course_id === courseId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            Semester {s.number}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Tuition Fee (₹)</label>
                    <input
                      type="number"
                      required
                      value={tuitionFee}
                      onChange={(e) => setTuitionFee(Number(e.target.value))}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Examination Fee (₹)</label>
                    <input
                      type="number"
                      required
                      value={examFee}
                      onChange={(e) => setExamFee(Number(e.target.value))}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Library Fee (₹)</label>
                    <input
                      type="number"
                      required
                      value={libraryFee}
                      onChange={(e) => setLibraryFee(Number(e.target.value))}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Other Fees (₹)</label>
                    <input
                      type="number"
                      required
                      value={otherFee}
                      onChange={(e) => setOtherFee(Number(e.target.value))}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Invoice Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(false)}
                    className="text-xs font-extrabold text-slate-500 hover:text-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition"
                  >
                    Apply Structure
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
