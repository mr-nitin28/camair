'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FacultyService } from '@/lib/services/faculty-service';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList, SkeletonCard } from '@/components/ui/skeleton';
import {
  Compass,
  CalendarCheck,
  Award,
  HelpCircle,
  CalendarClock,
  FileEdit,
  ArrowRight,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function FacultyDashboard() {
  const { data: summary, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['faculty-console-summary'],
    queryFn: () => FacultyService.getConsoleSummary(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard height={140} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonCard height={96} />
          <SkeletonCard height={96} />
          <SkeletonCard height={96} />
          <SkeletonCard height={96} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <SkeletonList count={3} />
          </div>
          <div className="space-y-4">
            <SkeletonList count={2} />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <ErrorState
        title="Failed to Load Faculty Console"
        message={error instanceof Error ? error.message : 'Unable to synchronize faculty schedule and queues.'}
        onRetry={() => refetch()}
      />
    );
  }

  const { faculty, metrics, todaySchedule, attendanceTasks, pendingLeavesSummary, unansweredDoubtsSummary, gradingDeadlines } = summary;

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER */}
      <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 overflow-hidden shadow-lg border border-indigo-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-xl text-white shadow-inner shrink-0">
              {faculty.firstName[0]}{faculty.lastName[0]}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold text-indigo-200 uppercase tracking-widest">
                <Sparkles className="w-3 h-3 text-indigo-300" /> Academic Operations Console
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
                Good Morning, {faculty.name}
              </h1>
              <p className="text-indigo-200 text-xs md:text-sm mt-0.5 font-medium">
                {faculty.department} • Cabin {faculty.cabin} • Session {faculty.academicSession}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/faculty/attendance"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-950 font-bold text-xs shadow-md hover:bg-indigo-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <CalendarCheck className="w-4 h-4 text-indigo-700" />
              <span>Launch Roll Call</span>
            </Link>
            <Link
              href="/faculty/exams"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition-all"
            >
              <Award className="w-4 h-4" />
              <span>Marks Entry</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. KPI METRICS TILES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/faculty/attendance" className="block transition-transform hover:scale-[1.01]">
          <StatCard
            label="Pending Attendance"
            value={metrics.pendingAttendanceSessions}
            icon={CalendarCheck}
            trend={{
              value: metrics.pendingAttendanceSessions > 0 ? 'Action required today' : 'Up to date',
              direction: metrics.pendingAttendanceSessions > 0 ? 'neutral' : 'up',
            }}
          />
        </Link>
        <Link href="/faculty/leaves" className="block transition-transform hover:scale-[1.01]">
          <StatCard
            label="Pending Leaves"
            value={metrics.pendingLeavesCount}
            icon={CalendarClock}
            trend={{
              value: metrics.pendingLeavesCount > 0 ? `${metrics.pendingLeavesCount} in review queue` : 'Queue cleared',
              direction: metrics.pendingLeavesCount > 0 ? 'down' : 'up',
            }}
          />
        </Link>
        <Link href="/faculty/doubts" className="block transition-transform hover:scale-[1.01]">
          <StatCard
            label="Unanswered Doubts"
            value={metrics.unansweredDoubtsCount}
            icon={HelpCircle}
            trend={{
              value: metrics.unansweredDoubtsCount > 0 ? `${metrics.unansweredDoubtsCount} student tickets` : 'All answered',
              direction: metrics.unansweredDoubtsCount > 0 ? 'down' : 'up',
            }}
          />
        </Link>
        <Link href="/faculty/students" className="block transition-transform hover:scale-[1.01]">
          <StatCard
            label="Scoped Students"
            value={metrics.totalScopedStudents}
            icon={Users}
            trend={{
              value: 'Assigned CSE Roster',
              direction: 'neutral',
            }}
          />
        </Link>
      </div>

      {/* 3. MAIN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Schedule & Attendance Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Teaching Schedule */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Today's Teaching Schedule & Classes
                </h2>
              </div>
              <Link
                href="/faculty/classes"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Full Timetable <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {todaySchedule.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No Classes Scheduled Today"
                description="You have no lectures or lab sessions assigned for today's timetable."
              />
            ) : (
              <div className="space-y-3">
                {todaySchedule.map((item) => (
                  <div
                    key={item.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                      item.isNext
                        ? 'bg-primary/5 border-primary/30 shadow-sm ring-1 ring-primary/20'
                        : 'bg-card hover:bg-muted/30 border-border/70'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center font-bold text-primary shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">
                            {item.subjectCode} — {item.subjectName}
                          </h3>
                          {item.isNext && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase">
                              Upcoming
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.time} • {item.sectionName} • {item.room}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <StatusBadge
                        status={item.status === 'submitted' ? 'active' : 'pending'}
                        label={item.status === 'submitted' ? 'Marked' : 'Pending Roll Call'}
                      />
                      <Link
                        href={item.deepLink}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-xs"
                      >
                        {item.status === 'submitted' ? 'Review / Revise' : 'Take Attendance'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendance Action Tasks (Deep Link Screen) */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Attendance Roll-Call Desk
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Flagship Speed Screen
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attendanceTasks.map((task) => (
                <Link
                  key={task.sessionId}
                  href={task.deepLink}
                  className="group p-4 rounded-2xl border border-border/70 hover:border-primary/50 bg-card hover:bg-muted/20 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-primary">
                        {task.subjectCode} • {task.sectionName}
                      </span>
                      <StatusBadge
                        status={task.status === 'submitted' ? 'active' : 'pending'}
                        label={task.status === 'submitted' ? 'Submitted' : 'Pending'}
                      />
                    </div>
                    <h3 className="text-sm font-bold text-foreground mt-2 group-hover:text-primary transition-colors">
                      {task.subjectName}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {task.time} • {task.room}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">
                      {task.markedStudents} of {task.totalStudents} Marked
                    </span>
                    <span className="text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open Roll Call <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Approvals Queue, Doubts & Deadlines */}
        <div className="space-y-6">
          {/* Pending Leaves Queue Summary */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Leave Approvals
                </h2>
              </div>
              <Link
                href="/faculty/leaves"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Review All ({pendingLeavesSummary.totalPending})
              </Link>
            </div>

            {pendingLeavesSummary.items.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                All student leave applications resolved.
              </p>
            ) : (
              <div className="space-y-2.5">
                {pendingLeavesSummary.items.map((leave) => (
                  <Link
                    key={leave.id}
                    href={`/faculty/leaves?id=${leave.id}`}
                    className="block p-3.5 rounded-2xl border border-border/60 hover:border-amber-400/50 bg-card hover:bg-muted/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {leave.studentName} ({leave.rollNo})
                      </span>
                      {leave.isUrgent && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold">
                          Risk &lt; 75%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {leave.leaveType} • {leave.dates}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1 italic line-clamp-1">
                      "{leave.reason}"
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Unanswered Doubts Queue */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Doubts Inbox
                </h2>
              </div>
              <Link
                href="/faculty/doubts"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Inbox ({unansweredDoubtsSummary.totalUnanswered})
              </Link>
            </div>

            {unansweredDoubtsSummary.items.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No unanswered doubts pending.
              </p>
            ) : (
              <div className="space-y-2.5">
                {unansweredDoubtsSummary.items.map((doubt) => (
                  <Link
                    key={doubt.id}
                    href={`/faculty/doubts?id=${doubt.id}`}
                    className="block p-3.5 rounded-2xl border border-border/60 hover:border-sky-400/50 bg-card hover:bg-muted/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-foreground line-clamp-1">
                        {doubt.title}
                      </span>
                      <span className="text-[10px] font-semibold text-primary/80 shrink-0">
                        {doubt.subjectCode}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {doubt.studentName} • {doubt.timeAgo}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Grading Deadlines */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Grading & Deadlines
                </h2>
              </div>
              <Link
                href="/faculty/exams"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Marks Grid
              </Link>
            </div>

            <div className="space-y-2.5">
              {gradingDeadlines.map((task) => (
                <Link
                  key={task.id}
                  href={`/faculty/exams?assessmentId=${task.id}`}
                  className="block p-3.5 rounded-2xl border border-border/60 hover:border-emerald-400/50 bg-card hover:bg-muted/20 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {task.assessmentName}
                    </span>
                    <StatusBadge
                      status={task.status === 'published' ? 'active' : task.status === 'submitted' ? 'pending' : 'draft'}
                      label={task.status.toUpperCase()}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {task.subjectCode} • {task.sectionName}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/30 text-[11px] text-muted-foreground font-semibold">
                    <span>Due: {task.dueDate}</span>
                    <span className="text-primary">{task.pendingEvaluations} pending marks</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
