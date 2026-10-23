'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { StudentService } from '@/lib/services/student-service';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton, SkeletonChart } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  TrendingUp,
  Award,
  ChevronUp,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  FileDown,
} from 'lucide-react';
import Link from 'next/link';

const StudentPerformanceCharts = dynamic(
  () => import('@/components/charts/student-performance-charts'),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SkeletonChart height={240} />
        <SkeletonChart height={240} />
      </div>
    ),
  }
);

export default function StudentPerformancePage() {
  const {
    data: dashData,
    isLoading: isDashLoading,
    isError: isDashError,
    error: dashError,
    refetch: refetchDash,
  } = useQuery({
    queryKey: ['student-performance-dash'],
    queryFn: () => StudentService.getDashboardSummary(),
    staleTime: 60 * 1000,
  });

  const {
    data: examData,
    isLoading: isExamLoading,
    isError: isExamError,
    error: examError,
    refetch: refetchExam,
  } = useQuery({
    queryKey: ['student-performance-exams'],
    queryFn: () => StudentService.getExamResults(),
    staleTime: 60 * 1000,
  });

  const isLoading = isDashLoading || isExamLoading;
  const isError = isDashError || isExamError;
  const error = dashError || examError;

  const gpaTrend = useMemo(() => {
    if (!dashData) return [];
    return dashData.academicSummary.trend.map((pt) => ({
      name: pt.semester,
      SGPA: pt.sgpa,
      CGPA: pt.cgpa,
    }));
  }, [dashData]);

  const subjectScores = useMemo(() => {
    if (!examData) return [];
    const sem5 = examData.semesters.find((s) => s.semesterNumber === 5);
    if (!sem5) return [];
    return sem5.results.map((r) => ({
      name: r.subjectCode,
      fullName: r.subjectName,
      Score: r.marksObtained,
    }));
  }, [examData]);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="student-performance-loading">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonChart height={240} />
          <SkeletonChart height={240} />
        </div>
      </div>
    );
  }

  if (isError || !dashData || !examData) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not load performance records"
          message={error instanceof Error ? error.message : 'Failed to retrieve academic trajectory.'}
          onRetry={() => {
            refetchDash();
            refetchExam();
          }}
        />
      </div>
    );
  }

  const { academicSummary } = dashData;

  return (
    <div className="space-y-6" data-testid="student-performance">
      {/* Header */}
      <PageHeader
        title="Performance Analytics & Trajectory"
        description="Comprehensive evaluation metrics, credit accumulation, and semester trend progression"
        badge={<StatusBadge label="Academic Standing: Exemplary" variant="success" size="sm" />}
        actions={
          <Link
            href="/dashboard/exams"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] transition shadow-sm"
          >
            <Award className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>View Published Exam Sheets</span>
          </Link>
        }
      />

      {/* Top Academic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Cumulative CGPA"
          value={academicSummary.cgpa.toFixed(2)}
          subtext="Top 10% in Department Roster"
          icon={TrendingUp}
          delta={{
            value: 'Rank #4 / 120',
            isPositive: true,
          }}
        />
        <StatCard
          title="Latest Published SGPA"
          value={academicSummary.currentSgpa.toFixed(2)}
          subtext="Semester 5 Official Result"
          icon={Award}
          delta={{
            value: '+0.10 vs Sem 4',
            isPositive: true,
          }}
        />
        <StatCard
          title="Total Earned Credits"
          value={`${academicSummary.totalCreditsEarned}`}
          subtext="124 of 160 credits completed"
          icon={CalendarCheck}
          delta={{
            value: 'On Track',
            isPositive: true,
          }}
        />
      </div>

      {/* Dynamic Performance Charts */}
      <StudentPerformanceCharts
        gpaTrendData={gpaTrend}
        subjectMarksData={subjectScores}
      />

      {/* Semester by Semester Progression Breakdown */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">
              Historical Semester Progression
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Cumulative progression across all completed semesters
            </p>
          </div>
          <StatusBadge label="5 Semesters Completed" variant="info" size="sm" />
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--surface-2)]/60 text-[var(--text-muted)] border-b border-[var(--border)] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4 text-center">Semester SGPA</th>
                <th className="py-3 px-4 text-center">Progression CGPA</th>
                <th className="py-3 px-4 text-center">Delta vs Previous</th>
                <th className="py-3 px-4 text-right">Academic Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {academicSummary.trend.map((sem, idx) => {
                const prev = idx > 0 ? academicSummary.trend[idx - 1] : null;
                const delta = prev ? sem.sgpa - prev.sgpa : 0;

                return (
                  <tr
                    key={sem.semester}
                    className="hover:bg-[var(--surface-2)]/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-[var(--text)]">
                      {sem.semester}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-black text-[var(--accent)]">
                      {sem.sgpa.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-[var(--text)]">
                      {sem.cgpa.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      {idx === 0 ? (
                        <span className="text-[var(--text-muted)]">—</span>
                      ) : delta >= 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-0.5">
                          <ChevronUp className="w-3.5 h-3.5" />+{delta.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-bold inline-flex items-center gap-0.5">
                          -{Math.abs(delta).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <StatusBadge label="Cleared (No Backlogs)" variant="success" size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
