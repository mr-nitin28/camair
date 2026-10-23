'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  TrendingUp,
  ArrowLeft,
  AlertTriangle,
  Users,
  Award,
  CalendarCheck,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { SkeletonChart } from '@/components/ui/skeleton';

const FacultyPerformanceChart = dynamic(
  () => import('@/components/charts/faculty-performance-charts'),
  {
    ssr: false,
    loading: () => <SkeletonChart height={224} />,
  }
);

export default function FacultyPerformancePage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Students & Attendance to calculate risk dynamically
  const { data: students, isLoading } = useQuery({
    queryKey: ['students-risk-list'],
    queryFn: async () => {
      // Fetch students
      const { data: studentsData, error: sErr } = await supabase
        .from('students')
        .select('*');
      if (sErr) throw sErr;

      // Fetch attendance to map rates
      const { data: attsData, error: aErr } = await supabase
        .from('attendance')
        .select('student_id, status');
      if (aErr) throw aErr;

      // Calculate attendance rates
      const attMap: Record<string, { present: number; total: number }> = {};
      attsData.forEach((a) => {
        if (!attMap[a.student_id]) {
          attMap[a.student_id] = { present: 0, total: 0 };
        }
        attMap[a.student_id].total += 1;
        if (a.status === 'Present' || a.status === 'Late') {
          attMap[a.student_id].present += 1;
        }
      });

      return studentsData.map((s) => {
        const attStats = attMap[s.id];
        const attRate = attStats && attStats.total > 0 ? Math.round((attStats.present / attStats.total) * 100) : 88; // Seed defaults

        // Determine Risk profile
        let risk = 'Low';
        let color = 'bg-emerald-50 text-emerald-700 border-emerald-100';

        if (s.cgpa < 7.0 || attRate < 75) {
          risk = 'Critical';
          color = 'bg-rose-50 text-rose-700 border-rose-100';
        } else if (s.cgpa < 7.5 || attRate < 80) {
          risk = 'High';
          color = 'bg-orange-50 text-orange-700 border-orange-100';
        } else if (s.cgpa < 8.0 || attRate < 85) {
          risk = 'Medium';
          color = 'bg-amber-50 text-amber-700 border-amber-100';
        }

        return {
          ...s,
          attendanceRate: attRate,
          risk: risk,
          riskBadge: color,
        };
      });
    },
  });

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter((s: any) => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      return fullName.includes(searchQuery.toLowerCase()) || s.student_id.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [students, searchQuery]);

  // Aggregate Risk stats for Recharts
  const chartData = useMemo(() => {
    if (!students) return [];
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    students.forEach((s: any) => {
      counts[s.risk as keyof typeof counts] += 1;
    });

    return [
      { name: 'Critical Risk', count: counts.Critical, color: '#EF4444' },
      { name: 'High Risk', count: counts.High, color: '#F97316' },
      { name: 'Medium Risk', count: counts.Medium, color: '#F59E0B' },
      { name: 'Low Risk', count: counts.Low, color: '#10B981' },
    ];
  }, [students]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <Link href="/faculty" className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspace
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Student Risk Monitor</h2>
        <p className="text-slate-500 text-xs mt-1">Audit students academic standing, check attendance warnings, and identify critical risk cases.</p>
      </div>

      {/* Analytical charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Risk Distribution Bar Chart */}
        <div className="lg:col-span-2">
          <FacultyPerformanceChart data={chartData} />
        </div>

        {/* Risk Criteria guidelines */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-950 pb-2 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />
            Alert Mapping Protocols
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl">
              <span className="font-bold">Critical Risk</span>
              <p className="text-[10px] text-rose-700 mt-0.5">CGPA falls below 7.0 OR overall lecture attendance rate drops below 75%.</p>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-100 text-orange-800 rounded-xl">
              <span className="font-bold">High Risk</span>
              <p className="text-[10px] text-orange-700 mt-0.5">CGPA falls below 7.5 OR attendance rate drops below 80%.</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl">
              <span className="font-bold">Medium Risk</span>
              <p className="text-[10px] text-amber-700 mt-0.5">CGPA falls below 8.0 OR attendance rate drops below 85%.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Risk Directory Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search students in risk ledger..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Risk Grid table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Compiling risk logs...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No students recorded.</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold text-[9px]">
                  <th className="p-4 pl-6">Student ID</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4 text-center">CGPA status</th>
                  <th className="p-4 text-center">Attendance %</th>
                  <th className="p-4 text-center">Risk status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/40 transition">
                    <td className="p-4 pl-6 font-mono text-slate-500 font-bold">{s.student_id}</td>
                    <td className="p-4 font-semibold text-slate-900">
                      {s.first_name} {s.last_name}
                    </td>
                    <td className="p-4 text-center font-semibold text-slate-700">
                      <span className="flex items-center justify-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" /> {s.cgpa}
                      </span>
                    </td>
                    <td className="p-4 text-center font-semibold text-slate-700">
                      <span className="flex items-center justify-center gap-1">
                        <CalendarCheck className="w-3.5 h-3.5 text-slate-400" /> {s.attendanceRate}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full font-bold uppercase text-[9px] border ${s.riskBadge}`}
                      >
                        {s.risk} Risk
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
