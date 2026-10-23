'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  StudentService,
  type AnnouncementItem,
} from '@/lib/services/student-service';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  Megaphone,
  Bell,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';
import Link from 'next/link';

export default function StudentAnnouncementsPage() {
  const [activeTab, setActiveTab] = useState<
    'All' | 'Alerts' | 'Announcements' | 'Activities' | 'Examinations' | 'Finance'
  >('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [readState, setReadState] = useState<Record<string, boolean>>({
    'ann-1': false,
    'ann-2': false,
    'ann-3': true,
    'ann-4': true,
  });

  const {
    data: announcements,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['student-announcements-list'],
    queryFn: () => StudentService.getAnnouncements(),
    staleTime: 60 * 1000,
  });

  const toggleRead = (id: string) => {
    setReadState((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const markAllRead = () => {
    if (!announcements) return;
    const next: Record<string, boolean> = {};
    announcements.forEach((a) => {
      next[a.id] = true;
    });
    setReadState(next);
  };

  const filteredAnnouncements = useMemo(() => {
    if (!announcements) return [];
    return announcements.filter((item) => {
      if (activeTab === 'Alerts' && item.type !== 'alert' && item.priority !== 'Critical') return false;
      if (activeTab === 'Announcements' && item.type !== 'announcement') return false;
      if (activeTab === 'Activities' && item.type !== 'activity') return false;
      if (activeTab === 'Examinations' && item.category !== 'Examinations') return false;
      if (activeTab === 'Finance' && item.category !== 'Finance') return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchContent = item.content.toLowerCase().includes(q);
        const matchAuthor = item.author.toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchAuthor) return false;
      }
      return true;
    });
  }, [announcements, activeTab, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="student-announcements-loading">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !announcements) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not load announcements"
          message={error instanceof Error ? error.message : 'Failed to retrieve institutional circulars.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const unreadCount = announcements.filter((a) => !readState[a.id]).length;

  return (
    <div className="space-y-6" data-testid="student-announcements">
      {/* Header */}
      <PageHeader
        title="Official Broadcasts & Circulars"
        description="Authoritative campus notices, examination circulars, and departmental alerts"
        badge={
          <StatusBadge
            label={`${unreadCount} Unread Notice${unreadCount === 1 ? '' : 's'}`}
            variant={unreadCount > 0 ? 'warning' : 'success'}
            size="sm"
          />
        }
        actions={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] transition shadow-sm cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Mark All as Read</span>
            </button>
          ) : undefined
        }
      />

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            {(['All', 'Alerts', 'Announcements', 'Activities', 'Examinations', 'Finance'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                  activeTab === tab
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)] shadow-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] border-[var(--border)]'
                }`}
              >
                {tab === 'All' ? 'All Broadcasts' : tab}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative sm:w-72">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter circulars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
        </div>
      </div>

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No circulars found"
          description="There are no announcements matching your active search or category filter."
          action={
            <button
              type="button"
              onClick={() => {
                setActiveTab('All');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-bold"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div className="space-y-3.5">
          {filteredAnnouncements.map((ann) => {
            const isRead = readState[ann.id] !== undefined ? readState[ann.id] : ann.isRead;
            const isCritical = ann.priority === 'Critical';

            return (
              <div
                key={ann.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isCritical
                    ? 'border-rose-300 dark:border-rose-900/70 bg-rose-50/20 dark:bg-rose-950/20 shadow-sm'
                    : isRead
                    ? 'border-[var(--border)] bg-[var(--surface)] opacity-85'
                    : 'border-[var(--border)] bg-[var(--surface)] shadow-sm'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                      {ann.type}
                    </span>
                    <StatusBadge
                      label={ann.priority}
                      variant={
                        ann.priority === 'Critical'
                          ? 'danger'
                          : ann.priority === 'High'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    />
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
                      {ann.category}
                    </span>
                    {!isRead && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        New
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3" />
                      {new Date(ann.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleRead(ann.id)}
                      className="text-[11px] font-bold text-[var(--accent)] hover:underline cursor-pointer"
                    >
                      {isRead ? 'Mark unread' : 'Mark read'}
                    </button>
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-sm font-bold text-[var(--text)] leading-snug">
                  {ann.title}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  {ann.content}
                </p>

                {/* Footer: Author & Optional Link */}
                <div className="mt-3.5 pt-3 border-t border-[var(--border)]/60 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-[var(--text-muted)] font-medium">
                    Issued by: <strong className="text-[var(--text)]">{ann.author}</strong>
                  </span>
                  {ann.link && (
                    <Link
                      href={ann.link}
                      className="inline-flex items-center gap-1 font-bold text-[var(--accent)] hover:underline text-xs"
                    >
                      <span>Take Action</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
