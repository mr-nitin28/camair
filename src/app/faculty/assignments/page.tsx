'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FacultyService,
  type FacultyAssignmentRecord,
  type AssignmentSubmissionItem,
} from '@/lib/services/faculty-service';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList, SkeletonCard } from '@/components/ui/skeleton';
import {
  FileEdit,
  ArrowLeft,
  Plus,
  Clock,
  CheckCircle,
  FileText,
  Sparkles,
  Paperclip,
  Check,
  Send,
  User,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

export default function FacultyAssignmentsPage() {
  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  // Grade Modal State
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState<AssignmentSubmissionItem | null>(null);
  const [gradeMarks, setGradeMarks] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradeError, setGradeError] = useState<string | null>(null);

  // Form State for New Assignment
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxMarks, setMaxMarks] = useState('50');
  const [sectionName, setSectionName] = useState('Section A & B');
  const [formError, setFormError] = useState<string | null>(null);

  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Fetch Assignments
  const {
    data: assignments,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['faculty-assignments'],
    queryFn: () => FacultyService.getAssignments('00000000-0000-0000-0000-000000000020'),
  });

  // Default active assignment
  const activeAssignment = React.useMemo(() => {
    if (!assignments || assignments.length === 0) return null;
    if (selectedAssignmentId) {
      const found = assignments.find((a) => a.id === selectedAssignmentId);
      if (found) return found;
    }
    return assignments[0];
  }, [assignments, selectedAssignmentId]);

  // 2. Fetch Submissions for active assignment
  const {
    data: submissions,
    isLoading: loadingSubmissions,
  } = useQuery({
    queryKey: ['faculty-assignment-submissions', activeAssignment?.id],
    queryFn: () => (activeAssignment ? FacultyService.getAssignmentSubmissions(activeAssignment.id) : []),
    enabled: !!activeAssignment,
  });

  // Create Assignment Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Assignment title is required');
      const marks = parseInt(maxMarks, 10);
      if (isNaN(marks) || marks <= 0) throw new Error('Max marks must be a positive integer');

      return await FacultyService.createAssignment({
        subjectId: '00000000-0000-0000-0000-000000000351',
        subjectCode: 'CS601',
        subjectName: 'Compiler Design',
        sectionName,
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate || new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
        maxMarks: marks,
        attachments: ['CS601_Specification_Guide.pdf'],
      });
    },
    onSuccess: () => {
      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setFormError(null);
      setSuccessToast('Assignment published to students.');
      queryClient.invalidateQueries({ queryKey: ['faculty-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-console-summary'] });
      setTimeout(() => setSuccessToast(null), 4000);
    },
    onError: (err: any) => {
      setFormError(err?.message || 'Failed to create assignment.');
    },
  });

  // Grade Submission Mutation
  const gradeMutation = useMutation({
    mutationFn: async () => {
      if (!activeAssignment || !activeSubmission) return;
      const num = parseFloat(gradeMarks);
      if (isNaN(num)) throw new Error('Valid marks number required');
      if (num < 0 || num > activeSubmission.maxMarks) {
        throw new Error(`Marks must be between 0 and ${activeSubmission.maxMarks}`);
      }

      return await FacultyService.gradeSubmission({
        assignmentId: activeAssignment.id,
        submissionId: activeSubmission.id,
        marks: num,
        feedback: gradeFeedback.trim() || undefined,
      });
    },
    onSuccess: () => {
      setGradeModalOpen(false);
      setActiveSubmission(null);
      setGradeMarks('');
      setGradeFeedback('');
      setGradeError(null);
      setSuccessToast('Submission graded successfully.');
      queryClient.invalidateQueries({ queryKey: ['faculty-assignment-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-console-summary'] });
      setTimeout(() => setSuccessToast(null), 4000);
    },
    onError: (err: any) => {
      setGradeError(err?.message || 'Failed to grade submission.');
    },
  });

  const openGradeModal = (sub: AssignmentSubmissionItem) => {
    setActiveSubmission(sub);
    setGradeMarks(sub.marksObtained !== null ? sub.marksObtained.toString() : '');
    setGradeFeedback(sub.feedback || '');
    setGradeError(null);
    setGradeModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard height={80} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <SkeletonList count={4} />
          </div>
          <div className="lg:col-span-8">
            <SkeletonCard height={400} />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !assignments) {
    return (
      <ErrorState
        title="Failed to Load Assignments"
        message={error instanceof Error ? error.message : 'Unable to query assignments desk.'}
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
            <span>Coursework & Continuous Assessment Desk</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Assignments & Submissions
          </h1>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>New Assignment</span>
        </button>
      </div>

      {/* 2. SPLIT-PANE DESK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Assignments List */}
        <div className="lg:col-span-4 rounded-3xl bg-card border border-border shadow-xs overflow-hidden divide-y divide-border/40">
          <div className="p-3.5 bg-muted/50 text-xs font-bold text-muted-foreground flex items-center justify-between">
            <span>Published Assignments ({assignments.length})</span>
          </div>

          {assignments.length === 0 ? (
            <EmptyState
              icon={FileEdit}
              title="No Assignments Published"
              description="Click 'New Assignment' to create your first assessment task."
            />
          ) : (
            assignments.map((asg) => {
              const isSelected = activeAssignment?.id === asg.id;
              return (
                <div
                  key={asg.id}
                  onClick={() => setSelectedAssignmentId(asg.id)}
                  className={`p-4 transition-colors cursor-pointer space-y-2 ${
                    isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-primary font-mono">
                      {asg.subjectCode} • {asg.sectionName}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Max {asg.maxMarks} marks
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground line-clamp-1">
                    {asg.title}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>Due: {asg.dueDate}</span>
                    <span className="font-semibold text-primary">
                      {asg.gradedCount}/{asg.totalSubmissions} Graded
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Submissions Review & Grading Desk */}
        <div className="lg:col-span-8">
          {activeAssignment ? (
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
              {/* Header */}
              <div className="pb-4 border-b border-border/60">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                  <span>{activeAssignment.subjectCode} ({activeAssignment.subjectName})</span>
                  <span>•</span>
                  <span>Due {activeAssignment.dueDate}</span>
                </div>
                <h2 className="text-xl font-bold text-foreground mt-1">
                  {activeAssignment.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {activeAssignment.description}
                </p>

                {activeAssignment.attachments.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {activeAssignment.attachments.map((file, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-[11px] font-bold text-foreground border border-border/60"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-primary" />
                        {file}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submissions Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Student Submissions Queue
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {submissions?.length || 0} Submissions
                  </span>
                </div>

                <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border/40">
                  {!submissions || submissions.length === 0 ? (
                    <p className="p-6 text-center text-xs text-muted-foreground">
                      No submissions uploaded for this assignment yet.
                    </p>
                  ) : (
                    submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted border border-border/60 flex items-center justify-center font-bold text-xs text-foreground shrink-0 uppercase">
                            {sub.studentName.split(' ').map((p) => p[0]).join('')}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">
                                {sub.studentName}
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                ({sub.rollNo})
                              </span>
                              <StatusBadge
                                status={sub.status === 'Graded' ? 'active' : 'pending'}
                                label={sub.status.toUpperCase()}
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Submitted {new Date(sub.submittedAt).toLocaleString()}
                              {sub.attachmentName && ` • File: ${sub.attachmentName}`}
                            </p>
                            {sub.feedback && (
                              <p className="text-[11px] text-primary mt-1 italic">
                                Feedback: "{sub.feedback}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                          <div className="text-right">
                            <span className="font-mono text-sm font-bold text-foreground">
                              {sub.marksObtained !== null ? `${sub.marksObtained}/${sub.maxMarks}` : '—'}
                            </span>
                            <span className="block text-[10px] text-muted-foreground">
                              {sub.status === 'Graded' ? 'Evaluated' : 'Ungraded'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => openGradeModal(sub)}
                            className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors"
                          >
                            {sub.status === 'Graded' ? 'Edit Grade' : 'Grade'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={FileEdit}
              title="Select an Assignment"
              description="Choose an assignment from the list to track and grade submissions."
            />
          )}
        </div>
      </div>

      {/* 3. CREATE ASSIGNMENT MODAL */}
      <Dialog
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Assignment"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Assignment Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Bottom-Up LR(1) Parser Table Construction"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Description & Task Requirements
            </label>
            <textarea
              rows={3}
              placeholder="Detailed instructions, format specifications, and deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Maximum Marks</label>
              <input
                type="number"
                value={maxMarks}
                onChange={(e) => setMaxMarks(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
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
              {createMutation.isPending ? 'Publishing...' : 'Publish Assignment'}
            </button>
          </div>
        </div>
      </Dialog>

      {/* 4. GRADE SUBMISSION MODAL */}
      <Dialog
        isOpen={gradeModalOpen}
        onClose={() => setGradeModalOpen(false)}
        title={activeSubmission ? `Evaluate ${activeSubmission.studentName}'s Submission` : 'Grade Submission'}
      >
        <div className="space-y-4">
          {activeSubmission && (
            <div className="p-3.5 rounded-2xl bg-muted/50 border border-border text-xs space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>{activeSubmission.studentName} ({activeSubmission.rollNo})</span>
                <span>Max Marks: {activeSubmission.maxMarks}</span>
              </div>
              {activeSubmission.attachmentName && (
                <p className="text-muted-foreground">
                  Attached file: <strong>{activeSubmission.attachmentName}</strong>
                </p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Marks Awarded (0 to {activeSubmission?.maxMarks || 50})
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max={activeSubmission?.maxMarks || 50}
              value={gradeMarks}
              onChange={(e) => setGradeMarks(e.target.value)}
              placeholder="e.g. 45.0"
              className="w-full px-3 py-2 rounded-xl font-mono text-xs font-bold bg-muted/40 border border-border text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Feedback & Evaluation Remarks
            </label>
            <textarea
              rows={3}
              placeholder="Provide constructive feedback on algorithm correctness, efficiency, and code clarity..."
              value={gradeFeedback}
              onChange={(e) => setGradeFeedback(e.target.value)}
              className="w-full p-3 rounded-xl bg-muted/40 border border-border text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {gradeError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs font-semibold">
              {gradeError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => setGradeModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border/80 text-xs font-bold text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => gradeMutation.mutate()}
              disabled={gradeMutation.isPending}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90"
            >
              {gradeMutation.isPending ? 'Saving Grade...' : 'Save Evaluation'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
