'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import {
  FileEdit,
  ArrowLeft,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Sparkles,
  Loader2,
  Calendar,
  X,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function FacultyAssignmentsPage() {
  const { faculty } = useAppStore();
  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  
  // Grade Modal State
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [gradeMarks, setGradeMarks] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradeError, setGradeError] = useState<string | null>(null);

  // New Assignment Form State
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: ['subjects-assignments-dropdown', faculty?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faculty_subjects')
        .select('*, subjects(*)');
      if (error) throw error;
      return data?.map((fs: any) => fs.subjects) || [];
    },
    enabled: !!faculty,
  });

  // Set default subject on load
  React.useEffect(() => {
    if (subjects && subjects.length > 0 && !subjectId) {
      setSubjectId(subjects[0].id);
    }
  }, [subjects, subjectId]);

  // Fetch Assignments
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments-list-faculty'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*, subjects(*)');
      if (error) throw error;
      return data;
    },
  });

  // Fetch Submissions for selected assignment
  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['submissions-list-selected', selectedAssignmentId],
    queryFn: async () => {
      if (!selectedAssignmentId) return null;
      const { data, error } = await supabase
        .from('assignment_submissions')
        .select('*, students(*)')
        .eq('assignment_id', selectedAssignmentId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAssignmentId,
  });

  // Create Assignment Mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('assignments')
        .insert({
          subject_id: subjectId,
          semester_id: '33333333-3333-3333-3333-333333333306', // Seed Sem 6
          title,
          description,
          due_date: new Date(dueDate).toISOString(),
          max_marks: Number(maxMarks),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments-list-faculty'] });
      setTitle('');
      setDescription('');
      setDueDate('');
      setMaxMarks('100');
      setCreateModalOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.message || 'Failed to create assignment.');
    },
  });

  // Grade Submission Mutation
  const gradeSubmissionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubmission) return;
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          marks_obtained: Number(gradeMarks),
          feedback: gradeFeedback,
          status: 'Graded',
        })
        .eq('id', selectedSubmission.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions-list-selected', selectedAssignmentId] });
      setGradeModalOpen(false);
      setSelectedSubmission(null);
      setGradeMarks('');
      setGradeFeedback('');
      setGradeError(null);
    },
    onError: (err: any) => {
      setGradeError(err?.message || 'Failed to save grade evaluations.');
    },
  });

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) {
      setFormError('Please fill in required fields.');
      return;
    }
    setFormError(null);
    createAssignmentMutation.mutate();
  };

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeMarks) {
      setGradeError('Marks obtained field is required.');
      return;
    }
    setGradeError(null);
    gradeSubmissionMutation.mutate();
  };

  const openGradeDialog = (sub: any) => {
    setSelectedSubmission(sub);
    setGradeMarks(sub.marks_obtained ? String(sub.marks_obtained) : '');
    setGradeFeedback(sub.feedback || '');
    setGradeModalOpen(true);
  };

  const activeAssignment = useMemo(() => {
    return assignments?.find((a) => a.id === selectedAssignmentId);
  }, [assignments, selectedAssignmentId]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/faculty" className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Workspace
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Assignments & Evaluations</h2>
          <p className="text-slate-500 text-xs mt-1">Design homework tasks, review student submissions, and submit grades with feedback.</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-4 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-md shadow-blue-600/10 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4.5 h-4.5" /> New Assignment
        </button>
      </div>

      {/* Grid: Assignments List & Submissions Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Assignments list */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Active Assignments</h3>
          {assignmentsLoading ? (
            <div className="text-slate-400 text-xs text-center py-6">Loading list...</div>
          ) : !assignments || assignments.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl">
              <FileEdit className="w-9 h-9 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-700">No assignments created</p>
              <p className="text-[10px] text-slate-400 mt-1">Create one using the button above.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {assignments.map((act: any) => {
                const isSelected = selectedAssignmentId === act.id;
                return (
                  <div
                    key={act.id}
                    onClick={() => setSelectedAssignmentId(act.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/20 ring-1 ring-blue-500/5 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                      {act.subjects?.code}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 mt-2 line-clamp-1">{act.title}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{act.subjects?.name}</p>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold mt-2.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Due: {new Date(act.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submissions Detail Pane */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-[75vh] flex flex-col justify-between overflow-hidden">
          {selectedAssignmentId && activeAssignment ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between shrink-0 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-950">{activeAssignment.title}</h3>
                  <span className="text-[9.5px] text-slate-400 font-semibold">
                    {activeAssignment.subjects?.name} ({activeAssignment.subjects?.code}) • Max Marks: {activeAssignment.max_marks}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedAssignmentId(null)}
                  className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>

              {/* Submissions Data Grid */}
              <div className="flex-grow overflow-y-auto pr-1">
                {submissionsLoading ? (
                  <div className="text-center py-6 text-slate-400 text-xs">Loading submissions...</div>
                ) : !submissions || submissions.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">No student submissions uploaded yet.</div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((sub: any) => (
                      <div key={sub.id} className="p-4 border border-slate-100 bg-slate-50/50 rounded-xl space-y-3 hover:border-slate-200 transition text-xs">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {sub.students?.first_name} {sub.students?.last_name}
                            </span>
                            <span className="text-[9.5px] text-slate-400 block font-mono">{sub.students?.student_id}</span>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                              sub.status === 'Graded'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}
                          >
                            {sub.status === 'Graded' && <CheckCircle className="w-3 h-3" />}
                            {sub.status === 'Submitted' && <Clock className="w-3 h-3" />}
                            {sub.status}
                          </span>
                        </div>

                        {/* File details */}
                        <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100/50">
                          <a
                            href={sub.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Download submission zip</span>
                          </a>

                          <button
                            onClick={() => openGradeDialog(sub)}
                            className="bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 px-3 py-1.5 text-[10px] font-bold rounded-lg transition"
                          >
                            {sub.status === 'Graded' ? 'Edit Grade' : 'Grade Submission'}
                          </button>
                        </div>

                        {/* Marks breakdown if graded */}
                        {sub.status === 'Graded' && (
                          <div className="bg-white border border-slate-100 rounded-lg p-2.5 mt-2 space-y-1">
                            <div className="flex justify-between items-baseline">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Marks Obtained</span>
                              <span className="font-bold text-slate-900 text-xs">
                                {sub.marks_obtained} / {activeAssignment.max_marks}
                              </span>
                            </div>
                            {sub.feedback && (
                              <p className="text-[9.5px] text-slate-500 italic mt-1 leading-relaxed">
                                Feedback: "{sub.feedback}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
              <FileEdit className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-xs font-semibold">Select an assignment ticket</p>
              <p className="text-[9.5px] mt-1 text-slate-400">Click on any active item to inspect student submissions.</p>
            </div>
          )}
        </div>

      </div>

      {/* New Assignment Creator Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-950">Create New Assignment</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Subject Related *
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                  >
                    {subjects?.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Max Marks *
                  </label>
                  <input
                    type="number"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Capstone Design Phase 1 Architecture"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Task Guidelines Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain submission details, dependencies, evaluation keys..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Due Date Deadline *
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAssignmentMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-md shadow-blue-600/10 flex items-center justify-center gap-1.5"
                >
                  {createAssignmentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Add Assignment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grading Evaluation Modal */}
      {gradeModalOpen && selectedSubmission && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm text-slate-950">Grade Submission</h3>
              <button
                onClick={() => setGradeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGradeSubmit} className="p-6 space-y-4">
              {gradeError && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{gradeError}</span>
                </div>
              )}

              <div className="bg-slate-50 p-3 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Student Name</span>
                <span className="font-bold text-slate-900 block">
                  {selectedSubmission.students?.first_name} {selectedSubmission.students?.last_name}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Marks Obtained (Max: {activeAssignment?.max_marks}) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 18.5"
                  value={gradeMarks}
                  onChange={(e) => setGradeMarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Advisor Comments & Feedback
                </label>
                <textarea
                  rows={4}
                  placeholder="Excellent socket handling, review threading parameters..."
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGradeModalOpen(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={gradeSubmissionMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-md shadow-blue-600/10 flex items-center justify-center gap-1.5"
                >
                  {gradeSubmissionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Publish Grade'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
