'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  StudentService,
  type DoubtTicketRecord,
  type DoubtStatus,
} from '@/lib/services/student-service';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  HelpCircle,
  Plus,
  Send,
  MessageSquare,
  Clock,
  RotateCcw,
  CheckCircle2,
  Paperclip,
  User,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';

export default function StudentDoubtsPage() {
  const queryClient = useQueryClient();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>('doubt-1');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [reopenReason, setReopenReason] = useState('');

  // New Ticket Form State
  const [newSubjectId, setNewSubjectId] = useState('00000000-0000-0000-0000-000000000351');
  const [newTitle, setNewTitle] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAttachment, setNewAttachment] = useState('');

  const {
    data: doubts,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['student-doubts-list'],
    queryFn: () => StudentService.getDoubts(),
    staleTime: 30 * 1000,
  });

  const selectedDoubt = doubts?.find((d) => d.id === selectedTicketId) || doubts?.[0] || null;

  const createMutation = useMutation({
    mutationFn: (data: { subjectId: string; title: string; question: string; attachmentName?: string }) =>
      StudentService.createDoubt(data),
    onSuccess: (newDoubt) => {
      queryClient.invalidateQueries({ queryKey: ['student-doubts-list'] });
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewQuestion('');
      setNewAttachment('');
      setSelectedTicketId(newDoubt.id);
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ doubtId, message }: { doubtId: string; message: string }) =>
      StudentService.sendDoubtMessage(doubtId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-doubts-list'] });
      setReplyMessage('');
    },
  });

  const reopenMutation = useMutation({
    mutationFn: ({ doubtId, message }: { doubtId: string; message: string }) =>
      StudentService.reopenDoubt(doubtId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-doubts-list'] });
      setIsReopenModalOpen(false);
      setReopenReason('');
    },
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedDoubt) return;
    replyMutation.mutate({ doubtId: selectedDoubt.id, message: replyMessage });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newQuestion.trim()) return;
    createMutation.mutate({
      subjectId: newSubjectId,
      title: newTitle,
      question: newQuestion,
      attachmentName: newAttachment || undefined,
    });
  };

  const handleReopenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim() || !selectedDoubt) return;
    reopenMutation.mutate({ doubtId: selectedDoubt.id, message: reopenReason });
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="student-doubts-loading">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[500px]">
          <Skeleton className="h-full rounded-2xl" />
          <Skeleton className="h-full rounded-2xl md:col-span-2" />
        </div>
      </div>
    );
  }

  if (isError || !doubts) {
    return (
      <div className="py-12">
        <ErrorState
          title="Could not load doubts"
          message={error instanceof Error ? error.message : 'Failed to retrieve academic doubt tickets.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="student-doubts">
      {/* Header */}
      <PageHeader
        title="Doubt Resolution & Direct Inquiries"
        description="Threaded academic questions routed directly to designated course instructors"
        badge={<StatusBadge label="Institutional Reopen Limit: 2" variant="info" size="sm" />}
        actions={
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--accent-fg)] transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Doubt</span>
          </button>
        }
      />

      {/* Main Split-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[560px]">
        {/* Left Column: Tickets List */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Your Doubt Threads ({doubts.length})
            </h3>
          </div>

          {doubts.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="No doubts recorded"
              description="Have questions regarding assignments or lectures? Post your first doubt."
              className="py-10 border-none"
            />
          ) : (
            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1">
              {doubts.map((d) => {
                const isSelected = selectedDoubt?.id === d.id;
                let statusVariant: 'success' | 'warning' | 'info' | 'neutral' = 'neutral';
                if (d.status === 'open') statusVariant = 'warning';
                else if (d.status === 'answered') statusVariant = 'info';
                else if (d.status === 'resolved') statusVariant = 'success';
                else if (d.status === 'reopened') statusVariant = 'warning';

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedTicketId(d.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]/20 shadow-sm'
                        : 'border-[var(--border)] bg-[var(--surface-2)]/30 hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-[10px] font-extrabold text-[var(--accent)]">
                        {d.subjectCode}
                      </span>
                      <StatusBadge
                        label={d.status.toUpperCase()}
                        variant={statusVariant}
                        size="sm"
                      />
                    </div>
                    <h4 className="text-xs font-bold text-[var(--text)] line-clamp-1 leading-snug">
                      {d.title}
                    </h4>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-1">
                      {d.initialQuestion}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
                      <span>{d.messages.length} messages</span>
                      <span>{new Date(d.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Thread View */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm flex flex-col justify-between">
          {selectedDoubt ? (
            <>
              {/* Thread Header */}
              <div className="pb-4 border-b border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                      {selectedDoubt.subjectCode}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {selectedDoubt.subjectName} • {selectedDoubt.facultyName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge
                      label={selectedDoubt.status.toUpperCase()}
                      variant={
                        selectedDoubt.status === 'resolved'
                          ? 'success'
                          : selectedDoubt.status === 'answered'
                          ? 'info'
                          : 'warning'
                      }
                      size="sm"
                    />

                    {/* Reopen Action Button under Policy Rules */}
                    {selectedDoubt.status === 'resolved' && (
                      selectedDoubt.reopenCount < selectedDoubt.maxReopensAllowed ? (
                        <button
                          type="button"
                          onClick={() => setIsReopenModalOpen(true)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent)] hover:opacity-80 transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reopen ({selectedDoubt.maxReopensAllowed - selectedDoubt.reopenCount} left)</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)]">
                          Max Reopens Reached
                        </span>
                      )
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[var(--text)]">
                  {selectedDoubt.title}
                </h3>
              </div>

              {/* Message History Roster */}
              <div className="my-4 flex-1 overflow-y-auto space-y-3.5 custom-scrollbar max-h-[380px] pr-2">
                {selectedDoubt.messages.map((m) => {
                  const isStudent = m.senderRole === 'Student';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[var(--text-muted)] font-semibold">
                        <span>{m.senderName}</span>
                        <span>•</span>
                        <span className="font-mono">{m.senderRole}</span>
                        <span>•</span>
                        <span className="font-mono">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed ${
                          isStudent
                            ? 'bg-[var(--accent)] text-[var(--accent-fg)] rounded-tr-none shadow-sm'
                            : 'bg-[var(--surface-2)] text-[var(--text)] rounded-tl-none border border-[var(--border)]'
                        }`}
                      >
                        <p>{m.message}</p>
                        {m.attachmentName && (
                          <div className="mt-2 pt-2 border-t border-white/20 flex items-center gap-1.5 text-[10px] font-mono">
                            <Paperclip className="w-3 h-3" />
                            <span>Attachment: {m.attachmentName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="pt-3 border-t border-[var(--border)] flex items-center gap-2">
                <input
                  type="text"
                  placeholder={
                    selectedDoubt.status === 'resolved'
                      ? 'Ticket is marked resolved. Reopen to post more queries.'
                      : 'Type your message or follow-up question...'
                  }
                  disabled={selectedDoubt.status === 'resolved'}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!replyMessage.trim() || selectedDoubt.status === 'resolved' || replyMutation.isPending}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 disabled:opacity-40 transition cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="Select a thread"
              description="Choose an existing doubt ticket from the left panel or submit a new inquiry."
              className="py-20 border-none"
            />
          )}
        </div>
      </div>

      {/* Create Doubt Modal */}
      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Post Academic Doubt"
        description="Your question will be dispatched to the primary faculty member teaching the subject"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 p-1">
          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              Select Subject <span className="text-rose-500">*</span>
            </label>
            <select
              value={newSubjectId}
              onChange={(e) => setNewSubjectId(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-semibold"
            >
              <option value="00000000-0000-0000-0000-000000000351">CS601 - Compiler Design (Prof. Vikram Mehta)</option>
              <option value="00000000-0000-0000-0000-000000000352">CS602 - Computer Networks (Prof. Ananya Deshmukh)</option>
              <option value="00000000-0000-0000-0000-000000000353">CS603 - Artificial Intelligence (Dr. Vikrant Roy)</option>
              <option value="sub-604">CS604 - Software Architecture (Prof. Shruti Sen)</option>
              <option value="sub-605L">CS605L - Compiler Design Lab (Prof. Vikram Mehta)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              Topic / Inquiry Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Question on LR(1) parser canonical items"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-semibold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              Detailed Question Body <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder="Describe your doubt in detail including specific code lines, textbook theorem, or lab step..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              Attachment Name (Optional code snippet or image)
            </label>
            <input
              type="text"
              placeholder="e.g. grammar_ast_derivation.png"
              value={newAttachment}
              onChange={(e) => setNewAttachment(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 cursor-pointer"
            >
              {createMutation.isPending ? 'Posting Inquiry...' : 'Submit Inquiry'}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Reopen Doubt Modal */}
      <Dialog
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
        title="Reopen Doubt Ticket"
        description="Provide additional clarification to reopen this resolved inquiry"
        maxWidth="sm"
      >
        <form onSubmit={handleReopenSubmit} className="space-y-4 p-1">
          <p className="text-xs text-[var(--text-muted)]">
            Institutional policy allows up to 2 reopens per ticket. This ticket has been reopened{' '}
            {selectedDoubt?.reopenCount} time(s).
          </p>

          {reopenMutation.isError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {reopenMutation.error instanceof Error ? reopenMutation.error.message : 'Failed to reopen ticket'}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[var(--text)] block mb-1">
              Reason for Reopening <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Explain why further clarification is needed..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setIsReopenModalOpen(false)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reopenMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] text-[var(--accent-fg)]"
            >
              {reopenMutation.isPending ? 'Reopening...' : 'Confirm Reopen'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
