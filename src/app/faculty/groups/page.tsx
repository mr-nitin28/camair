'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FacultyService,
  type StudentGroupRecord,
} from '@/lib/services/faculty-service';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList, SkeletonCard } from '@/components/ui/skeleton';
import {
  Boxes,
  ArrowLeft,
  Plus,
  Users,
  Sparkles,
  CheckCircle,
  Flag,
  UserCheck,
  Layers,
} from 'lucide-react';
import Link from 'next/link';

export default function FacultyStudentGroupsPage() {
  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Project' | 'Lab Batch' | 'Advisory' | 'Study Cohort'>('Project');
  const [description, setDescription] = useState('');
  const [sectionName, setSectionName] = useState('Section A');
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Fetch Groups
  const {
    data: groups,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['faculty-student-groups'],
    queryFn: () => FacultyService.getGroups('00000000-0000-0000-0000-000000000020'),
  });

  // Create Group Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Group name is required');
      return await FacultyService.createGroup({
        name: name.trim(),
        category,
        description: description.trim(),
        sectionName,
        memberStudentIds: [
          '00000000-0000-0000-0000-000000000030',
          '00000000-0000-0000-0000-000000000031',
        ],
      });
    },
    onSuccess: () => {
      setCreateModalOpen(false);
      setName('');
      setDescription('');
      setFormError(null);
      setSuccessToast('Student group established successfully.');
      queryClient.invalidateQueries({ queryKey: ['faculty-student-groups'] });
      setTimeout(() => setSuccessToast(null), 4000);
    },
    onError: (err: any) => {
      setFormError(err?.message || 'Failed to create group.');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard height={80} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard height={240} />
          <SkeletonCard height={240} />
        </div>
      </div>
    );
  }

  if (isError || !groups) {
    return (
      <ErrorState
        title="Failed to Load Student Groups"
        message={error instanceof Error ? error.message : 'Unable to query student cohorts.'}
        onRetry={() => refetch()}
      />
    );
  }

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
            <span>Mentorship, Lab Batches & Advisory Hub</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Student Groups & Advisories
          </h1>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Form New Cohort / Team</span>
        </button>
      </div>

      {/* 2. GROUPS GRID */}
      {groups.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No Student Groups Formed"
          description="Form a capstone research team, advisory cohort, or practical lab batch."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((grp) => (
            <div
              key={grp.id}
              className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4 hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {grp.category} • {grp.sectionName}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">
                    Mentor: {grp.mentorName}
                  </span>
                </div>

                <h3 className="text-base font-bold text-foreground">
                  {grp.name}
                </h3>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {grp.description}
                </p>

                {/* Milestone Progress */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5 text-primary" /> Milestone Progress
                    </span>
                    <span className="font-mono text-foreground font-bold">
                      {grp.completedMilestones} of {grp.milestonesCount} Completed
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      style={{ width: `${(grp.completedMilestones / grp.milestonesCount) * 100}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>
                </div>

                {/* Roster list */}
                <div className="pt-2 border-t border-border/40">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                    Enrolled Members ({grp.members.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {grp.members.map((m) => (
                      <span
                        key={m.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${
                          m.role === 'Lead'
                            ? 'bg-primary/10 text-primary border-primary/20 font-bold'
                            : 'bg-muted/50 text-foreground border-border/60'
                        }`}
                      >
                        <span>{m.name}</span>
                        <span className="text-[10px] opacity-75">({m.rollNo})</span>
                        {m.role === 'Lead' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-primary text-primary-foreground">
                            Lead
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">
                  Created {new Date(grp.createdAt).toLocaleDateString()}
                </span>
                <Link
                  href="/faculty/messages"
                  className="text-primary hover:underline"
                >
                  Message Group &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. CREATE GROUP MODAL */}
      <Dialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Form New Student Group / Cohort"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Group Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. LLVM JIT Compiler Capstone Research Group"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              >
                <option value="Project">Capstone / Project Team</option>
                <option value="Lab Batch">Lab Practical Batch</option>
                <option value="Advisory">Academic Advisory Cohort</option>
                <option value="Study Cohort">Study Group</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Target Section</label>
              <input
                type="text"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Scope & Objectives
            </label>
            <textarea
              rows={3}
              placeholder="Define project deliverables, lab schedule, and meeting cadence..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
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
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border/80 text-xs font-bold text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90"
            >
              {createMutation.isPending ? 'Establishing...' : 'Form Group'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
