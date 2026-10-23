'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StudentService,
  type CampusActivityItem,
} from '@/lib/services/student-service';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  Sparkles,
  Calendar,
  MapPin,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  Check,
} from 'lucide-react';

export default function StudentActivitiesPage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const {
    data: activities,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['student-activities-list'],
    queryFn: () => StudentService.getActivities(),
    staleTime: 60 * 1000,
  });

  const registerMutation = useMutation({
    mutationFn: async ({
      activityId,
      register,
    }: {
      activityId: string;
      register: boolean;
    }) => {
      return StudentService.registerForActivity(activityId, register);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-activities-list'] });
      const target = activities?.find((a) => a.id === variables.activityId);
      const title = target ? `"${target.title}"` : 'activity';
      setToastMessage({
        type: 'success',
        text: variables.register
          ? `You have successfully registered for ${title}!`
          : `Your registration for ${title} has been cancelled.`,
      });
      setTimeout(() => setToastMessage(null), 3500);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setToastMessage({
        type: 'error',
        text:
          msg === 'ACTIVITY_CAPACITY_FULL'
            ? 'Sorry, this activity has reached its maximum capacity limit.'
            : msg,
      });
      setTimeout(() => setToastMessage(null), 3500);
    },
  });

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    return activities.filter((act) => {
      if (selectedCategory !== 'All' && act.category !== selectedCategory) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchTitle = act.title.toLowerCase().includes(q);
        const matchDesc = act.description.toLowerCase().includes(q);
        const matchVenue = act.venue.toLowerCase().includes(q);
        const matchOrg = act.organizer.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchVenue && !matchOrg) return false;
      }
      return true;
    });
  }, [activities, selectedCategory, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="student-activities-loading">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !activities) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not load campus activities"
          message={
            error instanceof Error
              ? error.message
              : 'Failed to retrieve scheduled activities from the server.'
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="student-activities">
      {/* Header */}
      <PageHeader
        title="Campus Life & Technical Activities"
        description="Upcoming institutional hackathons, workshops, guest lectures, and student club events"
        badge={<StatusBadge label="Spring 2026 Calendar" variant="info" size="sm" />}
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in ${
            toastMessage.type === 'success'
              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100'
              : 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Search and Category Filter Bar */}
      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            {(['All', 'Hackathon', 'Workshop', 'Seminar', 'Sports'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                  selectedCategory === cat
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)] border-[var(--accent)] shadow-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] border-[var(--border)]'
                }`}
              >
                {cat === 'All' ? 'All Activities' : cat}
              </button>
            ))}
          </div>

          <div className="relative sm:w-72">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
        </div>
      </div>

      {/* Activities Grid */}
      {filteredActivities.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No activities found"
          description="Try broadening your category filter or clearing the search query."
          action={
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-bold"
            >
              Reset Filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredActivities.map((act) => {
            const isReg = !!act.isRegistered;
            const isFull = !isReg && act.registeredCount >= act.capacity;

            return (
              <div
                key={act.id}
                className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <StatusBadge
                      label={act.category}
                      variant={
                        act.category === 'Hackathon'
                          ? 'success'
                          : act.category === 'Workshop'
                          ? 'info'
                          : act.category === 'Seminar'
                          ? 'warning'
                          : 'neutral'
                      }
                      size="sm"
                    />

                    {isReg ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3 h-3 stroke-[3]" />
                        Registered
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-mono ${
                          isFull
                            ? 'text-rose-500 font-bold'
                            : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {isFull
                          ? 'Full Capacity'
                          : `${act.registeredCount}/${act.capacity} seats filled`}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[var(--text)] leading-snug">
                    {act.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                    {act.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border)]/60 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-muted)] font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                      {new Date(act.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                      {act.time}
                    </span>
                    <span className="col-span-2 flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                      {act.venue}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[170px]">
                      By: {act.organizer}
                    </span>
                    <button
                      type="button"
                      disabled={registerMutation.isPending || (isFull && !isReg)}
                      onClick={() =>
                        registerMutation.mutate({
                          activityId: act.id,
                          register: !isReg,
                        })
                      }
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isReg
                          ? 'border border-rose-300 dark:border-rose-900/60 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100'
                          : isFull
                          ? 'bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]'
                          : 'bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90'
                      }`}
                    >
                      {registerMutation.isPending
                        ? 'Updating...'
                        : isReg
                        ? 'Cancel RSVP'
                        : isFull
                        ? 'Seats Full'
                        : 'Register Now'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
