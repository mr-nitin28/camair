'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import {
  StudentService,
  type AttendanceHistoryEntry,
  type AttendanceStatus,
} from '@/lib/services/student-service';
import { PageHeader } from '@/components/ui/page-header';
import { ProgressRing } from '@/components/ui/progress-ring';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton, SkeletonChart } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  CalendarCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';

const StudentAttendanceChart = dynamic(
  () => import('@/components/charts/student-attendance-charts'),
  {
    ssr: false,
    loading: () => <SkeletonChart height={240} />,
  }
);

const monthlyAttendanceData = [
  { name: 'Jan', Percentage: 91 },
  { name: 'Feb', Percentage: 88 },
  { name: 'Mar', Percentage: 87.5 },
];

export default function StudentAttendancePage() {
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['student-attendance-details'],
    queryFn: () => StudentService.getAttendanceDetails(),
    staleTime: 60 * 1000,
  });

  const filteredLogs = useMemo(() => {
    if (!data) return [];
    if (selectedSubjectFilter === 'All') return data.historyLogs;
    return data.historyLogs.filter(
      (log) => log.subjectId === selectedSubjectFilter || log.subjectCode === selectedSubjectFilter
    );
  }, [data, selectedSubjectFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="student-attendance-loading">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not load attendance records"
          message={error instanceof Error ? error.message : 'Failed to retrieve authoritative attendance ledger.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const { overall, subjects } = data;

  return (
    <div className="space-y-6" data-testid="student-attendance">
      {/* Header */}
      <PageHeader
        title="Attendance & Session Roster"
        description="Comprehensive attendance tracking with regulatory 75% threshold enforcement"
        badge={<StatusBadge label="Semester 6 • 2025-2026" variant="info" size="sm" />}
        actions={
          <Link
            href="/dashboard/leaves"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] transition shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Apply For Medical Leave</span>
          </Link>
        }
      />

      {/* Overview Grid: Ring + Monthly Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ring Card */}
        <div className="p-5 md:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">Institutional Standing</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Threshold: 75.00%</p>
              </div>
              <StatusBadge
                label={overall.isShortage ? 'Shortage Alert' : 'Eligible for Exams'}
                variant={overall.isShortage ? 'danger' : 'success'}
                size="sm"
              />
            </div>

            <div className="my-5 flex flex-col items-center justify-center">
              <ProgressRing
                value={overall.percentage}
                size={130}
                strokeWidth={11}
                threshold={75}
                label="Overall Attendance"
              />
              <p className="text-xs text-center mt-3 font-semibold text-[var(--text-muted)]">
                {overall.attendedSessions} attended / {overall.totalSessions} sessions logged
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-2)]/60 text-xs">
            {overall.isShortage ? (
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Must attend {overall.classesNeededToRecover} consecutive classes to restore threshold.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Buffer available: can miss up to {overall.classesAllowedToMiss} classes.</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Progression Chart */}
        <div className="lg:col-span-2">
          <StudentAttendanceChart data={monthlyAttendanceData} />
        </div>
      </div>

      {/* Subject-Wise Summary Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--text)]">Subject Attendance Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {subjects.map((sub) => {
            const isShort = sub.metrics.isShortage;
            return (
              <div
                key={sub.subjectId}
                className={`p-4 rounded-2xl border transition-all ${
                  isShort
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]/40 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-extrabold text-[var(--accent)]">
                      {sub.subjectCode} • {sub.credits} Credits
                    </span>
                    <h4 className="text-xs font-bold text-[var(--text)] truncate mt-0.5">
                      {sub.subjectName}
                    </h4>
                    <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 truncate">
                      {sub.facultyName}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-base font-black tabular-nums ${
                        isShort ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {sub.metrics.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[var(--border)]/60 flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
                  <span>Present: {sub.metrics.attendedSessions}</span>
                  <span>Absent: {sub.metrics.absentSessions}</span>
                  <span>Total: {sub.metrics.totalSessions}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Session-by-Session History Log */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">
              Daily Session Attendance History
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Auditable session roll-call logs submitted by assigned faculty
            </p>
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="All">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.subjectCode} - {s.subjectName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <EmptyState
            title="No session records"
            description="No attendance logs found matching the selected filter."
            className="py-12 border-none"
          />
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--surface-2)]/60 text-[var(--text-muted)] border-b border-[var(--border)] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Slot</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Assigned Faculty</th>
                  <th className="py-3 px-4 text-right">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-medium">
                {filteredLogs.map((log) => {
                  let badgeVariant: 'success' | 'danger' | 'warning' | 'info' = 'success';
                  if (log.status === 'Absent') badgeVariant = 'danger';
                  else if (log.status === 'Late') badgeVariant = 'warning';
                  else if (log.status === 'Excused') badgeVariant = 'info';

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[var(--surface-2)]/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-[var(--text)]">
                        {new Date(log.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--text-muted)]">
                        Slot {log.slotNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[var(--accent)] mr-1.5">
                          {log.subjectCode}
                        </span>
                        <span className="text-[var(--text)] font-semibold">{log.subjectName}</span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">
                        {log.facultyName}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <StatusBadge
                          label={log.status}
                          variant={badgeVariant}
                          size="sm"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
