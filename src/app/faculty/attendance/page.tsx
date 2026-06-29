'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import {
  CalendarCheck,
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

export default function FacultyAttendancePage() {
  const { faculty } = useAppStore();
  const queryClient = useQueryClient();

  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Attendance Roster state: mapping student_id -> status ('Present' | 'Absent' | 'Late')
  const [attendanceSheet, setAttendanceSheet] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch subjects taught by faculty
  const { data: subjects } = useQuery({
    queryKey: ['faculty-subjects-attendance', faculty?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faculty_subjects')
        .select('*, subjects(*)');
      if (error) throw error;
      return data?.map((fs: any) => fs.subjects) || [];
    },
    enabled: !!faculty,
  });

  // Set default subject on load
  React.useEffect(() => {
    if (subjects && subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  // Fetch students in CSE (all students in the course/semester)
  const { data: students } = useQuery({
    queryKey: ['students-attendance-roster'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('student_id', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing attendance logs for this subject and date to pre-populate values
  const { data: existingAttendance } = useQuery({
    queryKey: ['existing-attendance-logs', selectedSubjectId, selectedDate],
    queryFn: async () => {
      if (!selectedSubjectId || !selectedDate) return null;
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('subject_id', selectedSubjectId)
        .eq('date', selectedDate);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSubjectId && !!selectedDate,
  });

  // Sync roster state with existing logs in database
  React.useEffect(() => {
    if (students) {
      const initialSheet: Record<string, string> = {};
      students.forEach((s) => {
        initialSheet[s.id] = 'Present'; // Default to Present
      });

      if (existingAttendance && existingAttendance.length > 0) {
        existingAttendance.forEach((log: any) => {
          initialSheet[log.student_id] = log.status;
        });
      }
      setAttendanceSheet(initialSheet);
    }
  }, [students, existingAttendance]);

  // Bulk Actions
  const handleBulkMark = (status: 'Present' | 'Absent') => {
    if (!students) return;
    const newSheet = { ...attendanceSheet };
    students.forEach((s) => {
      newSheet[s.id] = status;
    });
    setAttendanceSheet(newSheet);
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceSheet((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Save Mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubjectId || !selectedDate || !students) return;

      const records = Object.entries(attendanceSheet).map(([studentId, status]) => ({
        student_id: studentId,
        subject_id: selectedSubjectId,
        date: selectedDate,
        status: status,
      }));

      // Upsert: insert records and update on conflict
      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'student_id,subject_id,date' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['existing-attendance-logs'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setSaveError(null);
    },
    onError: (err: any) => {
      setSaveError(err?.message || 'Failed to submit attendance logs.');
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    saveAttendanceMutation.mutate();
  };

  // Find students with low attendance (< 75%) in the selected subject
  // For demonstration, we query overall attendance and list low alerts
  const { data: lowAttendanceAlerts } = useQuery({
    queryKey: ['low-attendance-alerts', selectedSubjectId],
    queryFn: async () => {
      if (!selectedSubjectId) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select('*, students(*)')
        .eq('subject_id', selectedSubjectId);

      if (error) throw error;

      // Group logs by student
      const studentMap: Record<string, { name: string; id: string; present: number; total: number }> = {};
      data.forEach((log: any) => {
        const sid = log.student_id;
        if (!studentMap[sid] && log.students) {
          studentMap[sid] = {
            id: sid,
            name: `${log.students.first_name} ${log.students.last_name}`,
            present: 0,
            total: 0,
          };
        }
        if (studentMap[sid]) {
          studentMap[sid].total += 1;
          if (log.status === 'Present' || log.status === 'Late') {
            studentMap[sid].present += 1;
          }
        }
      });

      return Object.values(studentMap)
        .map((item) => ({
          ...item,
          rate: item.total > 0 ? Math.round((item.present / item.total) * 100) : 100,
        }))
        .filter((item) => item.rate < 75);
    },
    enabled: !!selectedSubjectId,
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/faculty" className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspace
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Registry Console</h2>
          <p className="text-slate-500 text-xs mt-1">Select class parameters, perform bulk rollcalls, and monitor threshold warnings.</p>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-4 flex items-center gap-2">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          <span>Attendance logs saved successfully and synchronized with student portals!</span>
        </div>
      )}
      {saveError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-4 flex items-center gap-2">
          <XCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Selection Filters */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Subject Roster *
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
          >
            {subjects?.map((sub: any) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} ({sub.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Lecture Date *
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleBulkMark('Present')}
            className="w-1/2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2 rounded-xl text-xs transition"
          >
            All Present
          </button>
          <button
            type="button"
            onClick={() => handleBulkMark('Absent')}
            className="w-1/2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2 rounded-xl text-xs transition"
          >
            All Absent
          </button>
        </div>
      </div>

      {/* Roster & Warnings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Roster Roster */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[60vh]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-bold text-slate-950">Student Roster Rollcall</h3>
            <span className="text-[10px] text-slate-400 font-semibold">{students?.length || 0} Students Found</span>
          </div>

          <div className="flex-grow overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold text-[9px] sticky top-0 z-10">
                  <th className="p-3.5 pl-5">Student ID</th>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5 text-center">Status Selection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students?.map((s: any) => {
                  const currentStatus = attendanceSheet[s.id] || 'Present';
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/30 transition">
                      <td className="p-3.5 pl-5 font-mono text-slate-500 font-bold">{s.student_id}</td>
                      <td className="p-3.5 text-slate-900 font-semibold">
                        {s.first_name} {s.last_name}
                      </td>
                      <td className="p-3.5">
                        <div className="flex justify-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100 w-max mx-auto">
                          {['Present', 'Absent', 'Late'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStatusChange(s.id, st)}
                              className={`px-3 py-1.5 rounded-md text-[10px] font-extrabold uppercase transition ${
                                currentStatus === st
                                  ? st === 'Present'
                                    ? 'bg-emerald-500 text-white shadow-sm'
                                    : st === 'Absent'
                                    ? 'bg-rose-500 text-white shadow-sm'
                                    : 'bg-amber-500 text-white shadow-sm'
                                  : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/20 flex justify-end shrink-0">
            <button
              onClick={handleSave}
              disabled={saveAttendanceMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-5 py-2.5 text-xs font-semibold rounded-lg transition shadow-md shadow-blue-600/10 flex items-center justify-center gap-1.5"
            >
              {saveAttendanceMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CalendarCheck className="w-4.5 h-4.5" /> Submit Attendance
                </>
              )}
            </button>
          </div>
        </div>

        {/* Attendance Low warning side panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col h-[60vh] overflow-y-auto">
          <div>
            <h3 className="text-sm font-bold text-slate-950 pb-2 border-b border-slate-100 flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-4.5 h-4.5" /> Below 75% Alerts
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Students with critical attendance rates in this subject</p>
          </div>

          <div className="divide-y divide-slate-100 flex-grow">
            {!lowAttendanceAlerts || lowAttendanceAlerts.length === 0 ? (
              <div className="py-12 text-slate-400 text-center text-xs">No attendance warnings found. All students are in safe thresholds.</div>
            ) : (
              lowAttendanceAlerts.map((log: any) => (
                <div key={log.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block truncate">{log.name}</span>
                    <span className="text-[9.5px] text-slate-400 block font-mono">Lectures: {log.present}/{log.total}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 font-extrabold text-[9.5px] rounded-md shrink-0">
                    {log.rate}% Rate
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
