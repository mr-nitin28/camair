'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  Plus,
  ArrowLeft,
  Compass,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import Link from 'next/link';

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  department_id: string;
  duration_years: number;
}

export default function DepartmentsSessionsPage() {
  const { admin } = useAppStore();
  const queryClient = useQueryClient();

  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  
  // Creation States
  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');

  const [isCourseOpen, setIsCourseOpen] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [durationYears, setDurationYears] = useState(4);

  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [credits, setCredits] = useState(4);
  const [activeCourseId, setActiveCourseId] = useState('');
  const [activeSemId, setActiveSemId] = useState('');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Departments
  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('departments').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data as Department[];
    },
  });

  // Set default selected department on load
  React.useEffect(() => {
    if (departments && departments.length > 0 && !selectedDeptId) {
      setSelectedDeptId(departments[0].id);
    }
  }, [departments, selectedDeptId]);

  // Fetch Courses under Active Department
  const { data: courses, isLoading: loadingCourses } = useQuery({
    queryKey: ['admin-courses', selectedDeptId],
    queryFn: async () => {
      if (!selectedDeptId) return [];
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('department_id', selectedDeptId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Course[];
    },
    enabled: !!selectedDeptId,
  });

  // Fetch Semesters & Subjects
  const { data: semestersAndSubjects } = useQuery({
    queryKey: ['admin-sems-subjects', selectedDeptId],
    queryFn: async () => {
      if (!selectedDeptId) return null;
      const { data: semesters } = await supabase.from('semesters').select('*');
      const { data: subjects } = await supabase.from('subjects').select('*');
      return {
        semesters: semesters || [],
        subjects: subjects || [],
      };
    },
    enabled: !!selectedDeptId,
  });

  // Create Department Mutation
  const createDeptMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('departments').insert({
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
      });
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `Created department: ${deptName} (${deptCode})`,
        affected_records: `departments: ${deptCode}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      setIsDeptOpen(false);
      setDeptName('');
      setDeptCode('');
      setSuccessMsg('Department created successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => setErrorMsg(err?.message || 'Failed to create department.'),
  });

  // Create Course Mutation
  const createCourseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDeptId) return;
      const { data, error } = await supabase
        .from('courses')
        .insert({
          name: courseName.trim(),
          code: courseCode.trim().toUpperCase(),
          department_id: selectedDeptId,
          duration_years: Number(durationYears),
        })
        .select()
        .single();

      if (error) throw error;

      // Automatically generate semesters 1 to N based on duration years (2 semesters per year)
      const numSems = durationYears * 2;
      const semPayloads = Array.from({ length: numSems }).map((_, i) => ({
        course_id: data.id,
        number: i + 1,
      }));
      await supabase.from('semesters').insert(semPayloads);

      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `Created course program: ${courseName} (${courseCode})`,
        affected_records: `courses: ${data.id}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      setIsCourseOpen(false);
      setCourseName('');
      setCourseCode('');
      setDurationYears(4);
      setSuccessMsg('Course program and academic semesters generated successfully.');
      setTimeout(() => setSuccessMsg(null), 3500);
    },
    onError: (err: any) => setErrorMsg(err?.message || 'Failed to create course program.'),
  });

  // Create Subject Mutation
  const createSubjectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('subjects').insert({
        name: subjectName.trim(),
        code: subjectCode.trim().toUpperCase(),
        credits: Number(credits),
        course_id: activeCourseId,
        semester_id: activeSemId,
      });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `Created subject unit: ${subjectName} (${subjectCode})`,
        affected_records: `subjects: ${subjectCode}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sems-subjects'] });
      setIsSubjectOpen(false);
      setSubjectName('');
      setSubjectCode('');
      setCredits(4);
      setSuccessMsg('Subject unit added successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    },
    onError: (err: any) => setErrorMsg(err?.message || 'Failed to add subject unit.'),
  });

  const activeDept = departments?.find((d) => d.id === selectedDeptId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs text-slate-500 hover:text-indigo-650 font-extrabold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">Departments & Programs</h2>
          <p className="text-slate-550 text-xs mt-1 font-semibold">
            Build course curriculum, organize academic semesters, and assign subjects under programs.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsDeptOpen(true)}
            className="border border-slate-200 bg-white/40 text-slate-700 hover:text-slate-900 hover:bg-white/60 font-extrabold text-xs py-2 px-3.5 rounded-xl transition"
          >
            Create Department
          </button>
          <button
            onClick={() => setIsCourseOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-sm transition"
          >
            Create Course Program
          </button>
        </div>
      </div>

      {/* Success alert message */}
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

      {/* Split layout view */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden h-[70vh] shadow-sm">
        {/* Left pane: Departments Tree */}
        <div className="lg:col-span-1 border-r border-slate-200/60 flex flex-col h-full bg-white/10">
          <div className="p-4 border-b border-slate-200/60">
            <h4 className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider">Active Departments</h4>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingDepts ? (
              <div className="text-center py-6 text-slate-500 text-xs font-bold">Loading depts...</div>
            ) : departments && departments.length > 0 ? (
              departments.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDeptId(d.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-bold transition ${
                    selectedDeptId === d.id
                      ? 'bg-indigo-650 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white/40 hover:text-indigo-850'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building className="w-4 h-4 shrink-0" />
                    <span>{d.name}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
                </button>
              ))
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs font-bold">No departments.</div>
            )}
          </div>
        </div>

        {/* Right pane: Course detail grids */}
        <div className="lg:col-span-3 flex flex-col h-full bg-white/5 overflow-y-auto p-6 space-y-6">
          {activeDept ? (
            <>
              {/* Dept Banner header */}
              <div className="pb-4 border-b border-slate-200/60">
                <h3 className="text-sm font-extrabold text-slate-900 font-sans">{activeDept.name} ({activeDept.code})</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">Academic Programs List</p>
              </div>

              {/* Course lists */}
              {loadingCourses ? (
                <div className="p-8 text-center text-slate-500 text-xs font-bold">Loading course logs...</div>
              ) : courses && courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.map((course) => {
                    const courseSems = semestersAndSubjects?.semesters.filter((s) => s.course_id === course.id) || [];
                    
                    return (
                      <div key={course.id} className="bg-white/40 border border-slate-200/60 rounded-xl p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900">{course.name}</h4>
                            <span className="text-[9.5px] text-slate-500 font-semibold block mt-0.5">
                              {course.code} • {course.duration_years} Years Program
                            </span>
                          </div>
                          <span className="bg-white border border-slate-200 text-slate-700 text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded shrink-0">
                            {courseSems.length} Sems
                          </span>
                        </div>

                        {/* Semester Subjects tree list */}
                        <div className="space-y-3.5 border-t border-slate-200/60 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider">Curriculum subjects</span>
                            <button
                              onClick={() => {
                                if (courseSems.length) {
                                  setActiveCourseId(course.id);
                                  setActiveSemId(courseSems[0].id);
                                  setIsSubjectOpen(true);
                                } else {
                                  alert('Generate semesters first for this course.');
                                }
                              }}
                              className="text-[9.5px] text-indigo-650 hover:text-indigo-755 font-extrabold uppercase tracking-wider flex items-center gap-0.5"
                            >
                              <Plus className="w-3.5 h-3.5 animate-pulse" /> Subject
                            </button>
                          </div>

                          <div className="space-y-2 max-h-48 overflow-y-auto font-semibold">
                            {courseSems.map((sem) => {
                              const semSubs = semestersAndSubjects?.subjects.filter(
                                (sub) => sub.course_id === course.id && sub.semester_id === sem.id
                              ) || [];

                              return (
                                <div key={sem.id} className="text-[10px] space-y-1.5 font-bold text-slate-600 bg-white/30 p-2 rounded border border-slate-200/60">
                                  <div className="flex items-center justify-between border-b border-slate-200/40 pb-1 mb-1">
                                    <span className="font-extrabold text-slate-800">Semester {sem.number}</span>
                                    <span className="text-slate-500 text-[9.5px]">{semSubs.length} Courses</span>
                                  </div>
                                  
                                  {semSubs.length > 0 ? (
                                    <div className="space-y-1 pl-1">
                                      {semSubs.map((sub) => (
                                        <div key={sub.id} className="flex justify-between items-center text-[10px] text-slate-700">
                                          <span>{sub.name}</span>
                                          <span className="text-slate-500 font-semibold font-sans">
                                            {sub.code} ({sub.credits}C)
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-450 italic block pl-1 text-[9px] font-semibold">No subjects mapped.</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs font-bold">
                  <Compass className="w-10 h-10 text-slate-400 mx-auto mb-2 stroke-[1.5]" />
                  <h4 className="text-xs font-extrabold text-slate-700">No courses defined</h4>
                  <p className="text-[10px] text-slate-500 max-w-xs mx-auto mt-1 font-semibold">
                    Generate an academic course program (e.g. B.Tech Computer Science) under this department.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500">
              <FolderOpen className="w-10 h-10 text-slate-400 mb-2 stroke-[1.5] animate-bounce" />
              <h4 className="text-xs font-extrabold text-slate-700">No department selected</h4>
              <p className="text-[10px] text-slate-500 max-w-xs mt-1 font-semibold">
                Select a department in the tree on the left to audit courses and sessions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Department Modal Dialog */}
      <AnimatePresence>
        {isDeptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeptOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl w-full max-w-md p-6 relative z-10 mx-4 text-slate-800"
            >
              <h3 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-200/60 flex items-center gap-2">
                <Building className="w-4.5 h-4.5 text-indigo-650" />
                Create Department Entity
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createDeptMutation.mutate();
                }}
                className="space-y-4 mt-4 font-semibold text-xs"
              >
                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Department Name</label>
                  <input
                    type="text"
                    required
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="e.g. Department of Mechanical Eng"
                    className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Department Code</label>
                  <input
                    type="text"
                    required
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value)}
                    placeholder="e.g. MED"
                    className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setIsDeptOpen(false)}
                    className="text-xs font-extrabold text-slate-505 hover:text-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createDeptMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Course Program Modal Dialog */}
      <AnimatePresence>
        {isCourseOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCourseOpen(false)}
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
                Create Course Program & Semesters
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createCourseMutation.mutate();
                }}
                className="space-y-4 mt-4 font-semibold text-xs"
              >
                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Program Name</label>
                  <input
                    type="text"
                    required
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="e.g. B.Tech Mechanical Engineering"
                    className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Program Code</label>
                    <input
                      type="text"
                      required
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      placeholder="e.g. BTech_ME"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Duration (Years)</label>
                    <select
                      value={durationYears}
                      onChange={(e) => setDurationYears(Number(e.target.value))}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-extrabold"
                    >
                      <option value={1}>1 Year</option>
                      <option value={2}>2 Years</option>
                      <option value={3}>3 Years</option>
                      <option value={4}>4 Years</option>
                      <option value={5}>5 Years</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setIsCourseOpen(false)}
                    className="text-xs font-extrabold text-slate-500 hover:text-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createCourseMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition disabled:opacity-50"
                  >
                    Generate Program & Semesters
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Subject Modal Dialog */}
      <AnimatePresence>
        {isSubjectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubjectOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl w-full max-w-md p-6 relative z-10 mx-4 text-slate-800"
            >
              <h3 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-200/60 flex items-center gap-2">
                <BookOpen className="w-4.5 h-4.5 text-indigo-650" />
                Add Subject Unit
              </h3>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createSubjectMutation.mutate();
                }}
                className="space-y-4 mt-4 font-semibold text-xs"
              >
                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Subject Name</label>
                  <input
                    type="text"
                    required
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="e.g. Thermodynamics"
                    className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Subject Code</label>
                    <input
                      type="text"
                      required
                      value={subjectCode}
                      onChange={(e) => setSubjectCode(e.target.value)}
                      placeholder="e.g. ME601"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Credits</label>
                    <input
                      type="number"
                      required
                      value={credits}
                      onChange={(e) => setCredits(Number(e.target.value))}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Target Semester</label>
                  <select
                    value={activeSemId}
                    onChange={(e) => setActiveSemId(e.target.value)}
                    className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-extrabold"
                  >
                    {semestersAndSubjects?.semesters
                      .filter((s) => s.course_id === activeCourseId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          Semester {s.number}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setIsSubjectOpen(false)}
                    className="text-xs font-extrabold text-slate-500 hover:text-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSubjectMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-755 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition disabled:opacity-50"
                  >
                    Add Subject
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
