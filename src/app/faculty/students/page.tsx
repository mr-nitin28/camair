'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Users,
  Search,
  Filter,
  ArrowLeft,
  Phone,
  MapPin,
  Mail,
  Award,
  AlertTriangle,
  CalendarDays,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';

export default function StudentsDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Fetch Students list
  const { data: students, isLoading } = useQuery({
    queryKey: ['students-directory-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          departments(name, code),
          courses(name, code),
          semesters(number)
        `)
        .order('student_id', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch Selected Student Extra Details (Attendance & results)
  const { data: studentAcademicDetails } = useQuery({
    queryKey: ['student-academic-details', selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return null;
      
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*, subjects(*)')
        .eq('student_id', selectedStudentId);

      const { data: results } = await supabase
        .from('results')
        .select('*, subjects(*)')
        .eq('student_id', selectedStudentId);

      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('student_id', selectedStudentId)
        .order('created_at', { ascending: false });

      const { data: doubts } = await supabase
        .from('doubts')
        .select('*, subjects(*)')
        .eq('student_id', selectedStudentId)
        .order('created_at', { ascending: false });

      return {
        attendance: attendance || [],
        results: results || [],
        leaves: leaves || [],
        doubts: doubts || [],
      };
    },
    enabled: !!selectedStudentId,
  });

  // Filter student lists
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter((s: any) => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      const matchesQuery =
        fullName.includes(searchQuery.toLowerCase()) ||
        s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesQuery;
    });
  }, [students, searchQuery]);

  // Set default student select on load
  React.useEffect(() => {
    if (filteredStudents.length > 0 && !selectedStudentId) {
      setSelectedStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedStudentId]);

  const activeStudent = useMemo(() => {
    return students?.find((s) => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  // Calculate stats for detail view
  const calculatedStats = useMemo(() => {
    if (!studentAcademicDetails) return { attendanceRate: 0, totalClasses: 0, backlogCount: 0 };
    const atts = studentAcademicDetails.attendance;
    const total = atts.length;
    const present = atts.filter((a: any) => a.status === 'Present' || a.status === 'Late').length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 100;
    
    return {
      attendanceRate,
      totalClasses: total,
    };
  }, [studentAcademicDetails]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/faculty" className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspace
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Student Directory & Profiles</h2>
        <p className="text-slate-500 text-xs mt-1">Search student portfolios, audit attendance profiles, and view academic reports.</p>
      </div>

      {/* Directory Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Student List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[75vh]">
          {/* List Search */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search students by name, ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Directory Table */}
          <div className="flex-grow overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Loading directory...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">No students found.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold text-[9px] sticky top-0 z-10">
                    <th className="p-3.5 pl-5">Student ID</th>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5 text-center">CGPA</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s: any) => {
                    const isSelected = selectedStudentId === s.id;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-blue-50/40 font-semibold' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="p-3.5 pl-5 font-mono text-slate-500 font-bold">{s.student_id}</td>
                        <td className="p-3.5 text-slate-900">
                          {s.first_name} {s.last_name}
                        </td>
                        <td className="p-3.5 text-slate-500">{s.departments?.code}</td>
                        <td className="p-3.5 text-center font-bold text-slate-700">{s.cgpa}</td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                              s.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Profile Details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-[75vh] overflow-y-auto space-y-6">
          {activeStudent ? (
            <>
              {/* Profile Card Header */}
              <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-full bg-blue-950 border border-blue-700/30 flex items-center justify-center text-blue-300 font-bold uppercase text-lg shrink-0">
                  {activeStudent.first_name[0]}{activeStudent.last_name[0]}
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-sm font-bold text-slate-950 truncate">
                    {activeStudent.first_name} {activeStudent.last_name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{activeStudent.student_id}</span>
                </div>
              </div>

              {/* Contact parameters */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{activeStudent.email}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{activeStudent.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{activeStudent.address || 'No address'}</span>
                </div>
              </div>

              {/* Attendance and cgpa analytics panel */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-100 rounded-xl">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-lg font-bold text-slate-900">{calculatedStats.attendanceRate}%</span>
                    {calculatedStats.attendanceRate < 75 && (
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                  </div>
                  <span className="text-[8.5px] text-slate-400 font-semibold block mt-0.5">{calculatedStats.totalClasses} Lectures</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">CGPA / SGPA</span>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {activeStudent.cgpa} / {activeStudent.sgpa}
                  </p>
                  <span className="text-[8.5px] text-slate-400 font-semibold block mt-0.5">Sem {activeStudent.semesters?.number}</span>
                </div>
              </div>

              {/* Term results checklist */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> Term Grades Registry
                </span>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                  {studentAcademicDetails?.results?.length === 0 ? (
                    <div className="p-3 text-slate-400 text-center">No grades uploaded.</div>
                  ) : (
                    studentAcademicDetails?.results?.map((res: any) => (
                      <div key={res.id} className="p-3 bg-white flex items-center justify-between gap-3">
                        <div className="overflow-hidden">
                          <span className="font-semibold text-slate-800 block truncate">{res.subjects?.name}</span>
                          <span className="text-[9px] font-mono text-slate-400 font-bold block">{res.subjects?.code}</span>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md shrink-0">
                          Grade {res.grade}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Leave History list */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" /> Leave Logs
                </span>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
                  {studentAcademicDetails?.leaves?.length === 0 ? (
                    <div className="p-3 text-slate-400 text-center">No leave applications.</div>
                  ) : (
                    studentAcademicDetails?.leaves?.slice(0, 3).map((leave: any) => (
                      <div key={leave.id} className="p-3 bg-white flex items-center justify-between gap-3">
                        <div className="overflow-hidden">
                          <span className="font-bold text-slate-700 block truncate">{leave.leave_type} Leave</span>
                          <span className="text-[9px] text-slate-400 block truncate">{leave.reason}</span>
                        </div>
                        <span
                          className={`text-[8.5px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0 ${
                            leave.status === 'Approved'
                              ? 'bg-emerald-50 text-emerald-700'
                              : leave.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {leave.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <Users className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-xs font-semibold">Select a student record</p>
              <p className="text-[9.5px] mt-1 text-slate-400">Click on any directory row to inspect profile logs.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
