'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  ArrowLeft,
  Plus,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface Course {
  id: string;
  name: string;
  code: string;
  duration_years: number;
}

interface FacultyClass {
  id: string;
  faculty_id: string;
  course_id: string;
  semester_id: string;
  section: string;
  courses?: { name: string; code: string };
  semesters?: { number: number };
  faculty?: { first_name: string; last_name: string };
}

export default function CoursesSessionsPage() {
  const { admin } = useAppStore();
  const queryClient = useQueryClient();

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [semId, setSemId] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [section, setSection] = useState('A');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Lookups (courses, semesters, faculty)
  const { data: lookups } = useQuery({
    queryKey: ['admin-courses-sessions-lookups'],
    queryFn: async () => {
      const { data: courses } = await supabase.from('courses').select('*');
      const { data: semesters } = await supabase.from('semesters').select('*');
      const { data: faculty } = await supabase.from('faculty').select('*');
      return {
        courses: courses || [],
        semesters: semesters || [],
        faculty: faculty || [],
      };
    },
  });

  // Set default selections
  React.useEffect(() => {
    if (lookups?.courses.length && lookups?.semesters.length && lookups?.faculty.length && !courseId) {
      setCourseId(lookups.courses[0].id);
      setSemId(lookups.semesters[0].id);
      setFacultyId(lookups.faculty[0].id);
    }
  }, [lookups, courseId]);

  // Fetch Course mappings / class assignments
  const { data: classMappings, isLoading } = useQuery({
    queryKey: ['admin-classes-mappings-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faculty_classes')
        .select('*, courses(*), semesters(*), faculty(*)');
      if (error) throw error;
      return data as FacultyClass[];
    },
  });

  // Map Section Mutation
  const mapSectionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('faculty_classes').insert({
        faculty_id: facultyId,
        course_id: courseId,
        semester_id: semId,
        section: section.trim().toUpperCase(),
      });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `Assigned faculty class section: ${section} under course program`,
        affected_records: `faculty_classes: assigned`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-classes-mappings-list'] });
      setIsScheduleOpen(false);
      setSection('A');
      setSuccessMsg('Faculty section assignment completed successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Failed to map section.');
    },
  });

  const handleMapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mapSectionMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs text-slate-500 hover:text-indigo-650 font-extrabold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">Courses & Academic Sessions</h2>
          <p className="text-slate-550 text-xs mt-1 font-semibold">
            Audit core program courses, map semester sections, and assign class sections to faculty.
          </p>
        </div>

        <button
          onClick={() => setIsScheduleOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Map Class Section
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

      {/* Grid container */}
      <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/60 bg-white/20 flex items-center gap-2">
          <Compass className="w-4.5 h-4.5 text-indigo-650" />
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Active Course Section Mappings</h3>
        </div>

        {/* Table data */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-bold">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-650 mx-auto" />
            </div>
          ) : classMappings && classMappings.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/30 border-b border-slate-200/60 text-slate-550 uppercase font-extrabold text-[9.5px] tracking-wider">
                  <th className="py-3 px-6">Program / Course</th>
                  <th className="py-3 px-4 text-center">Semester</th>
                  <th className="py-3 px-4 text-center">Class Section</th>
                  <th className="py-3 px-6 text-right">Assigned Faculty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                {classMappings.map((row) => (
                  <tr key={row.id} className="hover:bg-white/40 transition">
                    <td className="py-3.5 px-6 font-extrabold text-slate-900">
                      {row.courses?.name}
                      <span className="text-[10px] text-slate-500 font-sans font-semibold block mt-0.5">{row.courses?.code}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-800 font-sans font-bold">Sem {row.semesters?.number || 6}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-white border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded font-sans font-extrabold uppercase">
                        Section {row.section}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right text-indigo-650 font-bold">
                      Dr. {row.faculty?.first_name} {row.faculty?.last_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs font-bold">No active class section mappings recorded.</div>
          )}
        </div>
      </div>

      {/* Map Class Modal Dialog */}
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
                <Compass className="w-4.5 h-4.5 text-indigo-650" />
                Map Timetable Class Section
              </h3>

              <form onSubmit={handleMapSubmit} className="space-y-4 mt-4 font-semibold text-xs">
                {errorMsg && (
                  <div className="p-3 bg-red-550/10 border border-red-200/40 rounded-xl text-red-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-655 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Program Course</label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-extrabold"
                  >
                    {lookups?.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Section Name</label>
                    <input
                      type="text"
                      required
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                      placeholder="e.g. A"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Assign Instructor</label>
                  <select
                    value={facultyId}
                    onChange={(e) => setFacultyId(e.target.value)}
                    className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-extrabold"
                  >
                    {lookups?.faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        Dr. {f.first_name} {f.last_name} ({f.faculty_id})
                      </option>
                    ))}
                  </select>
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
                    disabled={mapSectionMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition"
                  >
                    {mapSectionMutation.isPending ? 'Mapping...' : 'Confirm Mapping'}
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
