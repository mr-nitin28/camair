'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Plus,
  ArrowLeft,
  Trash2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Building,
  GraduationCap,
  Award,
  CreditCard,
  CalendarDays,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  department_id: string;
  course_id: string;
  semester_id: string;
  cgpa: number;
  sgpa: number;
  status: 'Active' | 'Suspended' | 'Graduated';
  admission_date: string;
  departments?: { name: string; code: string };
  courses?: { name: string; code: string };
  semesters?: { number: number };
}

export default function StudentRegistryPage() {
  const { admin } = useAppStore();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Registration Form States
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [deptId, setDeptId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [semId, setSemId] = useState('');
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Lookups (depts, courses, sems)
  const { data: lookupData } = useQuery({
    queryKey: ['admin-lookups-students'],
    queryFn: async () => {
      const { data: depts } = await supabase.from('departments').select('*');
      const { data: courses } = await supabase.from('courses').select('*');
      const { data: semesters } = await supabase.from('semesters').select('*, courses(*)');
      return {
        depts: depts || [],
        courses: courses || [],
        semesters: semesters || [],
      };
    },
  });

  // Fetch Students Registry
  const { data: students, isLoading } = useQuery({
    queryKey: ['admin-students-registry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, departments(*), courses(*), semesters(*)')
        .order('student_id', { ascending: true });
      if (error) throw error;
      return data as Student[];
    },
  });

  // Set default selections
  React.useEffect(() => {
    if (students && students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  // Fetch Academic Details for Selected Student
  const { data: dossier } = useQuery({
    queryKey: ['admin-student-dossier', selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return null;
      const { data: attendance } = await supabase.from('attendance').select('*, subjects(*)').eq('student_id', selectedStudentId);
      const { data: results } = await supabase.from('results').select('*, subjects(*)').eq('student_id', selectedStudentId);
      const { data: fees } = await supabase.from('payments').select('*, fees(*)').eq('student_id', selectedStudentId);
      return {
        attendance: attendance || [],
        results: results || [],
        fees: fees || [],
      };
    },
    enabled: !!selectedStudentId,
  });

  // Register Student Mutation
  const registerStudentMutation = useMutation({
    mutationFn: async () => {
      const studentUuid = crypto.randomUUID();
      
      // 1. Create auth user via security definer RPC
      const { error: authError } = await supabase.rpc('admin_create_user', {
        p_id: studentUuid,
        p_email: email.trim(),
        p_password: 'password123', // Default password
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_role: 'Student',
      });

      if (authError) throw authError;

      // 2. Create student profile
      const { error: profileError } = await supabase.from('students').insert({
        id: studentUuid,
        student_id: studentIdInput.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phoneInput.trim() || null,
        address: addressInput.trim() || null,
        department_id: deptId,
        course_id: courseId,
        semester_id: semId,
        status: 'Active',
      });

      if (profileError) throw profileError;

      // 3. Log Action
      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `Enrolled student: ${firstName} ${lastName} (${studentIdInput})`,
        affected_records: `students: ${studentUuid}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students-registry'] });
      setIsRegisterOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setStudentIdInput('');
      setPhoneInput('');
      setAddressInput('');
      setSuccessMsg('Student enrolled successfully. (Default password: password123)');
      setTimeout(() => setSuccessMsg(null), 4000);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Failed to enroll student.');
    },
  });

  // Delete Student Mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      // Find name for log
      const s = students?.find((st) => st.id === id);
      const studentName = s ? `${s.first_name} ${s.last_name}` : id;

      // Delete from public.students (cascade will delete related data, or delete auth user directly)
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;

      // Log Action
      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `De-enrolled student: ${studentName}`,
        affected_records: `students: ${id}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students-registry'] });
      setSelectedStudentId(null);
    },
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !studentIdInput || !deptId || !courseId || !semId) {
      setErrorMsg('Please fill in all mandatory fields.');
      return;
    }
    setErrorMsg(null);
    registerStudentMutation.mutate();
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter((s) => {
      const q = searchQuery.toLowerCase();
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      return (
        fullName.includes(q) ||
        s.student_id.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery]);

  const activeStudent = students?.find((s) => s.id === selectedStudentId);

  // Stats calculation
  const attendanceRate = useMemo(() => {
    if (!dossier?.attendance || dossier.attendance.length === 0) return 100;
    const present = dossier.attendance.filter((a) => a.status === 'Present' || a.status === 'Late').length;
    return Math.round((present / dossier.attendance.length) * 100);
  }, [dossier]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs text-slate-500 hover:text-indigo-650 font-extrabold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">Student Registry Desk</h2>
          <p className="text-slate-550 text-xs mt-1 font-semibold">
            Review student rosters, manage enrollments, and check complete academic portfolios.
          </p>
        </div>

        <button
          onClick={() => {
            if (lookupData?.depts.length && lookupData?.courses.length && lookupData?.semesters.length) {
              setDeptId(lookupData.depts[0].id);
              setCourseId(lookupData.courses[0].id);
              setSemId(lookupData.semesters[0].id);
            }
            setIsRegisterOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-sm flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Enroll New Student
        </button>
      </div>

      {/* Success notification */}
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

      {/* Master Grid Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Student list registry */}
        <div className="lg:col-span-2 bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col h-[70vh] shadow-sm">
          {/* Search bar */}
          <div className="p-4 border-b border-slate-200/60 flex items-center gap-3 bg-white/20">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-450" />
              <input
                type="text"
                placeholder="Search students by name, id, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/40 border border-slate-200/60 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-450 focus:outline-none focus:border-indigo-500 transition font-semibold"
              />
            </div>
          </div>

          {/* Roster table */}
          <div className="flex-grow overflow-y-auto">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                <p className="text-xs font-bold">Loading student roster...</p>
              </div>
            ) : filteredStudents.length > 0 ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/30 border-b border-slate-200/60 text-slate-550 uppercase font-extrabold text-[9.5px] tracking-wider">
                    <th className="py-3 px-4">Student details</th>
                    <th className="py-3 px-4">Campus ID</th>
                    <th className="py-3 px-4">Department & Course</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                  {filteredStudents.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`hover:bg-white/40 transition cursor-pointer ${
                        selectedStudentId === s.id ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 font-extrabold">{s.first_name} {s.last_name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{s.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-sans font-semibold">{s.student_id}</td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-bold">{s.departments?.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{s.courses?.code} • Semester {s.semesters?.number || 6}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[9.5px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          s.status === 'Active' ? 'bg-emerald-500/10 border-emerald-250/20 text-emerald-800' :
                          s.status === 'Suspended' ? 'bg-red-500/10 border-red-250/20 text-red-800' :
                          'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to de-enroll ${s.first_name} ${s.last_name}?`)) {
                              deleteStudentMutation.mutate(s.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-450 hover:text-red-650 hover:bg-red-50 transition"
                          title="De-enroll student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs font-bold">No students registered in search.</div>
            )}
          </div>
        </div>

        {/* Right column: Student Dossier Profile details */}
        <div className="lg:col-span-1">
          {activeStudent ? (
            <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Profile Card Header */}
              <div className="flex gap-3.5 pb-4 border-b border-slate-200/60">
                <div className="w-12 h-12 rounded-full bg-white/40 border border-slate-200 flex items-center justify-center font-black text-slate-800 uppercase text-sm shadow-inner shrink-0">
                  {activeStudent.first_name[0]}{activeStudent.last_name[0]}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 font-sans">{activeStudent.first_name} {activeStudent.last_name}</h3>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">{activeStudent.student_id}</span>
                  <span className="text-[9.5px] font-extrabold text-indigo-650 uppercase mt-1 block">Semester {activeStudent.semesters?.number || 6}</span>
                </div>
              </div>

              {/* dossier Contact Info */}
              <div className="space-y-3.5 text-xs font-bold text-slate-700">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-450 shrink-0" />
                  <span className="truncate">{activeStudent.email}</span>
                </div>
                {activeStudent.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-450 shrink-0" />
                    <span>{activeStudent.phone}</span>
                  </div>
                )}
                {activeStudent.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-450 shrink-0 mt-0.5" />
                    <span className="leading-tight text-slate-655">{activeStudent.address}</span>
                  </div>
                )}
              </div>

              {/* Dossier Academic metrics */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-200/60 pt-4">
                <div className="bg-white/40 border border-slate-200 p-3 rounded-xl flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <div>
                    <span className="text-[9px] font-extrabold uppercase text-slate-500 block">CGPA / SGPA</span>
                    <span className="text-xs font-extrabold text-slate-900 block mt-0.5">
                      {activeStudent.cgpa} / {activeStudent.sgpa}
                    </span>
                  </div>
                </div>

                <div className="bg-white/40 border border-slate-200 p-3 rounded-xl flex items-center gap-2.5">
                  <CalendarDays className="w-5 h-5 text-indigo-600" />
                  <div>
                    <span className="text-[9px] font-extrabold uppercase text-slate-500 block">Attendance</span>
                    <span className="text-xs font-extrabold text-slate-900 block mt-0.5">
                      {attendanceRate}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Dossier transaction logs */}
              {dossier && (
                <div className="space-y-4 border-t border-slate-200/60 pt-4 text-xs font-semibold">
                  <div>
                    <span className="text-[9.5px] font-extrabold text-slate-500 uppercase block mb-2">Grade Logs</span>
                    {dossier.results.length > 0 ? (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {dossier.results.map((res) => (
                          <div key={res.id} className="flex items-center justify-between bg-white/30 p-2 rounded border border-slate-200/60 text-[11px] font-bold text-slate-700">
                            <span className="truncate">{res.subjects?.name}</span>
                            <span className="font-extrabold text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[9.5px]">
                              {res.grade}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-[11px] font-semibold">No grade entries recorded.</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[9.5px] font-extrabold text-slate-500 uppercase block mb-2">Fee invoices</span>
                    {dossier.fees.length > 0 ? (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {dossier.fees.map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between bg-white/30 p-2 rounded border border-slate-200/60 text-[11px] font-bold text-slate-700">
                            <span>Amount: ${inv.amount_paid}</span>
                            <span className="font-extrabold text-emerald-800 bg-emerald-500/10 px-1.5 py-0.5 border border-emerald-200/40 rounded text-[9.5px]">
                              {inv.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-[11px] font-semibold">No invoices recorded.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/40 border border-dashed border-slate-250/80 rounded-2xl p-8 text-center text-slate-500 h-64 flex flex-col items-center justify-center">
              <Users className="w-10 h-10 text-slate-400 mb-2 stroke-[1.5] animate-bounce" />
              <h4 className="text-xs font-extrabold text-slate-700">No dossier selected</h4>
              <p className="text-[10px] text-slate-500 max-w-xs mt-1 font-semibold">
                Select a student in the roster list to check their academic dossier.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Registration Modal Dialog */}
      <AnimatePresence>
        {isRegisterOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRegisterOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-2xl w-full max-w-lg p-6 relative z-10 mx-4 text-slate-800"
            >
              <h3 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-200/60 flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-600" />
                Enroll Student Registry Record
              </h3>

              <form onSubmit={handleRegisterSubmit} className="space-y-4 mt-4 font-semibold text-xs">
                {errorMsg && (
                  <div className="p-3 bg-red-550/10 border border-red-200/40 rounded-xl text-red-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-655 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-550 uppercase block mb-1.5">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. John"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-550 uppercase block mb-1.5">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Doe"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-550 uppercase block mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. j.doe@email.com"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-550 uppercase block mb-1.5">Campus ID *</label>
                    <input
                      type="text"
                      required
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value)}
                      placeholder="e.g. STU202611"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-550 uppercase block mb-1.5">Department *</label>
                    <select
                      value={deptId}
                      onChange={(e) => setDeptId(e.target.value)}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-extrabold"
                    >
                      {lookupData?.depts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-550 uppercase block mb-1.5">Course *</label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-extrabold"
                    >
                      {lookupData?.courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-550 uppercase block mb-1.5">Semester *</label>
                    <select
                      value={semId}
                      onChange={(e) => setSemId(e.target.value)}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-extrabold"
                    >
                      {lookupData?.semesters
                        .filter((s) => s.course_id === courseId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            Sem {s.number}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-550 uppercase block mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+1 (555) 012-3456"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-550 uppercase block mb-1.5">Mailing Address</label>
                    <input
                      type="text"
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      placeholder="e.g. 102 Science St"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setIsRegisterOpen(false)}
                    className="text-xs font-extrabold text-slate-500 hover:text-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={registerStudentMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition disabled:opacity-50"
                  >
                    {registerStudentMutation.isPending ? 'Enrolling...' : 'Confirm Enrollment'}
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
