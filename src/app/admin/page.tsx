'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminService, type AdminKpiMetric } from '@/lib/services/admin-service';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton, SkeletonChart } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Tooltip } from '@/components/ui/tooltip';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Award,
  CreditCard,
  CheckSquare,
  ArrowRight,
  TrendingUp,
  History,
  ShieldAlert,
  Info,
  Calendar,
  Layers,
  FileSpreadsheet,
  Megaphone,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const AdminDashboardCharts = dynamic(
  () => import('@/components/charts/admin-dashboard-charts'),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart height={256} />
        <SkeletonChart height={256} />
      </div>
    ),
  }
);

const kpiIcons: Record<string, React.ElementType> = {
  'kpi-enrollment': Users,
  'kpi-faculty': GraduationCap,
  'kpi-attendance': CalendarCheck,
  'kpi-published-results': Award,
  'kpi-fee-collection': CreditCard,
  'kpi-pending-approvals': CheckSquare,
};

export default function AdminDashboardOverview() {
  const {
    data: summary,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-overview-summary'],
    queryFn: () => AdminService.getOverviewSummary(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-9 w-20 mb-2" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart height={256} />
          <SkeletonChart height={256} />
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <ErrorState
        title="Failed to Load Command Center Summary"
        message="The institutional analytics feed could not be retrieved. Check your network or permissions."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Institutional Command Center"
        description="Authoritative operating overview, revenue intelligence, and registry controls across all departments."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/students?action=import"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Bulk Import</span>
            </Link>
            <Link
              href="/admin/communications"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <Megaphone className="w-4 h-4 text-amber-500" />
              <span>Broadcast Notice</span>
            </Link>
          </div>
        }
      />

      {/* 1. KPI TILES WITH SPARKLINES, DELTA CHANGES & DOCUMENTED DEFINITIONS */}
      <section aria-label="Key Performance Indicators">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Key Institutional Metrics & Sparklines</span>
          </h2>
          <span className="text-[11px] font-semibold text-[var(--text-muted)]">
            Click metric card to inspect deep-linked report
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {summary.kpis.map((kpi) => {
            const Icon = kpiIcons[kpi.id] || TrendingUp;
            return (
              <Link
                key={kpi.id}
                href={kpi.deepLink}
                className="group block focus:outline-none focus:ring-2 focus:ring-[var(--accent)] rounded-2xl"
              >
                <div className="relative p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] group-hover:border-[var(--accent)] group-hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full">
                  {/* Top Bar: Title + Definition Tooltip + Icon */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">
                        {kpi.title}
                      </span>
                      <Tooltip content={kpi.definition} side="top">
                        <button
                          type="button"
                          className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                          aria-label={`Definition for ${kpi.title}`}
                          onClick={(e) => e.preventDefault()}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    </div>

                    <div className="p-2 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] shrink-0 border border-[var(--border)] group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Value + Sparkline */}
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <div className="text-2xl lg:text-3xl font-extrabold text-[var(--text)] tracking-tight tabular-nums">
                      {kpi.formattedValue}
                    </div>

                    {kpi.sparkline && kpi.sparkline.length > 1 && (
                      <div className="w-20 h-6 shrink-0" aria-hidden="true">
                        <svg width="80" height="24" className="overflow-visible">
                          <polyline
                            fill="none"
                            stroke={kpi.isPositiveTrend ? '#10B981' : '#EF4444'}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={(() => {
                              const min = Math.min(...kpi.sparkline);
                              const max = Math.max(...kpi.sparkline);
                              const range = max - min || 1;
                              const step = 80 / (kpi.sparkline.length - 1);
                              return kpi.sparkline
                                .map((v, idx) => {
                                  const x = idx * step;
                                  const y = 24 - ((v - min) / range) * 20 - 2;
                                  return `${x},${y}`;
                                })
                                .join(' ');
                            })()}
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Delta Change & Period Footnote */}
                  <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between text-xs">
                    <span
                      className={`inline-flex items-center gap-0.5 font-bold tabular-nums px-1.5 py-0.5 rounded-md ${
                        kpi.deltaPercent >= 0
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}
                    >
                      {kpi.deltaPercent >= 0 ? `+${kpi.deltaPercent}%` : `${kpi.deltaPercent}%`} vs prev
                    </span>

                    <span className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {kpi.period}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 2. RECHARTS TREND VISUALIZATIONS */}
      <section aria-label="Institutional Trends">
        <AdminDashboardCharts
          collectionTrends={summary.collectionTrends}
          attendanceTrends={summary.attendanceTrends}
        />
      </section>

      {/* 3. QUICK ACTIONS & RECENT AUDIT TRAIL FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Action Dispatcher */}
        <div className="lg:col-span-1 p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text-muted)] mb-3">
              Administrative Workflows
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
              Fast-path shortcuts to operational consoles, bulk ingestion, and critical publication gates.
            </p>

            <div className="space-y-2">
              {summary.quickActions.map((qa) => (
                <Link
                  key={qa.id}
                  href={qa.href}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all text-xs font-bold text-[var(--text)] group"
                >
                  <span className="group-hover:text-[var(--accent)] transition-colors">{qa.label}</span>
                  <div className="flex items-center gap-2">
                    {qa.badge && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-[var(--surface-3)] text-[var(--text)]">
                        {qa.badge}
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-0.5 group-hover:text-[var(--accent)] transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--border)]">
            <Link
              href="/admin/security"
              className="text-xs font-bold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Review Institutional Security Policy</span>
            </Link>
          </div>
        </div>

        {/* Recent Audit Log Feed */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[var(--text)]">
                Live Audit Trail
              </h3>
            </div>
            <Link
              href="/admin/audit-logs"
              className="text-xs font-bold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
            >
              <span>Full Audit Viewer</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {summary.recentAuditEvents.length === 0 ? (
            <EmptyState
              title="No Recent Audit Logs"
              description="Administrative audit entries will automatically appear here as changes are committed."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)] uppercase text-[10px] font-extrabold tracking-wider">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Target Entity</th>
                    <th className="py-2.5 px-3">Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {summary.recentAuditEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-[var(--surface-2)] transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                        {new Date(evt.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            evt.action === 'PUBLISH' || evt.action === 'APPROVE'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : evt.action === 'INSERT' || evt.action === 'BULK_IMPORT'
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                              : evt.action === 'DELETE' || evt.action === 'REJECT'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {evt.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[var(--text)]">
                        <span className="font-mono text-[11px] text-[var(--text-muted)] mr-1.5">
                          {evt.entityTable}:
                        </span>
                        <span>{evt.entityId}</span>
                      </td>
                      <td className="py-3 px-3 text-[var(--text-muted)] font-medium">
                        {evt.actorEmail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
