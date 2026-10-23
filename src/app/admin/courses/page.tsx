'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AdminService,
  type InstitutionCourse,
  type CourseSubject,
  type AcademicSession,
  type TeachingAssignment,
  type HistorySafetyCheckResult,
} from '@/lib/services/admin-service';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabList, TabTrigger, TabContent } from '@/components/ui/tabs';
import {
  Compass,
  BookOpen,
  Calendar,
  Users,
  Plus,
  Trash2,
  ShieldAlert,
  GraduationCap,
  Layers,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export default function CoursesSessionsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'courses' | 'subjects' | 'sessions' | 'assignments'>('subjects');

  // History Safety Modal state for subjects
  const [safetyCheckResult, setSafetyCheckResult] = useState<HistorySafetyCheckResult | null>(null);
  const [targetSubject, setTargetSubject] = useState<CourseSubject | null>(null);

  // Queries
  const { data: courses, isLoading: loadingCourses } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => AdminService.getCourses(),
  });

  const { data: subjects, isLoading: loadingSubjects } = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: () => AdminService.getSubjects(),
  });

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: () => AdminService.getSessions(),
  });

  const { data: teachingAssignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['admin-teaching-assignments'],
    queryFn: () => AdminService.getTeachingAssignments(),
  });

  const handleDeleteSubject = async (sub: CourseSubject) => {
    setTargetSubject(sub);
    const safety = await AdminService.checkDestructiveSafety('subject', sub.id);
    setSafetyCheckResult(safety);
  };

  const isLoading = loadingCourses || loadingSubjects || loadingSessions || loadingAssignments;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-96 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-20 mb-4" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curricula, Subjects & Teaching Assignments"
        description="Manage degree programmes, course syllabi, semester schedules, and faculty subject assignments."
      />

      <Tabs defaultValue="subjects" value={activeTab} onValueChange={(val) => setActiveTab(val as 'courses' | 'subjects' | 'sessions' | 'assignments')}>
        <TabList className="mb-6">
          <TabTrigger value="subjects">
            <BookOpen className="w-4 h-4 mr-1.5" />
            <span>Subjects & Syllabi ({subjects?.length || 0})</span>
          </TabTrigger>
          <TabTrigger value="assignments">
            <GraduationCap className="w-4 h-4 mr-1.5" />
            <span>Teaching Assignments ({teachingAssignments?.length || 0})</span>
          </TabTrigger>
          <TabTrigger value="courses">
            <Compass className="w-4 h-4 mr-1.5" />
            <span>Degree Programmes ({courses?.length || 0})</span>
          </TabTrigger>
          <TabTrigger value="sessions">
            <Calendar className="w-4 h-4 mr-1.5" />
            <span>Academic Sessions ({sessions?.length || 0})</span>
          </TabTrigger>
        </TabList>

        {/* 1. SUBJECTS TAB */}
        <TabContent value="subjects">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[var(--text)]">Curriculum Subjects</h3>
                <p className="text-xs text-[var(--text-muted)]">Course modules, credit allocations, and attendance safety locks.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects?.map((sub) => (
                <div
                  key={sub.id}
                  className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)]">
                        {sub.code}
                      </span>
                      <StatusBadge
                        status={sub.status === 'Active' ? 'success' : 'neutral'}
                        label={sub.type}
                      />
                    </div>
                    <h4 className="text-sm font-extrabold text-[var(--text)] tracking-tight mt-1">
                      {sub.name}
                    </h4>
                    <span className="text-xs text-[var(--text-muted)] font-semibold block mt-0.5">
                      {sub.courseCode} • Semester {sub.semester}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--text)] tabular-nums">
                      {sub.credits} Credits
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubject(sub)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Safeguarded Subject Deletion"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabContent>

        {/* 2. TEACHING ASSIGNMENTS TAB */}
        <TabContent value="assignments">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)]">Faculty Teaching Allocations</h3>
              <p className="text-xs text-[var(--text-muted)]">Active teacher mappings for theory roll calls and grading.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] uppercase text-[10px] font-extrabold tracking-wider">
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Faculty Member</th>
                    <th className="py-3 px-4">Semester & Section</th>
                    <th className="py-3 px-4">Academic Session</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {teachingAssignments?.map((ta) => (
                    <tr key={ta.id} className="hover:bg-[var(--surface-2)] transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-extrabold text-[var(--accent)] mr-2">{ta.subjectCode}</span>
                        <span className="font-semibold text-[var(--text)]">{ta.subjectName}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[var(--text)] flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        {ta.facultyName}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[var(--text)]">
                        Semester {ta.semester} • Section {ta.section}
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--text-muted)]">
                        {ta.sessionCode}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <StatusBadge status="success" label="Active Allocation" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabContent>

        {/* 3. PROGRAMMES / COURSES TAB */}
        <TabContent value="courses">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)]">Degree Programmes</h3>
              <p className="text-xs text-[var(--text-muted)]">Affiliated undergraduate and graduate academic programs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {courses?.map((c) => (
                <div key={c.id} className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black font-mono text-[var(--accent)] px-2 py-0.5 rounded bg-[var(--accent-soft)]">
                      {c.code}
                    </span>
                    <StatusBadge status={c.status === 'Active' ? 'success' : 'neutral'} label={c.status} />
                  </div>
                  <h4 className="text-sm font-extrabold text-[var(--text)] tracking-tight mt-1">{c.name}</h4>
                  <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)] font-semibold">
                    <span>{c.durationYears} Years Duration</span>
                    <span>{c.totalCredits} Total Credits</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabContent>

        {/* 4. SESSIONS TAB */}
        <TabContent value="sessions">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)]">Academic Sessions & Calendars</h3>
              <p className="text-xs text-[var(--text-muted)]">Term boundaries and operational academic years.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions?.map((s) => (
                <div key={s.id} className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-extrabold text-[var(--text)]">{s.name}</h4>
                    <StatusBadge status={s.isCurrent ? 'success' : 'neutral'} label={s.isCurrent ? 'Current Session' : 'Archived'} />
                  </div>
                  <div className="mt-3 text-xs text-[var(--text-muted)] font-medium flex items-center gap-3">
                    <span>From: {s.startDate}</span>
                    <span>•</span>
                    <span>To: {s.endDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabContent>
      </Tabs>

      {/* HISTORY SAFETY MODAL FOR SUBJECTS */}
      {safetyCheckResult && targetSubject && (
        <Dialog
          isOpen={true}
          onClose={() => {
            setSafetyCheckResult(null);
            setTargetSubject(null);
          }}
          title="History Safety: Subject Cannot Be Deleted"
          description="Preserving historical student transcripts and marks records."
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block text-sm mb-1">
                  Protected Syllabus Record: {targetSubject.code}
                </span>
                <p className="leading-relaxed">{safetyCheckResult.reason}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--surface-2)] text-xs space-y-2">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                Historical Records Connected:
              </span>
              <ul className="space-y-1 font-semibold text-[var(--text)]">
                <li>• {safetyCheckResult.dependencies.attendanceSessionsCount} Attendance Class Sessions</li>
                <li>• {safetyCheckResult.dependencies.examinationMarksCount} Assessment Marks Records</li>
                <li>• {safetyCheckResult.dependencies.activeEnrollmentsCount} Student Course Registrations</li>
              </ul>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Under UGC and NAAC institutional accreditation guidelines, academic course modules with historical marks cannot be deleted. Deactivate or archive the subject instead.
            </p>

            <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  setSafetyCheckResult(null);
                  setTargetSubject(null);
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                Acknowledge Safety Lock
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
