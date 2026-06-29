'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  Search,
  ArrowLeft,
  XCircle,
  AlertTriangle,
  Loader2,
  TrendingDown,
  Edit2,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface AttendanceLog {
  id: string;
  student_id: string;
  subject_id: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late';
  created_at: string;
  students?: { first_name: string; last_name: string; student_id: string };
  subjects?: { name: string; code: string };
}

export default function AttendanceMonitorPage() {
  const { admin } = useAppStore();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Present' | 'Absent' | 'Late'>('All');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<'Present' | 'Absent' | 'Late'>('Present');

  // Fetch Attendance Records
  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-attendance-monitor-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, students(*), subjects(*)')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as AttendanceLog[];
    },
  });

  // Edit Attendance Mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!editingLogId) return;
      const { error } = await supabase
        .from('attendance')
        .update({ status: editStatus })
        .eq('id', editingLogId);
      if (error) throw error;

      // Log Action
      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `Audited and changed attendance status to ${editStatus}`,
        affected_records: `attendance: ${editingLogId}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-attendance-monitor-logs'] });
      setEditingLogId(null);
    },
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!logs || logs.length === 0) return { presentRate: 100, total: 0, absent: 0, late: 0 };
    const total = logs.length;
    const present = logs.filter((l) => l.status === 'Present').length;
    const absent = logs.filter((l) => l.status === 'Absent').length;
    const late = logs.filter((l) => l.status === 'Late').length;
    const presentRate = Math.round(((present + late) / total) * 100);

    return {
      presentRate,
      total,
      absent,
      late,
    };
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((l) => {
      const studentName = `${l.students?.first_name} ${l.students?.last_name}`.toLowerCase();
      const subjectName = (l.subjects?.name || '').toLowerCase();
      
      const matchesSearch =
        studentName.includes(searchQuery.toLowerCase()) ||
        l.students?.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subjectName.includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'All' ? true : l.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [logs, searchQuery, filterStatus]);

  // Mock department wise attendance rate for charts
  const deptAttendance = [
    { name: 'Computer Science', rate: 93 },
    { name: 'Electronics', rate: 89 },
    { name: 'Mechanical', rate: 83 },
    { name: 'Civil', rate: 81 },
    { name: 'Management', rate: 95 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin" className="text-xs text-slate-500 hover:text-indigo-650 font-extrabold flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">Attendance Monitor Desk</h2>
        <p className="text-slate-550 text-xs mt-1 font-semibold">
          Perform administrative attendance audits, review deficiency rates, and override session logs.
        </p>
      </div>

      {/* KPI Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Overall Attendance Rate', value: `${stats.presentRate}%`, icon: CalendarCheck, sub: 'All departments average' },
          { label: 'Total Checked logs', value: stats.total, icon: Clock, sub: 'Checks ledger' },
          { label: 'Absent events count', value: stats.absent, icon: XCircle, sub: 'Deficiency logs', highlight: stats.absent > 0 ? 'text-red-655 font-extrabold' : 'text-slate-800' },
          { label: 'Late check-ins', value: stats.late, icon: AlertTriangle, sub: 'Late arrivals log', highlight: stats.late > 0 ? 'text-amber-600' : 'text-slate-800' },
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

      {/* Recharts chart */}
      <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-4 font-sans">
          <TrendingDown className="w-4 h-4 text-indigo-600" /> Attendance rate by department
        </h3>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptAttendance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
              <YAxis stroke="#475569" fontSize={10} domain={[60, 100]} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid #E2E8F0', borderRadius: '12px', color: '#0F172A' }} />
              <Bar dataKey="rate" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance log grid */}
      <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200/60 flex flex-col md:flex-row gap-3 items-center justify-between bg-white/20">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Search by student, class code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/40 border border-slate-200/60 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-455 focus:outline-none focus:border-indigo-500 transition font-semibold"
            />
          </div>

          <div className="flex gap-2 self-stretch md:self-auto font-semibold">
            {(['All', 'Present', 'Absent', 'Late'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`text-[9.5px] font-extrabold uppercase tracking-wider px-3 py-1.5 border rounded-lg transition ${
                  filterStatus === status
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white/40 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table data */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-bold">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-650 mx-auto" />
            </div>
          ) : filteredLogs.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/30 border-b border-slate-200/60 text-slate-550 uppercase font-extrabold text-[9.5px] tracking-wider">
                  <th className="py-3 px-6">Student details</th>
                  <th className="py-3 px-4">Subject Unit</th>
                  <th className="py-3 px-4">Check-in Date</th>
                  <th className="py-3 px-4">Check-in Status</th>
                  <th className="py-3 px-6 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/40 transition">
                    <td className="py-3.5 px-6">
                      <div className="text-slate-900 font-extrabold">
                        {log.students?.first_name} {log.students?.last_name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans font-semibold mt-0.5">{log.students?.student_id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-bold">{log.subjects?.name}</div>
                      <span className="text-[9.5px] font-sans text-slate-500 font-semibold">{log.subjects?.code}</span>
                    </td>
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-700">
                      {new Date(log.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-4">
                      {editingLogId === log.id ? (
                        <select
                          value={editStatus}
                          onChange={(e: any) => setEditStatus(e.target.value)}
                          className="bg-white border border-slate-250 rounded text-xs py-0.5 px-1.5 focus:outline-none font-bold"
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Late">Late</option>
                        </select>
                      ) : (
                        <span className={`text-[9.5px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          log.status === 'Present' ? 'bg-emerald-500/10 border-emerald-250/20 text-emerald-800' :
                          log.status === 'Absent' ? 'bg-red-500/10 border-red-250/20 text-red-800' :
                          'bg-amber-500/10 border-amber-250/20 text-amber-800'
                        }`}>
                          {log.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right font-bold">
                      {editingLogId === log.id ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setEditingLogId(null)}
                            className="text-[9.5px] font-extrabold text-slate-500 hover:text-slate-750 uppercase transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => updateAttendanceMutation.mutate()}
                            disabled={updateAttendanceMutation.isPending}
                            className="text-[9.5px] font-extrabold text-indigo-650 hover:text-indigo-750 uppercase transition disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingLogId(log.id);
                            setEditStatus(log.status);
                          }}
                          className="p-1 rounded-lg text-slate-450 hover:text-indigo-650 hover:bg-white/60 transition"
                          title="Audit check-in log"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-bold">No attendance check-ins logged.</div>
          )}
        </div>
      </div>
    </div>
  );
}
