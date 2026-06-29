'use client';

import React, { useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BookOpen,
  ArrowLeft,
  Percent,
} from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// Mock Data Fallbacks
const mockSubjects = [
  { id: 'sub-cd', code: 'CS-601', name: 'Compiler Design', faculty_name: 'Dr. Ramesh Kumar' },
  { id: 'sub-cn', code: 'CS-602', name: 'Computer Networks', faculty_name: 'Prof. Ananya Sen' },
  { id: 'sub-se', code: 'CS-603', name: 'Software Engineering', faculty_name: 'Dr. Vikrant Mehta' },
  { id: 'sub-ai', code: 'CS-604', name: 'Artificial Intelligence', faculty_name: 'Prof. Shruti Roy' },
  { id: 'sub-wt', code: 'CS-605', name: 'Web Technologies', faculty_name: 'Dr. Amit Bansal' },
  { id: 'sub-cnl', code: 'CS-606L', name: 'Computer Networks Lab', faculty_name: 'Prof. Ananya Sen' },
];

const mockAttendanceLog = [
  { id: 'log1', date: '2026-06-22', subject_id: 'sub-cd', status: 'Present', subjects: mockSubjects[0] },
  { id: 'log2', date: '2026-06-22', subject_id: 'sub-cn', status: 'Present', subjects: mockSubjects[1] },
  { id: 'log3', date: '2026-06-21', subject_id: 'sub-se', status: 'Late', subjects: mockSubjects[2] },
  { id: 'log4', date: '2026-06-21', subject_id: 'sub-ai', status: 'Present', subjects: mockSubjects[3] },
  { id: 'log5', date: '2026-06-20', subject_id: 'sub-wt', status: 'Absent', subjects: mockSubjects[4] },
  { id: 'log6', date: '2026-06-20', subject_id: 'sub-cd', status: 'Present', subjects: mockSubjects[0] },
  { id: 'log7', date: '2026-06-19', subject_id: 'sub-cn', status: 'Present', subjects: mockSubjects[1] },
  { id: 'log8', date: '2026-06-19', subject_id: 'sub-se', status: 'Present', subjects: mockSubjects[2] },
  { id: 'log9', date: '2026-06-18', subject_id: 'sub-ai', status: 'Present', subjects: mockSubjects[3] },
  { id: 'log10', date: '2026-06-18', subject_id: 'sub-wt', status: 'Present', subjects: mockSubjects[4] },
  { id: 'log11', date: '2026-06-17', subject_id: 'sub-cnl', status: 'Present', subjects: mockSubjects[5] },
  { id: 'log12', date: '2026-06-17', subject_id: 'sub-cd', status: 'Present', subjects: mockSubjects[0] },
  { id: 'log13', date: '2026-06-16', subject_id: 'sub-cn', status: 'Absent', subjects: mockSubjects[1] },
  { id: 'log14', date: '2026-06-16', subject_id: 'sub-se', status: 'Present', subjects: mockSubjects[2] },
  { id: 'log15', date: '2026-06-15', subject_id: 'sub-ai', status: 'Present', subjects: mockSubjects[3] },
  { id: 'log16', date: '2026-06-15', subject_id: 'sub-wt', status: 'Present', subjects: mockSubjects[4] },
];

const mockMonthlyData = [
  { name: 'Jan', Percentage: 92 },
  { name: 'Feb', Percentage: 88 },
  { name: 'Mar', Percentage: 85 },
  { name: 'Apr', Percentage: 90 },
  { name: 'May', Percentage: 87 },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-xl">
        <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">{label}</p>
        <p className="text-xs text-indigo-600 font-extrabold mt-1">
          Rate: <span className="text-slate-900">{payload[0].value}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function AttendancePage() {
  const { student } = useAppStore();
  const [filterSubject, setFilterSubject] = useState('All');

  const displaySubjects = mockSubjects;
  const displayLogs = mockAttendanceLog;

  // Calculate subject-wise attendance percentages
  const subjectSummaries = useMemo(() => {
    return displaySubjects.map((sub: any) => {
      const subLogs = displayLogs.filter((log: any) => log.subject_id === sub.id);
      const total = subLogs.length > 0 ? subLogs.length : 12;
      const presentLogs = subLogs.filter((log: any) => log.status === 'Present' || log.status === 'Late');
      
      let present = presentLogs.length;
      if (subLogs.length === 0) {
        if (sub.code === 'CS-601') present = 11;
        else if (sub.code === 'CS-602') present = 9;
        else if (sub.code === 'CS-603') present = 10;
        else if (sub.code === 'CS-604') present = 8;
        else if (sub.code === 'CS-605') present = 11;
        else present = 12;
      }

      const percentage = Math.round((present / total) * 100);
      const absent = total - present;
      const late = subLogs.filter((log: any) => log.status === 'Late').length || (sub.code === 'CS-603' ? 1 : 0);

      return {
        ...sub,
        total,
        present,
        absent,
        late,
        percentage,
      };
    });
  }, [displaySubjects, displayLogs]);

  // Calculate overall attendance
  const overallStats = useMemo(() => {
    const total = subjectSummaries.reduce((sum, item) => sum + item.total, 0);
    const present = subjectSummaries.reduce((sum, item) => sum + item.present, 0);
    const percentage = Math.round((present / total) * 100);
    const absent = total - present;

    return { percentage, total, present, absent };
  }, [subjectSummaries]);

  // Group attendance by month for Recharts Trend
  const monthlyTrendData = useMemo(() => {
    const sorted = [...displayLogs].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const monthsMap: Record<string, { present: number; total: number }> = {};
    
    sorted.forEach((log: any) => {
      const dateObj = new Date(log.date);
      const monthName = dateObj.toLocaleString('en-US', { month: 'short' });
      
      if (!monthsMap[monthName]) {
        monthsMap[monthName] = { present: 0, total: 0 };
      }
      
      monthsMap[monthName].total += 1;
      if (log.status === 'Present' || log.status === 'Late') {
        monthsMap[monthName].present += 1;
      }
    });

    return Object.keys(monthsMap).map((m) => ({
      name: m,
      Percentage: Math.round((monthsMap[m].present / monthsMap[m].total) * 100),
    }));
  }, [displayLogs]);

  const filteredLogs = useMemo(() => {
    if (filterSubject === 'All') return displayLogs;
    return displayLogs.filter((log) => log.subjects?.code === filterSubject);
  }, [displayLogs, filterSubject]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-indigo-650 font-semibold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Tracker</h2>
          <p className="text-slate-600 text-xs mt-1">Monitor subject-wise lectures, overall percentages, and check-in history.</p>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Overall Rate', value: `${overallStats.percentage}%`, icon: Percent, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { label: 'Total Conducted', value: overallStats.total, icon: BookOpen, color: 'text-slate-700 bg-slate-100 border-slate-200' },
          { label: 'Classes Attended', value: overallStats.present, icon: CheckCircle, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
          { label: 'Classes Absent', value: overallStats.absent, icon: XCircle, color: 'text-rose-700 bg-rose-50 border-rose-100' },
        ].map((item, i) => (
          <div key={i} className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider block font-mono">{item.label}</span>
              <span className="text-2xl font-black text-slate-900 block mt-0.5">{item.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Grid: Subject Cards and Monthly Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Subject-Wise Attendance list */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Subject-wise Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjectSummaries.map((sub: any) => {
              const isBelow = sub.percentage < 75;
              return (
                <div key={sub.id} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between hover:border-slate-300 transition shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-[10px] font-bold text-indigo-700 font-mono">{sub.code}</span>
                      {isBelow && (
                        <span className="flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full border border-rose-100 shrink-0">
                          <AlertTriangle className="w-3 h-3" /> Shortage Alert
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">{sub.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">{sub.faculty_name}</p>
                  </div>

                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className={`font-bold ${isBelow ? 'text-rose-600' : 'text-emerald-600'}`}>{sub.percentage}% Rate</span>
                      <span className="text-[10px] text-slate-500 font-extrabold font-mono">{sub.present}/{sub.total} classes</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isBelow ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${sub.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Trend Recharts Card */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-200">Monthly Analysis</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-1">Attendance progression across Semester 6</p>
          </div>

          <div className="h-52 mt-4 w-full text-[10px] font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="areaGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '10px' }} />
                <YAxis domain={[50, 100]} stroke="#64748b" style={{ fontSize: '10px' }} />
                <Tooltip content={<CustomChartTooltip />} />
                <Area type="monotone" dataKey="Percentage" stroke="#6366f1" strokeWidth={2.5} fill="url(#areaGlow)" activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 text-center">
            <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">Jan 8, 2026 - May 15, 2026</span>
          </div>
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Detailed Check-In Logs</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">Chronological record of recent lecture attendance status.</p>
          </div>

          {/* Subject code filter selector */}
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer font-semibold shadow-sm"
          >
            <option value="All">All Subjects</option>
            {displaySubjects.map((sub: any) => (
              <option key={sub.id} value={sub.code}>{sub.code} - {sub.name}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[9.5px] font-mono">
                <th className="p-4">Date</th>
                <th className="p-4">Subject Code</th>
                <th className="p-4">Subject Name</th>
                <th className="p-4">Faculty</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/85">
              {filteredLogs.slice(0, 15).map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-bold text-slate-700 font-mono">
                    {new Date(log.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="p-4 font-mono font-bold text-indigo-700">{log.subjects?.code}</td>
                  <td className="p-4 font-semibold text-slate-800">{log.subjects?.name}</td>
                  <td className="p-4 text-slate-600 font-semibold">{log.subjects?.faculty_name}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-extrabold uppercase text-[9px] border ${
                        log.status === 'Present'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : log.status === 'Absent'
                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}
                    >
                      {log.status === 'Present' && <CheckCircle className="w-3 h-3 shrink-0" />}
                      {log.status === 'Absent' && <XCircle className="w-3 h-3 shrink-0" />}
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
