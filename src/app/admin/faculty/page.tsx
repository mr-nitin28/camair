'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Search,
  Plus,
  ArrowLeft,
  Trash2,
  Phone,
  Mail,
  BookOpen,
  CalendarCheck,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface FacultyMember {
  id: string;
  faculty_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department_id: string;
  created_at: string;
  departments?: { name: string; code: string };
}

export default function FacultyRegistryPage() {
  const { admin } = useAppStore();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);

  // Form states
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [facultyIdInput, setFacultyIdInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [deptId, setDeptId] = useState('');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['admin-depts-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('*');
      return data || [];
    },
  });

  // Fetch Faculty List
  const { data: facultyMembers, isLoading } = useQuery({
    queryKey: ['admin-faculty-registry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faculty')
        .select('*, departments(*)')
        .order('first_name', { ascending: true });
      if (error) throw error;
      return data as FacultyMember[];
    },
  });

  // Set default selection
  React.useEffect(() => {
    if (facultyMembers && facultyMembers.length > 0 && !selectedFacultyId) {
      setSelectedFacultyId(facultyMembers[0].id);
    }
  }, [facultyMembers, selectedFacultyId]);

  // Fetch details (workload subjects & sections) for active faculty member
  const { data: workload } = useQuery({
    queryKey: ['admin-faculty-workload', selectedFacultyId],
    queryFn: async () => {
      if (!selectedFacultyId) return null;
      
      const { data: subjectsList } = await supabase
        .from('faculty_subjects')
        .select('*, subjects(*)')
        .eq('faculty_id', selectedFacultyId);

      const { data: classesList } = await supabase
        .from('faculty_classes')
        .select('*, courses(*), semesters(*)')
        .eq('faculty_id', selectedFacultyId);

      return {
        subjects: subjectsList || [],
        classes: classesList || [],
      };
    },
    enabled: !!selectedFacultyId,
  });

  // Enroll Faculty Mutation
  const enrollFacultyMutation = useMutation({
    mutationFn: async () => {
      const facultyUuid = crypto.randomUUID();

      // 1. Create auth user
      const { error: authError } = await supabase.rpc('admin_create_user', {
        p_id: facultyUuid,
        p_email: email.trim(),
        p_password: 'password123',
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_role: 'Faculty',
      });

      if (authError) throw authError;

      // 2. Create faculty record
      const { error: profileError } = await supabase.from('faculty').insert({
        id: facultyUuid,
        faculty_id: facultyIdInput.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phoneInput.trim() || null,
        department_id: deptId,
      });

      if (profileError) throw profileError;

      // 3. Log Action
      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `Recruited faculty member: Dr. ${firstName} ${lastName} (${facultyIdInput})`,
        affected_records: `faculty: ${facultyUuid}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faculty-registry'] });
      setIsEnrollOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setFacultyIdInput('');
      setPhoneInput('');
      setSuccessMsg('Faculty member enrolled successfully. (Default password: password123)');
      setTimeout(() => setSuccessMsg(null), 4000);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Failed to enroll faculty.');
    },
  });

  // Delete Faculty Mutation
  const deleteFacultyMutation = useMutation({
    mutationFn: async (id: string) => {
      const f = facultyMembers?.find((fac) => fac.id === id);
      const name = f ? `Dr. ${f.first_name} ${f.last_name}` : id;

      const { error } = await supabase.from('faculty').delete().eq('id', id);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_email: admin?.name || 'Admin',
        role: admin?.role || 'Super Admin',
        action: `De-enrolled faculty: ${name}`,
        affected_records: `faculty: ${id}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faculty-registry'] });
      setSelectedFacultyId(null);
    },
  });

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !facultyIdInput || !deptId) {
      setErrorMsg('Please complete all required fields.');
      return;
    }
    setErrorMsg(null);
    enrollFacultyMutation.mutate();
  };

  const filteredFaculty = useMemo(() => {
    if (!facultyMembers) return [];
    return facultyMembers.filter((f) => {
      const q = searchQuery.toLowerCase();
      const fullName = `dr. ${f.first_name} ${f.last_name}`.toLowerCase();
      return (
        fullName.includes(q) ||
        f.faculty_id.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q)
      );
    });
  }, [facultyMembers, searchQuery]);

  const activeFaculty = facultyMembers?.find((f) => f.id === selectedFacultyId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/admin" className="text-xs text-slate-500 hover:text-indigo-650 font-extrabold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">Faculty Registry Desk</h2>
          <p className="text-slate-550 text-xs mt-1 font-semibold">
            Manage teacher payroll listings, course workloads, subject mappings, and department assignments.
          </p>
        </div>

        <button
          onClick={() => {
            if (departments?.length) setDeptId(departments[0].id);
            setIsEnrollOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-sm flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Recruit Faculty Member
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

      {/* Registry Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Faculty List table */}
        <div className="lg:col-span-2 bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col h-[70vh] shadow-sm">
          {/* Search bar */}
          <div className="p-4 border-b border-slate-200/60 bg-white/20">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-450" />
              <input
                type="text"
                placeholder="Search faculty members by name, id, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/40 border border-slate-200/60 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-455 focus:outline-none focus:border-indigo-500 transition font-semibold"
              />
            </div>
          </div>

          <div className="flex-grow overflow-y-auto">
            {isLoading ? (
              <div className="p-12 text-center text-slate-550">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                <p className="text-xs font-bold">Loading faculty staff...</p>
              </div>
            ) : filteredFaculty.length > 0 ? (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/30 border-b border-slate-200/60 text-slate-550 uppercase font-extrabold text-[9.5px] tracking-wider">
                    <th className="py-3 px-4">Instructor details</th>
                    <th className="py-3 px-4">Faculty ID</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 font-semibold text-slate-700">
                  {filteredFaculty.map((f) => (
                    <tr
                      key={f.id}
                      onClick={() => setSelectedFacultyId(f.id)}
                      className={`hover:bg-white/40 transition cursor-pointer ${
                        selectedFacultyId === f.id ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="text-slate-900 font-extrabold">Dr. {f.first_name} {f.last_name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{f.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-850 font-sans font-semibold">{f.faculty_id}</td>
                      <td className="py-3.5 px-4 text-slate-700">{f.departments?.name}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to de-enroll Dr. ${f.first_name} ${f.last_name}?`)) {
                              deleteFacultyMutation.mutate(f.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-450 hover:text-red-655 hover:bg-red-50 transition"
                          title="De-enroll instructor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-500 text-xs font-bold">No faculty matching search filters.</div>
            )}
          </div>
        </div>

        {/* Right: workload dossier card */}
        <div className="lg:col-span-1">
          {activeFaculty ? (
            <div className="bg-white/50 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Profile Card Header */}
              <div className="flex gap-3.5 pb-4 border-b border-slate-200/60">
                <div className="w-12 h-12 rounded-full bg-white/40 border border-slate-200 flex items-center justify-center font-black text-slate-800 uppercase text-xs shadow-inner shrink-0">
                  {activeFaculty.first_name[0]}{activeFaculty.last_name[0]}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 font-sans">Dr. {activeFaculty.first_name} {activeFaculty.last_name}</h3>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">{activeFaculty.faculty_id}</span>
                  <span className="bg-white/70 border border-slate-200/80 text-indigo-750 text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded mt-1.5 inline-block">
                    {activeFaculty.departments?.name}
                  </span>
                </div>
              </div>

              {/* Dossier Workload detail lists */}
              <div className="space-y-4 text-xs font-bold text-slate-700">
                {workload && (
                  <>
                    {/* Subjects taught */}
                    <div>
                      <span className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2.5">
                        Assigned Subject Workload
                      </span>
                      {workload.subjects.length > 0 ? (
                        <div className="space-y-2">
                          {workload.subjects.map((sub: any) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between p-2.5 bg-white/30 border border-slate-200/60 rounded-xl"
                            >
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span className="text-slate-800 leading-tight font-semibold">{sub.subjects?.name}</span>
                              </div>
                              <span className="text-[9.5px] text-slate-500 shrink-0 font-extrabold">
                                {sub.subjects?.code}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-550 italic text-[11px] font-semibold">No subjects mapped.</span>
                      )}
                    </div>

                    {/* Classes taught */}
                    <div className="border-t border-slate-200/60 pt-4">
                      <span className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2.5">
                        Timetable Class Mappings
                      </span>
                      {workload.classes.length > 0 ? (
                        <div className="space-y-2">
                          {workload.classes.map((cls: any) => (
                            <div
                              key={cls.id}
                              className="flex items-center justify-between p-2.5 bg-white/30 border border-slate-200/60 rounded-xl"
                            >
                              <div className="flex items-center gap-2">
                                <CalendarCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span className="text-slate-800 leading-tight font-semibold">
                                  {cls.courses?.code} (Sem {cls.semesters?.number || 6})
                                </span>
                              </div>
                              <span className="text-[9.5px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-extrabold uppercase shrink-0">
                                Section {cls.section}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-550 italic text-[11px] font-semibold">No classes mapped.</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white/40 border border-dashed border-slate-250/80 rounded-2xl p-8 text-center text-slate-500 h-64 flex flex-col items-center justify-center">
              <GraduationCap className="w-10 h-10 text-slate-400 mb-2 stroke-[1.5] animate-bounce" />
              <h4 className="text-xs font-extrabold text-slate-700">No dossier selected</h4>
              <p className="text-[10px] text-slate-500 max-w-xs mt-1 font-semibold">
                Select an instructor in the registry table list to view workloads.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recruiting Modal Dialog */}
      <AnimatePresence>
        {isEnrollOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEnrollOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl w-full max-w-lg p-6 relative z-10 mx-4 text-slate-800"
            >
              <h3 className="text-sm font-extrabold text-slate-900 pb-3 border-b border-slate-200/60 flex items-center gap-2">
                <GraduationCap className="w-4.5 h-4.5 text-indigo-600" />
                Recruit Faculty Profile Log
              </h3>

              <form onSubmit={handleEnrollSubmit} className="space-y-4 mt-4 font-semibold text-xs">
                {errorMsg && (
                  <div className="p-3 bg-red-550/10 border border-red-200/40 rounded-xl text-red-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-655 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Sarah"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Jenkins"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. s.jenkins@campusos.dev"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Faculty ID *</label>
                    <input
                      type="text"
                      required
                      value={facultyIdInput}
                      onChange={(e) => setFacultyIdInput(e.target.value)}
                      placeholder="e.g. FAC202602"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Department *</label>
                    <select
                      value={deptId}
                      onChange={(e) => setDeptId(e.target.value)}
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition font-extrabold"
                    >
                      {departments?.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-555 uppercase block mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="e.g. +1 (555) 019-3382"
                      className="w-full bg-white/40 border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-indigo-500 transition font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setIsEnrollOpen(false)}
                    className="text-xs font-extrabold text-slate-500 hover:text-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={enrollFacultyMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition disabled:opacity-50"
                  >
                    {enrollFacultyMutation.isPending ? 'Enrolling...' : 'Recruit Staff Member'}
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
