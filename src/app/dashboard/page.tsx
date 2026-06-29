'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  Award,
  Calendar,
  CreditCard,
  Megaphone,
  PlusCircle,
  HelpCircle,
  FileDown,
  ArrowRight,
  TrendingUp,
  Percent,
  AlertCircle,
  Clock,
  Sparkles,
  BookOpen,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

// Detailed Mock Data Fallbacks for empty database query states
const mockAttendance = [
  { status: 'Present' }, { status: 'Present' }, { status: 'Absent' }, { status: 'Present' },
  { status: 'Present' }, { status: 'Present' }, { status: 'Present' }, { status: 'Late' },
  { status: 'Present' }, { status: 'Present' }, { status: 'Present' }, { status: 'Present' },
  { status: 'Absent' }, { status: 'Present' }, { status: 'Present' }, { status: 'Present' },
  { status: 'Present' }, { status: 'Late' }, { status: 'Present' }, { status: 'Present' },
];

const mockFees = [
  {
    id: 'f1',
    tuition_fee: 65000,
    exam_fee: 5000,
    library_fee: 2500,
    other_fee: 3500,
    due_date: '2026-07-10',
    payments: [
      { id: 'p1', amount_paid: 65000, status: 'Success' },
      { id: 'p2', amount_paid: 5000, status: 'Success' },
    ],
  },
  {
    id: 'f2',
    tuition_fee: 75000,
    exam_fee: 5000,
    library_fee: 2500,
    other_fee: 4500,
    due_date: '2026-06-30',
    payments: [
      { id: 'p3', amount_paid: 50000, status: 'Success' },
    ],
  },
];

const mockAnnouncements = [
  {
    id: 'a1',
    title: 'Mid-Semester Internal Evaluation Schedule',
    content: 'The detailed datesheet for Semester 6 Mid-Term internal examinations is now uploaded. Attendance is strictly compulsory. Contact your department coordinator for details.',
    priority: 'Critical',
    category: 'Examinations',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'a2',
    title: 'Annual Campus Hackathon - Hackfest 2026',
    content: 'Registration is now open for Hackfest 2026. Cash prizes worth ₹2,50,000 up for grabs. Mentorship from senior engineering staff. Registrations close on June 28th.',
    priority: 'High',
    category: 'Activities',
    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: 'a3',
    title: 'Fee Payment Deadline Extension',
    content: 'The deadline for clearing Semester 6 academic fee dues has been extended till June 30th without any late penalty charges. Please check your ledger for pending invoices.',
    priority: 'Normal',
    category: 'Administration',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

const mockActivities = [
  {
    id: 'ac1',
    title: 'Advanced React & Next.js Workshop',
    venue: 'Seminar Hall 3',
    start_date: new Date(Date.now() + 3600000 * 28).toISOString(),
    image_url: null,
  },
  {
    id: 'ac2',
    title: 'Web3 & Decentralized Ledger Boot Camp',
    venue: 'Block B Lab 6',
    start_date: new Date(Date.now() + 3600000 * 72).toISOString(),
    image_url: null,
  },
  {
    id: 'ac3',
    title: 'Campus Placement & Aptitude Prep',
    venue: 'Main Auditorium',
    start_date: new Date(Date.now() + 3600000 * 120).toISOString(),
    image_url: null,
  },
];

export default function StudentDashboard() {
  const { student } = useAppStore();
  const [localPayments, setLocalPayments] = useState<Record<string, any[]>>({});

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

  const displayAttendance = mockAttendance;

  const displayFees = useMemo(() => {
    return mockFees.map((fee: any) => {
      const extra = localPayments[fee.id] || [];
      return {
        ...fee,
        payments: [...(fee.payments || []), ...extra],
      };
    });
  }, [localPayments]);

  const displayAnnouncements = mockAnnouncements;
  const displayActivities = mockActivities;

  // Calculate Attendance Percentage
  const attendancePercentage = useMemo(() => {
    const present = displayAttendance.filter((a) => a.status === 'Present' || a.status === 'Late').length;
    return Math.round((present / displayAttendance.length) * 100);
  }, [displayAttendance]);

  // Calculate Fees Status with correct numeric conversion to prevent string concatenation bugs
  const feesSummary = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let nextDue: string | null = null;

    displayFees.forEach((fee: any) => {
      const tuition = Number(fee.tuition_fee) || 0;
      const exam = Number(fee.exam_fee) || 0;
      const library = Number(fee.library_fee) || 0;
      const other = Number(fee.other_fee) || 0;
      const totalFee = tuition + exam + library + other;

      const paymentsSum = fee.payments
        ?.filter((p: any) => p.status === 'Success')
        .reduce((sum: number, p: any) => sum + (Number(p.amount_paid) || 0), 0) || 0;

      paid += paymentsSum;
      const diff = totalFee - paymentsSum;
      if (diff > 0) {
        pending += diff;
        if (!nextDue || new Date(fee.due_date) < new Date(nextDue)) {
          nextDue = fee.due_date;
        }
      }
    });

    return { paid, pending, nextDue };
  }, [displayFees]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 25 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 bg-transparent"
    >
      {/* 1. HERO SECTION (Welcome Banner with subtle gradients) */}
      <motion.div
        variants={itemVariants}
        className="relative bg-gradient-to-r from-indigo-900 via-indigo-955 to-purple-950 p-6 md:p-8 rounded-3xl text-white overflow-hidden border border-indigo-500/20 shadow-md"
      >
        <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
        <div className="absolute top-[-50%] right-[-10%] w-[50%] h-[200%] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-indigo-200">
              <Sparkles className="w-3.5 h-3.5" /> Welcome back, Scholar
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Aarav Sharma
            </h1>
            <p className="text-indigo-200 text-xs md:text-sm font-semibold max-w-xl">
              You are currently registered in Semester 6 of Computer Science & Engineering. Let's inspect your real-time academic progression reports.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex gap-6 shrink-0 font-sans">
            <div>
              <span className="text-[10px] text-indigo-205 font-semibold uppercase tracking-wider block">Target CGPA</span>
              <span className="text-2xl font-bold text-white">8.72</span>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <span className="text-[10px] text-indigo-205 font-semibold uppercase tracking-wider block">Term Attendance</span>
              <span className="text-2xl font-bold text-white">{attendancePercentage}%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. CORE PERFORMANCE METRICS ROW */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {/* Attendance widget */}
        <Link
          href="/dashboard/attendance"
          className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-indigo-400 transition group flex items-center justify-between"
        >
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-widest block">My Attendance</span>
            <span className="text-xl font-bold text-slate-900 block group-hover:text-indigo-650 transition">{attendancePercentage}%</span>
            <span className="text-[10.5px] text-slate-500 block font-semibold">Min 75% standard required</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
        </Link>

        {/* GPA Summary widget */}
        <Link
          href="/dashboard/exams"
          className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-indigo-400 transition group flex items-center justify-between"
        >
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-widest block">Academic GPA</span>
            <span className="text-xl font-bold text-slate-900 block group-hover:text-indigo-650 transition">8.72 CGPA</span>
            <span className="text-[10.5px] text-slate-500 block font-semibold">SGPA Last Term: 8.94</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </Link>

        {/* Pending Invoices widget */}
        <Link
          href="/dashboard/fees"
          className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-indigo-400 transition group flex items-center justify-between"
        >
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-widest block">Outstanding Fees</span>
            <span className={`text-xl font-bold block group-hover:text-indigo-650 transition ${feesSummary.pending > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              ₹{feesSummary.pending.toLocaleString()}
            </span>
            <span className="text-[10.5px] text-slate-500 block font-semibold">
              {feesSummary.pending > 0 ? 'Payment due soon' : 'All invoices settled'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
        </Link>

        {/* Analytics Growth status */}
        <Link
          href="/dashboard/performance"
          className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:border-indigo-400 transition group flex items-center justify-between"
        >
          <div className="space-y-1.5">
            <span className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-widest block">Growth Index</span>
            <span className="text-xl font-bold text-slate-900 block group-hover:text-indigo-650 transition">Top 10%</span>
            <span className="text-[10.5px] text-slate-500 block font-semibold">Consistently improving CGPA</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Link>
      </motion.div>

      {/* 3. ROW 3: INTERACTIVE CHARTS & ANNOUNCEMENTS */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Attendance radial progress chart */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-indigo-600" />
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Attendance Clearance</h3>
            </div>
            <Link href="/dashboard/attendance" className="text-xs text-indigo-600 hover:text-indigo-850 font-semibold">
              Details
            </Link>
          </div>

          <div className="flex flex-col items-center justify-center my-6">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#E2E8F0" strokeWidth="7.5" fill="transparent" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#4F46E5"
                  strokeWidth="7.5"
                  fill="transparent"
                  strokeDasharray="251.2"
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: 251.2 - (251.2 * attendancePercentage) / 100 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">{attendancePercentage}%</span>
                <span className="text-[9.5px] text-slate-505 font-semibold uppercase tracking-wider">Attendance</span>
              </div>
            </div>
            
            <p className="text-center text-xs text-slate-650 mt-5 max-w-[200px] leading-relaxed font-semibold">
              {attendancePercentage >= 75 
                ? 'Your attendance rate is safely above the registrar limit.' 
                : 'Alert! Your attendance has fallen below 75% thresholds.'}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500 font-semibold">Requirement Clearance</span>
            <span className={`px-3 py-0.5 rounded-full text-[9.5px] uppercase font-semibold border ${
              attendancePercentage >= 75 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : 'bg-rose-50 text-rose-700 border-rose-100'
            }`}>
              {attendancePercentage >= 75 ? 'Approved' : 'Critical'}
            </span>
          </div>
        </div>

        {/* Circular Noticeboard widget */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4.5 h-4.5 text-indigo-650" />
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Notice Board</h3>
            </div>
            <Link href="/dashboard/announcements" className="text-xs text-indigo-600 hover:text-indigo-855 font-semibold">
              Noticeboard
            </Link>
          </div>

          <div className="divide-y divide-slate-200 flex-1 my-2">
            {displayAnnouncements.map((item: any) => (
              <div key={item.id} className="py-3.5 first:pt-2 last:pb-2">
                <div className="flex items-start justify-between gap-4">
                  <span className="font-semibold text-slate-900 text-xs hover:text-indigo-650 transition block leading-snug">
                    {item.title}
                  </span>
                  <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 border rounded-full shrink-0 ${
                    item.priority === 'Critical'
                      ? 'bg-rose-50 border-rose-100 text-rose-700'
                      : item.priority === 'High'
                      ? 'bg-amber-50 border-amber-100 text-amber-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    {item.priority}
                  </span>
                </div>
                <p className="text-slate-600 text-xs mt-1.5 line-clamp-2 leading-relaxed font-semibold">{item.content}</p>
                <div className="flex items-center gap-3 mt-3 text-[9.5px] text-slate-550 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(item.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span>•</span>
                  <span className="uppercase tracking-wider text-indigo-650">{item.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 5. BOTTOM GRID: UPCOMING ACTIVITIES & TIMELINE */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Events cards grid */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-indigo-655" />
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Campus Activities</h3>
            </div>
            <Link href="/dashboard/activities" className="text-xs text-indigo-600 hover:text-indigo-855 font-semibold">
              Browse Events
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayActivities.map((item: any) => (
              <div
                key={item.id}
                className="p-4 bg-white border border-slate-200 rounded-2xl flex gap-3.5 hover:border-slate-300 transition duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div className="overflow-hidden flex flex-col justify-between">
                  <span className="font-semibold text-slate-900 text-xs truncate group-hover:text-indigo-655 transition block">
                    {item.title}
                  </span>
                  <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5 mt-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(item.start_date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                    })}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold truncate mt-1">{item.venue}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Term deadlines timeline widget */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-indigo-600" />
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Academic Milestones</h3>
            </div>
          </div>

          <div className="relative pl-6 border-l border-slate-200 space-y-5 py-1">
            {[
              { title: 'Fee Payment Deadline', date: feesSummary.nextDue ? new Date(feesSummary.nextDue).toLocaleDateString() : 'June 30, 2026', type: 'fees' },
              { title: 'End-Semester Exam Registrations', date: 'Jul 15, 2026', type: 'exams' },
              { title: 'Compiler Design Lab Term Upload', date: 'Jul 24, 2026', type: 'assignment' },
            ].map((ev, i) => (
              <div key={i} className="relative group">
                <div className="absolute top-1 -left-[31px] w-4 h-4 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                </div>
                <div>
                  <span className="font-semibold text-slate-800 text-xs block leading-tight">{ev.title}</span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-1.5">{ev.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
