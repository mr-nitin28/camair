'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FacultyService,
  type FacultyDoubtQueueItem,
  type DoubtStatus,
} from '@/lib/services/faculty-service';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList, SkeletonCard } from '@/components/ui/skeleton';
import {
  HelpCircle,
  ArrowLeft,
  CheckCircle,
  MessageSquare,
  Send,
  Sparkles,
  Paperclip,
  Code,
  Tag,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

function FacultyDoubtsInboxContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const queryDoubtId = searchParams.get('id') || undefined;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [selectedDoubtId, setSelectedDoubtId] = useState<string | null>(queryDoubtId || null);
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // 1. Fetch Doubts Queue
  const {
    data: doubts,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['faculty-doubts-queue', filterStatus],
    queryFn: () => FacultyService.getDoubtsQueue('00000000-0000-0000-0000-000000000020', filterStatus),
  });

  // Active selected doubt
  const activeDoubt = useMemo(() => {
    if (!doubts || doubts.length === 0) return null;
    if (selectedDoubtId) {
      const found = doubts.find((d) => d.id === selectedDoubtId);
      if (found) return found;
    }
    return doubts[0];
  }, [doubts, selectedDoubtId]);

  // Scroll to bottom of messages thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeDoubt?.messages.length]);

  // Reply Mutation
  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!activeDoubt || !replyText.trim()) return;
      return await FacultyService.replyToDoubt({
        doubtId: activeDoubt.id,
        replyText: replyText.trim(),
        attachmentName: replyAttachment.trim() || undefined,
      });
    },
    onSuccess: () => {
      setReplyText('');
      setReplyAttachment('');
      setSuccessToast('Response successfully sent to student.');
      queryClient.invalidateQueries({ queryKey: ['faculty-doubts-queue'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-console-summary'] });
      setTimeout(() => setSuccessToast(null), 4000);
    },
  });

  // Resolve Ticket Mutation
  const resolveMutation = useMutation({
    mutationFn: async () => {
      if (!activeDoubt) return;
      return await FacultyService.resolveDoubt(activeDoubt.id);
    },
    onSuccess: () => {
      setSuccessToast('Doubt ticket marked as resolved.');
      queryClient.invalidateQueries({ queryKey: ['faculty-doubts-queue'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-console-summary'] });
      setTimeout(() => setSuccessToast(null), 4000);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard height={80} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <SkeletonList count={5} />
          </div>
          <div className="lg:col-span-7">
            <SkeletonCard height={460} />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !doubts) {
    return (
      <ErrorState
        title="Failed to Load Doubts Inbox"
        message={error instanceof Error ? error.message : 'Unable to query student questions.'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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
            <span>Subject: CS601 Compiler Design</span>
            <span>•</span>
            <span>Doubts Inbox ({doubts.length})</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Technical Doubts & Academic Inquiries
          </h1>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border/60 text-xs font-bold">
          {(['All', 'open', 'answered', 'resolved'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                filterStatus === st
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 2. SPLIT-PANE QUEUE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Ticket List */}
        <div className="lg:col-span-5 rounded-3xl bg-card border border-border shadow-xs overflow-hidden max-h-[720px] flex flex-col">
          <div className="p-3.5 bg-muted/50 border-b border-border text-xs font-bold text-muted-foreground flex items-center justify-between">
            <span>Doubt Tickets ({doubts.length})</span>
            <span>Select ticket to answer</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {doubts.length === 0 ? (
              <EmptyState
                icon={HelpCircle}
                title="No Doubts in Inbox"
                description="There are no unresolved doubt tickets matching your filter."
              />
            ) : (
              doubts.map((d) => {
                const isSelected = activeDoubt?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDoubtId(d.id)}
                    className={`p-4 transition-colors cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-l-primary'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-foreground line-clamp-1">
                        {d.title}
                      </span>
                      <StatusBadge
                        status={
                          d.status === 'resolved'
                            ? 'active'
                            : d.status === 'answered'
                            ? 'pending'
                            : 'draft'
                        }
                        label={d.status.toUpperCase()}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {d.description}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground font-semibold">
                      <span>{d.studentName} ({d.rollNo})</span>
                      <span className="text-primary font-mono">{d.subjectCode}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Threaded Messages & Faculty Reply */}
        <div className="lg:col-span-7">
          {activeDoubt ? (
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                      {activeDoubt.subjectCode}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {activeDoubt.category}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground mt-1">
                    {activeDoubt.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Asked by <span className="font-bold text-foreground">{activeDoubt.studentName}</span> ({activeDoubt.rollNo})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={
                      activeDoubt.status === 'resolved'
                        ? 'active'
                        : activeDoubt.status === 'answered'
                        ? 'pending'
                        : 'draft'
                    }
                    label={activeDoubt.status.toUpperCase()}
                  />
                  {activeDoubt.status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={() => resolveMutation.mutate()}
                      disabled={resolveMutation.isPending}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      Resolve Ticket
                    </button>
                  )}
                </div>
              </div>

              {/* Policy Banner: Reopen limit */}
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Institutional Policy: 2-Reopen Limit Cap
                </span>
                <span className="font-mono font-semibold">
                  Used: {activeDoubt.reopenCount} / {activeDoubt.maxReopensAllowed}
                </span>
              </div>

              {/* Messages Thread */}
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {activeDoubt.messages.map((msg) => {
                  const isFaculty = msg.senderRole === 'Faculty';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isFaculty ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                        <span className="font-bold text-foreground">{msg.senderName}</span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`p-4 rounded-2xl max-w-xl text-xs leading-relaxed ${
                          isFaculty
                            ? 'bg-primary text-primary-foreground rounded-tr-xs'
                            : 'bg-muted/70 text-foreground border border-border/70 rounded-tl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {msg.attachmentName && (
                          <div className={`mt-2.5 pt-2 border-t flex items-center gap-2 text-[11px] font-semibold ${isFaculty ? 'border-primary-foreground/20 text-primary-foreground/90' : 'border-border/60 text-primary'}`}>
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>Attachment: {msg.attachmentName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Faculty Reply Input */}
              {activeDoubt.status !== 'resolved' ? (
                <div className="space-y-3 pt-3 border-t border-border/60">
                  <span className="text-xs font-bold text-foreground">
                    Compose Faculty Explanation / Solution:
                  </span>
                  <textarea
                    rows={4}
                    placeholder="Provide a clear technical explanation, code snippet, or slide reference..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-muted/40 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 leading-relaxed font-sans"
                  />

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Attachment ref (e.g. CS601_Slide32.pdf)..."
                        value={replyAttachment}
                        onChange={(e) => setReplyAttachment(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-card border border-border/70 text-xs text-foreground placeholder:text-muted-foreground w-64"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => replyMutation.mutate()}
                      disabled={replyMutation.isPending || !replyText.trim()}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{replyMutation.isPending ? 'Sending...' : 'Send Response'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Ticket has been resolved. If the student has further queries, they may reopen per the 2-attempt policy.
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={HelpCircle}
              title="Select a Doubt Ticket"
              description="Choose a student question from the inbox to read the conversation and reply."
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function FacultyDoubtsInboxSplitPane() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <FacultyDoubtsInboxContent />
    </React.Suspense>
  );
}
