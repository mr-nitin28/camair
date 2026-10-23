'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AdminService,
  type AdminAnnouncement,
} from '@/lib/services/admin-service';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Megaphone,
  Plus,
  AlertTriangle,
  Users,
  Calendar,
  Clock,
  Radio,
  Bell,
  CheckCircle,
  Eye,
  ShieldAlert,
} from 'lucide-react';

export default function CommunicationsBroadcastPage() {
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'Important' | 'Critical'>('Normal');
  const [category, setCategory] = useState<'Institution' | 'Department' | 'Examination' | 'Emergency Alert'>('Institution');
  const [targetAudience, setTargetAudience] = useState<'All' | 'Students' | 'Faculty' | 'CSE' | 'ECE'>('All');
  const [scheduledDate, setScheduledDate] = useState('');

  // Fetch announcements
  const {
    data: announcements,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => AdminService.getAnnouncements(),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof AdminService.createAnnouncement>[0]) =>
      AdminService.createAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      setIsCreateOpen(false);
      setTitle('');
      setContent('');
      setPriority('Normal');
      setScheduledDate('');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      content,
      priority,
      category,
      targetAudience,
      scheduledDate: scheduledDate || undefined,
    });
  };

  const handleTriggerEmergency = () => {
    setTitle('EMERGENCY CAMPUS ALERT: Severe Weather / Campus Closure');
    setContent('Due to advisory forecasts, all evening classes are shifted to remote learning. Shuttle services will depart early at 16:30.');
    setPriority('Critical');
    setCategory('Emergency Alert');
    setTargetAudience('All');
    setIsCreateOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !announcements) {
    return (
      <ErrorState
        title="Failed to Load Broadcast Board"
        message="Could not load institutional announcements."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Official Broadcast Board & Emergency Alerts"
        description="Dispatch push notifications, critical safety alerts, and administrative notices targeted by audience."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerEmergency}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors shadow-xs cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Emergency Alert</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Notice</span>
            </button>
          </div>
        }
      />

      {/* ANNOUNCEMENTS FEED */}
      {announcements.length === 0 ? (
        <EmptyState
          title="No Active Broadcasts"
          description="Create your first institutional notice or emergency broadcast."
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`p-5 rounded-2xl border bg-[var(--surface)] shadow-sm transition-all flex flex-col justify-between ${
                ann.priority === 'Critical'
                  ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                  : 'border-[var(--border)] hover:border-[var(--border-strong)]'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                        ann.priority === 'Critical'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : ann.priority === 'Important'
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                      }`}
                    >
                      {ann.priority} Priority
                    </span>

                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      {ann.category}
                    </span>

                    <span className="text-xs font-bold text-[var(--accent)] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Audience: {ann.targetAudience}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    Published by {ann.author}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-[var(--text)] tracking-tight">
                  {ann.title}
                </h3>

                <p className="text-xs text-[var(--text)] leading-relaxed">
                  {ann.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="font-bold text-[var(--text)] tabular-nums">{ann.reachCount}</span>
                  <span>portals delivered</span>
                </div>

                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(ann.publishedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE BROADCAST DIALOG */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Compose Official Broadcast Notice"
        description="Broadcast communications across web dashboards and mobile notification feeds."
        className="max-w-xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              Notice Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Schedule Revision for Mid-Term Exams"
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] font-semibold"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Priority Level *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'Normal' | 'Important' | 'Critical')}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs"
              >
                <option value="Normal">Normal</option>
                <option value="Important">Important</option>
                <option value="Critical">Critical Alert</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Target Audience *
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as 'All' | 'Students' | 'Faculty' | 'CSE' | 'ECE')}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs"
              >
                <option value="All">All Campus</option>
                <option value="Students">Students Only</option>
                <option value="Faculty">Faculty Only</option>
                <option value="CSE">CSE Dept</option>
                <option value="ECE">ECE Dept</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[var(--text)] block mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as 'Institution' | 'Department' | 'Examination' | 'Emergency Alert')}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs"
              >
                <option value="Institution">Institution</option>
                <option value="Department">Department</option>
                <option value="Examination">Examination</option>
                <option value="Emergency Alert">Emergency Alert</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              Detailed Broadcast Body *
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="State the official notification announcement..."
              className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              Optional Scheduled Release Date
            </label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
            >
              {createMutation.isPending ? 'Publishing...' : 'Dispatch Broadcast'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
