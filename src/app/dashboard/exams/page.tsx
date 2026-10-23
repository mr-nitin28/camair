'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  StudentService,
  type SemesterResultSheet,
} from '@/lib/services/student-service';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  Award,
  CalendarCheck,
  FileDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  History,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';
import Link from 'next/link';

export default function StudentExamsPage() {
  const [selectedSemester, setSelectedSemester] = useState<number>(6);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['student-exam-results'],
    queryFn: () => StudentService.getExamResults(),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="student-exams-loading">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not load examination records"
          message={error instanceof Error ? error.message : 'Failed to retrieve published assessment sheets.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const { studentProfile, semesters, enrolledPendingSubjects, backlogHistory } = data;
  const currentSheet = semesters.find((s) => s.semesterNumber === selectedSemester) || semesters[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" data-testid="student-exams">
      {/* Header */}
      <PageHeader
        title="Examinations & Published Results"
        description="Official grade sheets verified and published by the Examination Cell"
        badge={<StatusBadge label="UGC 10-Point Scale" variant="info" size="sm" />}
        actions={
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] transition shadow-sm cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-[var(--accent)]" />
            <span>Download Official Grade Sheet</span>
          </button>
        }
      />

      {/* Student Profile & Academic Enrollment */}
      <div className="p-4 md:p-5 rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--surface)] to-[var(--surface-2)] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-[var(--text)]">{studentProfile.name}</h3>
                <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
                  {studentProfile.enrolmentNo} • Roll: {studentProfile.rollNo}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {studentProfile.programme} • {studentProfile.section}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Faculty Advisor: <strong className="text-[var(--text)]">{studentProfile.advisor}</strong> • Session {studentProfile.academicSession}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center min-w-[100px]">
              <span className="text-[10px] font-bold text-[var(--text-muted)] block uppercase">Grading Scale</span>
              <span className="font-mono font-bold text-[var(--text)] text-xs">{studentProfile.gradingScale}</span>
            </div>
            <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center min-w-[100px]">
              <span className="text-[10px] font-bold text-[var(--text-muted)] block uppercase">Active Semester</span>
              <span className="font-mono font-bold text-[var(--accent)] text-xs">Semester {studentProfile.currentSemester}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Semester Selector Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          {semesters.map((sem) => (
            <button
              key={sem.semesterNumber}
              type="button"
              onClick={() => setSelectedSemester(sem.semesterNumber)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                selectedSemester === sem.semesterNumber
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)] shadow-sm'
                  : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-2)]'
              }`}
            >
              Semester {sem.semesterNumber}
              {sem.isCurrent && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-amber-400/20 text-amber-700 dark:text-amber-300">
                  Current
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Backlog Status Pill */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)]">Academic Standing:</span>
          {backlogHistory.filter((b) => b.status === 'active').length === 0 ? (
            <StatusBadge label="Zero Active Backlogs" variant="success" size="sm" />
          ) : (
            <StatusBadge label="Active Backlog Detected" variant="danger" size="sm" />
          )}
        </div>
      </div>

      {/* Semester Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
            Semester {currentSheet.semesterNumber} SGPA
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--text)] tabular-nums">
              {currentSheet.sgpa.toFixed(2)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">/ 10.00</span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] block mt-1">
            Calculated via UGC weighted credit formula
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
            Credits Assessed
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--text)] tabular-nums">
              {currentSheet.totalCredits}
            </span>
            <span className="text-xs text-[var(--text-muted)]">Credits</span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] block mt-1">
            All enrolled credits accounted
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
            Publication Status
          </span>
          <div className="mt-2 flex items-center gap-2">
            {currentSheet.isPublished ? (
              <StatusBadge label="Published & Verified" variant="success" size="md" />
            ) : (
              <StatusBadge label="Partial / In-Progress" variant="warning" size="md" />
            )}
          </div>
          <span className="text-[11px] text-[var(--text-muted)] block mt-1 font-mono">
            {currentSheet.publishedDate ? `Published: ${currentSheet.publishedDate}` : 'End-Term pending release'}
          </span>
        </div>
      </div>

      {/* In-Progress / Notice Banner if ongoing */}
      {currentSheet.unreleasedNotice && (
        <div className="p-4 rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-amber-950 dark:text-amber-100">
              Notice: Ongoing Semester Evaluation
            </h4>
            <p className="mt-0.5 leading-relaxed">{currentSheet.unreleasedNotice}</p>
          </div>
        </div>
      )}

      {/* Published Course Results Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">
              Published Course Grade Roster
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Only verified and published assessments are displayed. Draft or review-pending marks are excluded.
            </p>
          </div>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {currentSheet.results.length} Published Assessment{currentSheet.results.length === 1 ? '' : 's'}
          </span>
        </div>

        {currentSheet.results.length === 0 ? (
          <EmptyState
            title={currentSheet.isPublished ? "No examination records" : "Results not published yet"}
            description={
              currentSheet.isPublished
                ? "No assessment records are registered for this semester."
                : "Official grade sheets for this semester have not been released by the Examination Cell."
            }
            className="py-12 border-none"
          />
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--surface-2)]/60 text-[var(--text-muted)] border-b border-[var(--border)] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Subject Code</th>
                  <th className="py-3 px-4">Course Name & Assessment</th>
                  <th className="py-3 px-4 text-center">Credits</th>
                  <th className="py-3 px-4 text-center">Max Marks</th>
                  <th className="py-3 px-4 text-center">Marks Obtained</th>
                  <th className="py-3 px-4 text-center">Letter Grade</th>
                  <th className="py-3 px-4 text-center">Grade Points</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-medium">
                {currentSheet.results.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-[var(--surface-2)]/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-[var(--accent)]">
                      {r.subjectCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[var(--text)]">{r.subjectName}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{r.assessmentName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">{r.credits}</td>
                    <td className="py-3.5 px-4 text-center font-mono">{r.maxMarks}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-[var(--text)]">
                      {r.marksObtained}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded font-black text-xs bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]">
                        {r.grade}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-black text-[var(--accent)]">
                      {r.gradePoints.toFixed(1)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <StatusBadge label="Published" variant="success" size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enrolled Subjects Pending Official Publication */}
      {currentSheet.isCurrent && enrolledPendingSubjects && enrolledPendingSubjects.length > 0 && (
        <div className="p-5 md:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
            <div>
              <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Enrolled Subjects — Assessments Under Evaluation
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Current semester enrolled subjects where end-term marks are being verified prior to official publication
              </p>
            </div>
            <StatusBadge label="Pending Official Release" variant="warning" size="sm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {enrolledPendingSubjects.map((sub) => (
              <div
                key={sub.subjectCode}
                className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)]/70 transition space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[var(--accent)]">
                    {sub.subjectCode} • {sub.credits} Credits
                  </span>
                  <StatusBadge label="Under Evaluation" variant="warning" size="sm" />
                </div>
                <h4 className="text-xs font-bold text-[var(--text)]">{sub.subjectName}</h4>
                <p className="text-[11px] text-[var(--text-muted)]">{sub.facultyName}</p>
                <div className="pt-1.5 border-t border-[var(--border)]/60 text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                  {sub.notice}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Cleared Backlog Section */}
      <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-bold text-[var(--text)]">Academic Remediation & Backlog History</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Record of remedial evaluations, supplementary examinations, and re-evaluations.
        </p>

        <div className="space-y-2">
          {backlogHistory.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-mono font-bold text-[var(--accent)] mr-2">
                  {item.subjectCode}
                </span>
                <span className="font-semibold text-[var(--text)]">{item.subjectName}</span>
                <span className="text-[11px] text-[var(--text-muted)] ml-2">
                  (Encountered: Semester {item.semester})
                </span>
              </div>
              <StatusBadge
                label={item.status === 'cleared' ? 'Cleared via Supplementary' : 'Active'}
                variant={item.status === 'cleared' ? 'success' : 'danger'}
                size="sm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
