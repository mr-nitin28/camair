'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList, SkeletonCard } from '@/components/ui/skeleton';
import {
  Megaphone,
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  Tag,
  CheckCircle,
  FileText,
  Users,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { FacultyService } from '@/lib/services/faculty-service';

interface FacultyAnnouncement {
  id: string;
  title: string;
  content: string;
  category: 'Institution' | 'Department' | 'Examination' | 'Coursework';
  department_id: string;
  targetScope: string;
  priority: 'Low' | 'Normal' | 'High' | 'Critical';
  reachCount: number;
  created_at: string;
}

export default function AnnouncementsPage() {
  const { faculty } = useAppStore();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'Institution' | 'Department' | 'Examination' | 'Coursework'>('Coursework');
  const [priority, setPriority] = useState<'Low' | 'Normal' | 'High' | 'Critical'>('Normal');
  const [targetScope, setTargetScope] = useState('B.Tech CSE Sem 6 (Section A & B)');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch announcements
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements-list-faculty', faculty?.department_id],
    queryFn: async () => {
      return await FacultyService.getAnnouncements();
    },
    initialData: [],
  });

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setFormError('Title and announcement content are required.');
      return;
    }

    try {
      await FacultyService.createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        category,
        priority: priority === 'Critical' ? 'Critical' : priority === 'High' ? 'High' : 'Normal',
        targetAudience: 'All Students',
      });

      setModalOpen(false);
      setTitle('');
      setContent('');
      setFormError(null);
      setSuccessToast('Audience-targeted announcement dispatched successfully.');
      queryClient.invalidateQueries({ queryKey: ['announcements-list-faculty'] });
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to publish announcement.');
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'Critical':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'High':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      default:
        return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-white" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold mb-1">
            <Link href="/faculty" className="hover:text-primary flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Faculty Console
            </Link>
            <span>•</span>
            <span>Audience Targeted Communication & Dispatches</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Notices & Announcements
          </h1>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Compose Notice</span>
        </button>
      </div>

      {/* 2. ANNOUNCEMENTS LIST */}
      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No Notices Broadcast"
          description="Click 'Compose Notice' to publish audience-targeted alerts to your assigned sections."
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-3 hover:border-primary/40 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getPriorityBadge(a.priority)}`}>
                    {a.priority} Priority
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                    {a.category}
                  </span>
                  <span className="text-xs font-semibold text-primary">
                    Target: {a.targetScope}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground font-semibold">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-primary" /> {a.reachCount} Reads
                  </span>
                  <span>•</span>
                  <span>{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <h2 className="text-base font-bold text-foreground">
                {a.title}
              </h2>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {a.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 3. COMPOSE MODAL */}
      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Compose Audience-Targeted Announcement"
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Notice Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Compiler Design Mid-Term Timetable & Formula Sheet Notice"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Target Audience</label>
              <input
                type="text"
                value={targetScope}
                onChange={(e) => setTargetScope(e.target.value)}
                placeholder="e.g. B.Tech CSE Sem 6 (Section A)"
                className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Priority Tag</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              >
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Detailed Announcement Body <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Provide complete instructions, examination locations, and deadlines..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 leading-relaxed"
            />
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs font-semibold">
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border/80 text-xs font-bold text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90"
            >
              Broadcast Notice
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
