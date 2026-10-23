'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  StudentService,
  type StudentDashboardSummary,
} from '@/lib/services/student-service';
import { ProgressRing } from '@/components/ui/progress-ring';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader } from '@/components/ui/page-header';
import {
  CalendarCheck,
  TrendingUp,
  CreditCard,
  Award,
  BookOpen,
  CalendarDays,
  HelpCircle,
  Megaphone,
  ArrowRight,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Bell,
  Sparkles,
  ChevronRight,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

function SgpaSparkline({ trend }: { trend: { semester: string; sgpa: number; cgpa: number }[] }) {
  if (!trend || trend.length === 0) return null;
  const width = 170;
  const height = 40;
  const padding = 6;
  const minVal = Math.min(...trend.map((t) => t.sgpa)) - 0.2;
  const maxVal = Math.max(...trend.map((t) => t.sgpa)) + 0.2;
  const range = maxVal - minVal || 1;

  const points = trend.map((pt, idx) => {
    const x = padding + (idx / (trend.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((pt.sgpa - minVal) / range) * (height - 2 * padding);
    return { x, y, pt };
  });

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPathStr = `M ${points[0].x},${height} L ${polylineStr} L ${points[points.length - 1].x},${height} Z`;

  return (
    <div className="mt-3 pt-2.5 border-t border-[var(--border)]/60">
      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono mb-1.5">
        <span className="font-bold">SGPA Trajectory</span>
        <span className="text-purple-600 dark:text-purple-400 font-bold">Sem 1 → Sem 5</span>
      </div>
      <svg width={width} height={height} className="w-full overflow-visible">
        <defs>
          <linearGradient id="sparklineArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaPathStr} fill="url(#sparklineArea)" />
        <polyline
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylineStr}
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 4 : 2.5}
            className={
              i === points.length - 1
                ? 'fill-purple-600 stroke-white dark:stroke-slate-900 stroke-2'
                : 'fill-purple-400'
            }
          />
        ))}
      </svg>
      <div className="flex justify-between items-center text-[9px] font-mono text-[var(--text-muted)] mt-1">
        <span>Sem 1: {trend[0].sgpa.toFixed(1)}</span>
        <span className="font-extrabold text-purple-600 dark:text-purple-400">
          Sem 5: {trend[trend.length - 1].sgpa.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<StudentDashboardSummary>({
    queryKey: ['student-dashboard-overview'],
    queryFn: () => StudentService.getDashboardSummary(),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="student-dashboard-loading">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>

        {/* Today Strip Skeleton */}
        <Skeleton className="h-24 w-full rounded-2xl" />

        {/* Key Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>

        {/* Attendance Ring and Subjects */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not load student dashboard"
          message={error instanceof Error ? error.message : 'Failed to retrieve authoritative student records.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const {
    student,
    todayStrip,
    attendanceSummary,
    academicSummary,
    feeSummary,
    upcomingExams,
    recentAnnouncements,
    pendingRequestsCount,
  } = data;

  const overall = attendanceSummary.overall;

  return (
    <div className="space-y-6" data-testid="student-dashboard">
      {/* 1. Greeting & Page Header */}
      <PageHeader
        title={`Welcome back, ${student.name.split(' ')[0]} 👋`}
        description={`${student.program} • ${student.section} • Roll No: ${student.enrollmentNo}`}
        badge={<StatusBadge label="Academic Session 2025-2026" variant="info" size="sm" />}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/leaves"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] transition shadow-sm"
            >
              <CalendarDays className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Apply Leave</span>
            </Link>
            <Link
              href="/dashboard/doubts"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-fg)] transition shadow-sm"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Ask Doubt</span>
            </Link>
          </div>
        }
      />

      {/* 2. Today's Strip: Next Class, Due Items, Notices */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="p-4 md:p-5 rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--surface)] to-[var(--surface-2)] shadow-sm"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Next Class Focus */}
          <div className="flex items-start md:items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--accent)]">
                  Next Scheduled Class
                </span>
                {todayStrip.nextClass?.isNext && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Up Next
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-[var(--text)] truncate mt-0.5">
                {todayStrip.nextClass ? `${todayStrip.nextClass.subjectCode}: ${todayStrip.nextClass.subjectName}` : 'No further classes scheduled today'}
              </h3>
              {todayStrip.nextClass && (
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {todayStrip.nextClass.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {todayStrip.nextClass.room}
                  </span>
                  <span className="hidden sm:inline">• {todayStrip.nextClass.facultyName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Due Items & Notices */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* Fee Due Alert */}
            <Link
              href="/dashboard/fees"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-200 hover:opacity-90 transition shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-bold">Fee Due: Mar 31</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-200/50 dark:bg-amber-800/40 font-extrabold">
                {feeSummary.formattedBalance}
              </span>
            </Link>

            {/* Pending Requests / Due Tasks */}
            <Link
              href="/dashboard/leaves"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition text-xs text-[var(--text)]"
            >
              <CalendarDays className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span className="font-semibold">{todayStrip.pendingItemsCount} Active Request{todayStrip.pendingItemsCount === 1 ? '' : 's'}</span>
            </Link>

            {/* Urgent Notices */}
            {todayStrip.urgentNotices.map((notice) => (
              <Link
                key={notice.id}
                href="/dashboard/announcements"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition text-xs"
              >
                <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="font-semibold text-[var(--text)] truncate max-w-[170px]">
                  {notice.title}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {notice.timeAgo}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 3. Authoritative Metric Cards (SGPA, CGPA, Fee, Attendance) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Summary */}
        <StatCard
          title="Attendance"
          value={`${overall.percentage.toFixed(1)}%`}
          subtext={
            overall.isShortage
              ? `Shortage alert! Attend next ${overall.classesNeededToRecover} classes.`
              : `Safe: can miss up to ${overall.classesAllowedToMiss} classes.`
          }
          icon={CalendarCheck}
          delta={{
            value: overall.isShortage ? 'Below 75%' : 'Eligible',
            isPositive: !overall.isShortage,
          }}
        />

        {/* SGPA with Trend Sparkline */}
        <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Semester 5 SGPA
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-[var(--text)] tabular-nums">
                {academicSummary.currentSgpa.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                +0.10 vs Sem 4
              </span>
            </div>
            {/* SVG Trend Sparkline */}
            <SgpaSparkline trend={academicSummary.trend} />
          </div>
        </div>

        {/* Cumulative CGPA */}
        <StatCard
          title="Cumulative CGPA"
          value={academicSummary.cgpa.toFixed(2)}
          subtext={`${academicSummary.totalCreditsEarned} credits completed`}
          icon={TrendingUp}
          delta={{
            value: 'Top 10%',
            isPositive: true,
          }}
        />

        {/* Fee Balance & Due Date */}
        <StatCard
          title="Outstanding Fees"
          value={feeSummary.formattedBalance}
          subtext={`Due: ${new Date(feeSummary.nextDueDate).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}`}
          icon={CreditCard}
          delta={{
            value: feeSummary.balance.isFullyPaid ? 'Cleared' : 'Due Soon',
            isPositive: feeSummary.balance.isFullyPaid,
          }}
        />
      </div>

      {/* 4. Attendance Ring & Subject Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Institutional Attendance Ring */}
        <div className="p-5 md:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">Institutional Attendance</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Mandatory Threshold: 75.00%
                </p>
              </div>
              <Link
                href="/dashboard/attendance"
                className="text-xs font-bold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
              >
                Full Log <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="my-6 flex flex-col items-center justify-center">
              <ProgressRing
                value={overall.percentage}
                size={140}
                strokeWidth={12}
                threshold={75}
                label="Overall Attendance"
              />
              <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Institutional Threshold: 75.00%</span>
              </div>
              <p className="text-xs text-center mt-2 font-semibold text-[var(--text-muted)]">
                {overall.attendedSessions} of {overall.totalSessions} sessions attended
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-2)]/70 border border-[var(--border)]/60 text-xs">
            {overall.isShortage ? (
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Shortage Alert! You must attend {overall.classesNeededToRecover} consecutive classes to meet 75%.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Good Standing: Attendance is above 75% threshold.</span>
              </div>
            )}
          </div>
        </div>

        {/* Per-Subject Attendance Chips */}
        <div className="lg:col-span-2 p-5 md:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">Per-Subject Attendance Roster</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Semester 6 Enrolled Subjects & Realtime Percentages
                </p>
              </div>
              <StatusBadge
                label={`${attendanceSummary.subjects.length} Enrolled`}
                variant="info"
                size="sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attendanceSummary.subjects.map((sub) => {
                const isShort = sub.metrics.isShortage;
                const isWarning = !isShort && sub.metrics.percentage < 80;

                return (
                  <div
                    key={sub.subjectId}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isShort
                        ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                        : 'border-[var(--border)] bg-[var(--surface-2)]/30 hover:bg-[var(--surface-2)]/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono font-extrabold text-[var(--accent)] block">
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
                          className={`text-sm font-black tabular-nums block ${
                            isShort ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {sub.metrics.percentage.toFixed(0)}%
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block mt-0.5 font-mono">
                          {sub.metrics.attendedSessions}/{sub.metrics.totalSessions}
                        </span>
                      </div>
                    </div>

                    {/* Per-Subject Attendance Chip (Color, Icon, Label) */}
                    <div className="pt-2 border-t border-[var(--border)]/60 flex items-center justify-between">
                      {isShort ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          <span>Shortage (&lt;75%)</span>
                        </div>
                      ) : isWarning ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>Near Limit (75-80%)</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Good Standing (≥75%)</span>
                        </div>
                      )}
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        {isShort ? `Attend ${sub.metrics.classesNeededToRecover}` : `Can miss ${sub.metrics.classesAllowedToMiss}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border)]/60 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Institutional Policy: Minimum 75% required to sit for final semester examinations.</span>
            <Link href="/dashboard/attendance" className="font-bold text-[var(--accent)] hover:underline shrink-0">
              Details
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Upcoming Exams, Announcements & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Exams */}
        <div className="p-5 md:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              <Award className="w-4 h-4 text-[var(--accent)]" />
              Upcoming Examinations
            </h3>
            <Link
              href="/dashboard/exams"
              className="text-xs font-bold text-[var(--accent)] hover:underline"
            >
              View All
            </Link>
          </div>

          {upcomingExams.length === 0 ? (
            <EmptyState
              title="No upcoming exams"
              description="No exams scheduled at this time."
              className="py-8"
            />
          ) : (
            <div className="space-y-2.5">
              {upcomingExams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 hover:bg-[var(--surface-2)]/60 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-extrabold text-[var(--accent)]">
                        {exam.subjectCode} • {exam.type}
                      </span>
                      <h4 className="text-xs font-bold text-[var(--text)] mt-0.5">
                        {exam.subjectName}
                      </h4>
                    </div>
                    <StatusBadge label={`${exam.weightage}% wt`} variant="info" size="sm" />
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--text-muted)] font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(exam.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {exam.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {exam.room}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Announcements */}
        <div className="p-5 md:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[var(--accent)]" />
              Official Notices & Circulars
            </h3>
            <Link
              href="/dashboard/announcements"
              className="text-xs font-bold text-[var(--accent)] hover:underline"
            >
              Browse
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentAnnouncements.map((ann) => (
              <Link
                key={ann.id}
                href="/dashboard/announcements"
                className="block p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 hover:bg-[var(--surface-2)]/60 transition"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <StatusBadge
                    label={ann.priority}
                    variant={ann.priority === 'Critical' ? 'danger' : ann.priority === 'High' ? 'warning' : 'neutral'}
                    size="sm"
                  />
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    {new Date(ann.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-[var(--text)] leading-snug line-clamp-1">
                  {ann.title}
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                  {ann.content}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Launch & Pending Requests */}
        <div className="p-5 md:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--text)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              Quick Action Hub
            </h3>

            {/* Pending Requests Overview */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/dashboard/leaves"
                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)] transition text-center"
              >
                <span className="text-lg font-black text-[var(--text)] block">
                  {pendingRequestsCount.leaves}
                </span>
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Leave Request
                </span>
              </Link>
              <Link
                href="/dashboard/doubts"
                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)] transition text-center"
              >
                <span className="text-lg font-black text-[var(--text)] block">
                  {pendingRequestsCount.doubts}
                </span>
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                  Active Doubt
                </span>
              </Link>
            </div>

            {/* Direct Links */}
            <div className="space-y-1.5 pt-2">
              <Link
                href="/dashboard/notes"
                className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-2)] transition text-xs font-bold text-[var(--text)]"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[var(--accent)]" />
                  Course Notes & Handouts
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </Link>
              <Link
                href="/dashboard/fees"
                className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-2)] transition text-xs font-bold text-[var(--text)]"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Fee Ledger & Receipts
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </Link>
              <Link
                href="/dashboard/performance"
                className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-2)] transition text-xs font-bold text-[var(--text)]"
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  CGPA Progression Chart
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </Link>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--accent-soft)] text-xs text-[var(--accent)] font-semibold flex items-center justify-between">
            <span>Need immediate academic assistance?</span>
            <Link href="/dashboard/camai" className="font-extrabold hover:underline">
              Launch CamAI →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
