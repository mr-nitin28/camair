'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FacultyService, type ScopedStudent } from '@/lib/services/faculty-service';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList, SkeletonCard } from '@/components/ui/skeleton';
import {
  Users,
  Search,
  Filter,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Award,
  AlertTriangle,
  CalendarCheck,
  CheckCircle,
  GraduationCap,
  BookOpen,
  UserCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function ScopedStudentsDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'at_risk' | 'on_leave'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // 1. Fetch Scoped Students
  const {
    data: students,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['scoped-students', selectedSection, selectedBatch, selectedStatus],
    queryFn: () =>
      FacultyService.getScopedStudents('00000000-0000-0000-0000-000000000020', {
        section: selectedSection,
        batch: selectedBatch,
        status: selectedStatus,
      }),
  });

  // Client-side search filtering
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q) ||
        s.enrollmentNo.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Set default selected student
  const activeStudent = useMemo(() => {
    if (!filteredStudents || filteredStudents.length === 0) return null;
    if (selectedStudentId) {
      const found = filteredStudents.find((s) => s.id === selectedStudentId);
      if (found) return found;
    }
    return filteredStudents[0];
  }, [filteredStudents, selectedStudentId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard height={80} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonList count={6} />
          <div className="md:col-span-2">
            <SkeletonCard height={400} />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !students) {
    return (
      <ErrorState
        title="Failed to Load Scoped Directory"
        message={error instanceof Error ? error.message : 'Unable to query student profiles.'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold mb-1">
            <Link href="/faculty" className="hover:text-primary flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Faculty Console
            </Link>
            <span>•</span>
            <span>Department: Computer Science & Engineering</span>
            <span>•</span>
            <span>Enrolled Roster: {students.length} Students</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Scoped Students Directory
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/faculty/attendance"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:bg-primary/90 transition-all"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Take Roll Call</span>
          </Link>
        </div>
      </div>

      {/* 2. FILTER & SEARCH TOOLBAR */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by student name, roll number, or enrolment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/40 border border-border/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Section Filter */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 text-xs font-bold">
            <span className="px-2 text-muted-foreground text-[10px] uppercase">Section:</span>
            {['All', 'Section A', 'Section B'].map((sec) => (
              <button
                key={sec}
                onClick={() => setSelectedSection(sec)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedSection === sec
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>

          {/* Batch Filter */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 text-xs font-bold">
            <span className="px-2 text-muted-foreground text-[10px] uppercase">Batch:</span>
            {['All', '2023-2027', '2022-2026'].map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBatch(b)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedBatch === b
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Risk Status Filter */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 text-xs font-bold">
            <span className="px-2 text-muted-foreground text-[10px] uppercase">Status:</span>
            {(['all', 'active', 'at_risk'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-lg transition-all capitalize ${
                  selectedStatus === st
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {st === 'at_risk' ? 'At Risk (<75%)' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. SPLIT-PANE DIRECTORY (List on Left, Rich Academic Dossier on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Student List */}
        <div className="lg:col-span-5 rounded-3xl bg-card border border-border shadow-xs overflow-hidden max-h-[750px] flex flex-col">
          <div className="p-3.5 bg-muted/50 border-b border-border text-xs font-bold text-muted-foreground flex items-center justify-between">
            <span>Enrolled Students ({filteredStudents.length})</span>
            <span>Click to inspect dossier</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {filteredStudents.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No Students Found"
                description="No student profiles match your search criteria."
              />
            ) : (
              filteredStudents.map((s) => {
                const isSelected = activeStudent?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStudentId(s.id)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-l-primary'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted border border-border/60 flex items-center justify-center font-bold text-xs text-foreground shrink-0 uppercase">
                        {s.name.split(' ').map((p) => p[0]).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {s.name}
                          </span>
                          {s.isShortage && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-bold">
                              &lt;75%
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {s.rollNo} • {s.section}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono text-xs font-bold ${
                          s.isShortage ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {s.attendancePercentage}%
                      </span>
                      <span className="block text-[10px] text-muted-foreground font-semibold">
                        CGPA {s.cgpa}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Student Academic Profile & Dossier */}
        <div className="lg:col-span-7">
          {activeStudent ? (
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
              {/* Profile Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/40 border border-primary/30 flex items-center justify-center font-black text-xl text-primary shrink-0 uppercase">
                    {activeStudent.name.split(' ').map((p) => p[0]).join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-foreground">
                        {activeStudent.name}
                      </h2>
                      <StatusBadge
                        status={activeStudent.isShortage ? 'pending' : 'active'}
                        label={activeStudent.isShortage ? 'ATTENDANCE RISK' : 'IN GOOD STANDING'}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      Roll No: {activeStudent.rollNo} • Enrolment: {activeStudent.enrollmentNo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {activeStudent.programme} • Semester {activeStudent.semester} ({activeStudent.section})
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Assigned Advisor
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {activeStudent.advisor}
                  </span>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    Attendance Rate
                  </span>
                  <p
                    className={`text-xl font-black mt-1 font-mono ${
                      activeStudent.isShortage ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {activeStudent.attendancePercentage}%
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    Current SGPA
                  </span>
                  <p className="text-xl font-black mt-1 font-mono text-foreground">
                    {activeStudent.sgpa.toFixed(2)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    Cumulative CGPA
                  </span>
                  <p className="text-xl font-black mt-1 font-mono text-foreground">
                    {activeStudent.cgpa.toFixed(2)}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    Active Backlogs
                  </span>
                  <p
                    className={`text-xl font-black mt-1 font-mono ${
                      activeStudent.backlogsCount > 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-foreground'
                    }`}
                  >
                    {activeStudent.backlogsCount}
                  </p>
                </div>
              </div>

              {/* Attendance Risk Warning Alert if < 75% */}
              {activeStudent.isShortage && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-bold text-rose-700 dark:text-rose-400">
                      Attendance Shortage Advisory Notice
                    </h4>
                    <p className="text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                      Student attendance ({activeStudent.attendancePercentage}%) is currently below the mandatory 75% institutional examination clearance threshold. Recommended for academic counseling and recovery sessions.
                    </p>
                  </div>
                </div>
              )}

              {/* Contact Information & Hostel Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Contact & Campus Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center gap-3">
                    <Mail className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{activeStudent.email}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center gap-3">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    <span>{activeStudent.phone}</span>
                  </div>
                  <div className="sm:col-span-2 p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-primary shrink-0" />
                    <span>{activeStudent.contactAddress}</span>
                  </div>
                </div>
              </div>

              {/* Deep Links to Workflows */}
              <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Quick Actions for {activeStudent.name}:
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/faculty/leaves?studentId=${activeStudent.id}`}
                    className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted"
                  >
                    Check Leaves
                  </Link>
                  <Link
                    href={`/faculty/doubts?studentId=${activeStudent.id}`}
                    className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted"
                  >
                    View Doubts
                  </Link>
                  <Link
                    href={`/faculty/attendance`}
                    className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
                  >
                    Open Roll Call
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="Select a Student"
              description="Choose a student from the list to view their authoritative academic dossier."
            />
          )}
        </div>
      </div>
    </div>
  );
}
