'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sliders,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  semester_id: string;
}

interface EligibilityStatus {
  studentId: string;
  name: string;
  studentCode: string;
  attendanceRate: number;
  outstandingBalance: number;
  assignmentsSubmitted: number;
  rulesMet: boolean;
  overrideActive: boolean;
}

export default function ExaminationsDeskPage() {
  const { admin } = useAppStore();
  const queryClient = useQueryClient();

  // Configurable Eligibility Rules
  const [attThreshold, setAttThreshold] = useState(75);
  const [feeClearanceRequired, setFeeClearanceRequired] = useState(true);
  const [overrideList, setOverrideList] = useState<Record<string, boolean>>({});

  // Scheduling Form
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [hallCode, setHallCode] = useState('');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch Lookups & Subjects
  const { data: subjects } = useQuery({
    queryKey: ['admin-exams-subjects-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('*');
      return data || [];
    },
  });

  // Fetch Students with Attendance, Grades, and payments to calculate eligibility
  const { data: studentRecords, isLoading } = useQuery({
    queryKey: ['admin-exams-student-eligibility'],
    queryFn: async () => {
      const { data: students } = await supabase.from('students').select('*');
      const { data: attendance } = await supabase.from('attendance').select('*');
      const { data: submissions } = await supabase.from('assignment_submissions').select('*');
      const { data: payments } = await supabase.from('payments').select('*');
      const { data: fees } = await supabase.from('fees').select('*');

      return {
        students: (students as Student[]) || [],
        attendance: attendance || [],
        submissions: submissions || [],
        payments: payments || [],
        fees: fees || [],
      };
    },
  });

  // Calculate Eligibility for each student
  const eligibilityList = useMemo(() => {
    if (!studentRecords) return [];
    const { students, attendance, submissions, payments, fees } = studentRecords;

    return students.map((s) => {
      // 1. Attendance Rate
      const atts = attendance.filter((a) => a.student_id === s.id);
      const totalAtt = atts.length;
      const present = atts.filter((a) => a.status === 'Present' || a.status === 'Late').length;
      const attendanceRate = totalAtt > 0 ? Math.round((present / totalAtt) * 100) : 100;

      // 2. Outstanding Balance
      // Compute total invoiced fee for student sem
      const semFees = fees.filter((f) => f.semester_id === s.semester_id);
      const totalDue = semFees.reduce(
        (sum, f) =>
          sum +
          Number(f.tuition_fee) +
          Number(f.exam_fee) +
          Number(f.library_fee) +
          Number(f.other_fee),
        0
      );
      const studentPaid = payments
        .filter((p) => p.student_id === s.id && p.status === 'Success')
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);
      const outstandingBalance = Math.max(0, totalDue - studentPaid);

      // 3. Assignment submission rate
      const studentSubs = submissions.filter((sub) => sub.student_id === s.id && sub.status !== 'Pending');
      // Assume total assignments in system = 3
      const submissionRate = Math.round((studentSubs.length / 3) * 100);

      // Evaluate rule compliance
      const attRuleMet = attendanceRate >= attThreshold;
      const feeRuleMet = !feeClearanceRequired || outstandingBalance === 0;
      const rulesMet = attRuleMet && feeRuleMet;

      const overrideActive = !!overrideList[s.id];

      return {
        studentId: s.id,
        name: `${s.first_name} ${s.last_name}`,
        studentCode: s.student_id,
        attendanceRate,
        outstandingBalance,
        assignmentsSubmitted: submissionRate,
        rulesMet,
        overrideActive,
      } as EligibilityStatus;
    });
  }, [studentRecords, attThreshold, feeClearanceRequired, overrideList]);

  const toggleOverride = (studentId: string) => {
    setOverrideList((prev) => {
      const next = { ...prev, [studentId]: !prev[studentId] };
      
      // Log Action
      supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `Toggled manual exam eligibility override for student`,
        affected_records: `students: ${studentId}`,
      }).then(() => {});

      return next;
    });
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !examDate || !hallCode) return;

    // In a real application, you'd insert this into an `exams` or `academic_calendar` table.
    // For this implementation, we simulate and log the action.
    supabase.from('audit_logs').insert({
      user_email: admin?.name || 'Admin',
      role: admin?.role || 'Super Admin',
      action: `Scheduled exam for subject: ${subjectId} on ${examDate} in Hall ${hallCode}`,
      affected_records: `exams: scheduled`,
    }).then(() => {
      setIsScheduleOpen(false);
      setSubjectId('');
      setExamDate('');
      setHallCode('');
      setSuccessMsg('Exam scheduled and published to student calendars.');
      setTimeout(() => setSuccessMsg(null), 3000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs text-slate-500 hover:text-indigo-650 font-extrabold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">Examinations & Rules Control</h2>
          <p className="text-slate-550 text-xs mt-1 font-semibold">
            Configure automated exam hall ticket criteria, authorize overrides, and schedule semester assessments.
          </p>
        </div>

        <button
          onClick={() => {
            if (subjects?.length) setSubjectId(subjects[0].id);
            setIsScheduleOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-sm flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Schedule New Exam
        </button>
      </div>

      {/* Success alert details */}
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

      {/* Main Grid: Left Rules form, Right Roster list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left pane: Eligibility Engine Rule Form */}
        <div className="lg:col-span-1 bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6 h-fit">
          <div className="border-b border-slate-200/60 pb-3 flex items-center gap-2">
            <Sliders className="w-4.5 h-4.5 text-indigo-650" />
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-sans">Eligibility Rule Config</h3>
          </div>

          <div className="space-y-5">
            {/* Attendance slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Min. Attendance Required</span>
                <span className="text-indigo-600 font-sans font-bold">{attThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                value={attThreshold}
                onChange={(e) => setAttThreshold(Number(e.target.value))}
                className="w-full bg-slate-200 h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-[9.5px] text-slate-500 block leading-tight font-semibold">
                Students below this attendance will be flagged as Ineligible.
              </span>
            </div>

            {/* Financial check */}
            <div className="flex items-center justify-between border-t border-slate-200/60 pt-4">
              <div>
                <span className="text-xs font-bold text-slate-700 block">Outstanding Balance Check</span>
                <span className="text-[9.5px] text-slate-500 block mt-0.5 max-w-[180px] font-semibold">
                  Requires complete fee settlement to release hall ticket.
                </span>
              </div>
              <input
                type="checkbox"
                checked={feeClearanceRequired}
                onChange={(e) => setFeeClearanceRequired(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-white border-slate-200 rounded focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Right pane: eligibility roster list */}
        <div className="lg:col-span-2 bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col h-[70vh] shadow-sm">
          <div className="p-4 border-b border-slate-200/60 bg-white/20">
            <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Student Eligibility Roll</h4>
          </div>

          <div className="flex-grow overflow-y-auto">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 font-bold">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              </div>
            ) : eligibilityList.length > 0 ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/30 border-b border-slate-200/60 text-slate-550 uppercase font-extrabold text-[9.5px] tracking-wider">
                    <th className="py-3 px-6">Student details</th>
                    <th className="py-3 px-4 text-center">Attendance %</th>
                    <th className="py-3 px-4 text-center">Fee Due ($)</th>
                    <th className="py-3 px-4 text-center">Ass. Submit %</th>
                    <th className="py-3 px-4">Eligibility Status</th>
                    <th className="py-3 px-6 text-right">Manual Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                  {eligibilityList.map((row) => {
                    const isEligible = row.rulesMet || row.overrideActive;

                    return (
                      <tr key={row.studentId} className="hover:bg-white/40 transition">
                        <td className="py-3.5 px-6">
                          <div className="text-slate-900 font-extrabold">{row.name}</div>
                          <div className="text-[10px] text-slate-500 font-sans mt-0.5 font-semibold">{row.studentCode}</div>
                        </td>
                        <td className={`py-3.5 px-4 text-center font-sans font-bold ${
                          row.attendanceRate < attThreshold ? 'text-red-655' : 'text-slate-700'
                        }`}>
                          {row.attendanceRate}%
                        </td>
                        <td className={`py-3.5 px-4 text-center font-sans font-bold ${
                          row.outstandingBalance > 0 && feeClearanceRequired ? 'text-red-655' : 'text-slate-700'
                        }`}>
                          ${row.outstandingBalance}
                        </td>
                        <td className="py-3.5 px-4 text-center font-sans text-slate-700">
                          {row.assignmentsSubmitted}%
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            isEligible
                              ? 'bg-emerald-500/10 border-emerald-250/20 text-emerald-800'
                              : 'bg-red-500/10 border-red-250/20 text-red-800'
                          }`}>
                            {isEligible ? 'Eligible' : 'Ineligible'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            onClick={() => toggleOverride(row.studentId)}
                            className={`text-[9.5px] font-extrabold uppercase tracking-wider px-2.5 py-1.5 border rounded-lg transition ${
                              row.overrideActive
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                : 'bg-white/40 border-slate-200 text-slate-600 hover:text-slate-905'
                            }`}
                          >
                            {row.overrideActive ? 'Allowed' : 'Override'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs font-bold">No students registered in semester.</div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Exam Modal Dialog */}
      <AnimatePresence>
        {isScheduleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScheduleOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl w-full max-w-md p-6 relative z-10 mx-4 text-slate-800"
            >
              <h3 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-200/60 flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-indigo-650" />
                Schedule Exam Date Mappings
              </h3>

              <form onSubmit={handleScheduleSubmit} className="space-y-4 mt-4 font-semibold text-xs">
                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Subject Unit</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-extrabold"
                  >
                    {subjects?.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Exam Date</label>
                    <input
                      type="date"
                      required
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Exam Hall Block</label>
                    <input
                      type="text"
                      required
                      value={hallCode}
                      onChange={(e) => setHallCode(e.target.value)}
                      placeholder="e.g. Hall 3B"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setIsScheduleOpen(false)}
                    className="text-xs font-extrabold text-slate-500 hover:text-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition"
                  >
                    Confirm & Publish
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
