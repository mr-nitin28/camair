'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FacultyService,
  type AttendanceStatus,
  type AttendanceRosterStudent,
  type AttendanceSessionData,
} from '@/lib/services/faculty-service';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList, SkeletonCard } from '@/components/ui/skeleton';
import {
  CalendarCheck,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Sparkles,
  Save,
  Search,
  Filter,
  Check,
  AlertTriangle,
  History,
  Info,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';

interface UndoAction {
  studentId: string;
  previousStatus: AttendanceStatus | 'Unmarked';
  newStatus: AttendanceStatus;
}

function FacultyAttendanceFlagshipContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const querySessionId = searchParams.get('sessionId') || undefined;

  // 1. Fetch Session Data
  const {
    data: session,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['faculty-attendance-session', querySessionId],
    queryFn: () => FacultyService.getAttendanceSession(querySessionId),
  });

  // Local Attendance State: studentId -> status
  const [sheet, setSheet] = useState<Record<string, AttendanceStatus | 'Unmarked'>>({});
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'All' | 'Unmarked' | 'Present' | 'Absent' | 'Late'>('All');
  const [touchMode, setTouchMode] = useState(false);
  const [autosaveTime, setAutosaveTime] = useState<string | null>(null);

  // Modals & Confirmation States
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [submitToast, setSubmitToast] = useState<{ message: string; sessionId: string } | null>(null);
  const [undoToastNotice, setUndoToastNotice] = useState<string | null>(null);

  const rosterContainerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Initialize sheet when session data loads
  useEffect(() => {
    if (session) {
      const initialMap: Record<string, AttendanceStatus | 'Unmarked'> = {};
      session.students.forEach((s) => {
        initialMap[s.studentId] = s.status;
      });

      // Check localStorage for autosaved draft for this specific session
      const draftKey = `campusos_att_draft_${session.sessionId}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed && typeof parsed.sheet === 'object') {
            Object.assign(initialMap, parsed.sheet);
            setAutosaveTime(parsed.timestamp || null);
          }
        } catch {
          // ignore corrupted draft
        }
      }

      setSheet(initialMap);
    }
  }, [session]);

  // Filtered students list
  const filteredStudents = useMemo(() => {
    if (!session) return [];
    return session.students.filter((s) => {
      const currentStatus = sheet[s.studentId] || 'Unmarked';

      // Tab filter
      if (filterTab !== 'All') {
        if (filterTab === 'Unmarked' && currentStatus !== 'Unmarked') return false;
        if (filterTab === 'Present' && currentStatus !== 'Present') return false;
        if (filterTab === 'Absent' && currentStatus !== 'Absent') return false;
        if (filterTab === 'Late' && currentStatus !== 'Late') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          s.name.toLowerCase().includes(q) ||
          s.rollNo.toLowerCase().includes(q) ||
          s.enrollmentNo.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [session, sheet, filterTab, searchQuery]);

  // Scroll focused student into view without lag
  useEffect(() => {
    if (rowRefs.current[selectedIndex]) {
      rowRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  // Autosave draft to localStorage every time sheet changes
  const persistDraft = useCallback(
    (newSheet: Record<string, AttendanceStatus | 'Unmarked'>) => {
      if (!session) return;
      const draftKey = `campusos_att_draft_${session.sessionId}`;
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      localStorage.setItem(draftKey, JSON.stringify({ sheet: newSheet, timestamp: now }));
      setAutosaveTime(now);
    },
    [session]
  );

  // Single student mark action with undo push and auto-advance
  const markStudent = useCallback(
    (studentId: string, newStatus: AttendanceStatus | 'Unmarked', autoAdvance = true) => {
      setSheet((prev) => {
        const previousStatus = prev[studentId] || 'Unmarked';
        if (previousStatus === newStatus) return prev;

        const next = { ...prev, [studentId]: newStatus };
        if (newStatus !== 'Unmarked') {
          setUndoStack((uPrev) => [...uPrev, { studentId, previousStatus, newStatus }]);
        }
        persistDraft(next);
        return next;
      });

      if (autoAdvance) {
        if (filterTab === 'Unmarked') {
          // In Unmarked tab, marking removes current item, so the next student shifts into curr
          setSelectedIndex((curr) => Math.max(0, Math.min(filteredStudents.length - 2, curr)));
        } else {
          setSelectedIndex((curr) => Math.max(0, Math.min(filteredStudents.length - 1, curr + 1)));
        }
      }
    },
    [filteredStudents.length, filterTab, persistDraft]
  );

  // Undo Last Action (Ctrl/Cmd+Z)
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    setSheet((prev) => {
      const next = { ...prev, [lastAction.studentId]: lastAction.previousStatus };
      persistDraft(next);
      return next;
    });

    // Move focus back to the undone student
    const idx = filteredStudents.findIndex((s) => s.studentId === lastAction.studentId);
    if (idx !== -1) {
      setSelectedIndex(idx);
    }
  }, [undoStack, filteredStudents, persistDraft]);

  // Mark all filtered as Present (Shift+A)
  const handleMarkAllPresent = useCallback(() => {
    if (filteredStudents.length === 0) return;
    setSheet((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((s) => {
        next[s.studentId] = 'Present';
      });
      persistDraft(next);
      return next;
    });
  }, [filteredStudents, persistDraft]);

  // Global Keyboard Navigation & Roll Call Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in search input or correction text box
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // 1. Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // 2. Mark All Present: Shift+A (without Ctrl/Cmd/Alt)
      if (e.shiftKey && e.key.toUpperCase() === 'A' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleMarkAllPresent();
        return;
      }

      // 3. Navigation: ArrowUp / J, ArrowDown / K (without Ctrl/Cmd/Alt)
      if ((e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (filteredStudents.length > 0) {
          setSelectedIndex((curr) => Math.min(filteredStudents.length - 1, curr + 1));
        }
        return;
      }

      if ((e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        if (filteredStudents.length > 0) {
          setSelectedIndex((curr) => Math.max(0, curr - 1));
        }
        return;
      }

      // 4. Roll Call Keys: P, A, L (must NOT have Ctrl/Cmd/Alt held, protecting browser hotkeys like Ctrl+P/Ctrl+A/Ctrl+L)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const currentStudent = filteredStudents[selectedIndex];
      if (!currentStudent) return;

      if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        markStudent(currentStudent.studentId, 'Present', true);
      } else if (e.key.toLowerCase() === 'a' && !e.shiftKey) {
        e.preventDefault();
        markStudent(currentStudent.studentId, 'Absent', true);
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        markStudent(currentStudent.studentId, 'Late', true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredStudents, markStudent, handleUndo, handleMarkAllPresent]);

  // Calculation Metrics
  const stats = useMemo(() => {
    if (!session) return { total: 0, marked: 0, present: 0, absent: 0, late: 0, unmarked: 0, pct: 0 };
    const total = session.students.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let unmarked = 0;

    session.students.forEach((s) => {
      const st = sheet[s.studentId] || 'Unmarked';
      if (st === 'Present') present++;
      else if (st === 'Absent') absent++;
      else if (st === 'Late') late++;
      else unmarked++;
    });

    const marked = present + absent + late;
    const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, marked, present, absent, late, unmarked, pct };
  }, [session, sheet]);

  // Submit Mutation via RPC
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!session) return;
      if (session.status === 'submitted' && correctionReason.trim().length < 5) {
        throw new Error('Correction reason is mandatory (minimum 5 characters)');
      }

      const records = session.students.map((s) => ({
        student_id: s.studentId,
        status: (sheet[s.studentId] && sheet[s.studentId] !== 'Unmarked' ? sheet[s.studentId] : 'Present') as AttendanceStatus,
      }));

      return await FacultyService.submitAttendanceSession({
        sessionId: session.sessionId,
        records,
        reason: correctionReason.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      if (!session) return;
      // Clear autosave draft
      localStorage.removeItem(`campusos_att_draft_${session.sessionId}`);
      setSummaryModalOpen(false);
      setCorrectionReason('');
      setCorrectionError(null);
      setSubmitToast({
        message: res?.message || 'Attendance session successfully submitted.',
        sessionId: session.sessionId,
      });
      queryClient.invalidateQueries({ queryKey: ['faculty-attendance-session'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-console-summary'] });

      setTimeout(() => setSubmitToast(null), 8000);
    },
    onError: (err: any) => {
      setCorrectionError(err?.message || 'Failed to submit attendance session.');
    },
  });

  // Undo Submit Mutation
  const undoSubmitMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await FacultyService.undoAttendanceSubmission(sessionId);
    },
    onSuccess: (res) => {
      setSubmitToast(null);
      setUndoToastNotice(res?.message || 'Attendance submission reverted to draft.');
      queryClient.invalidateQueries({ queryKey: ['faculty-attendance-session'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-console-summary'] });
      if (session) {
        persistDraft(sheet);
      }
      setTimeout(() => setUndoToastNotice(null), 4000);
    },
    onError: (err: any) => {
      setCorrectionError(err?.message || 'Failed to undo attendance submission.');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard height={80} />
        <SkeletonCard height={120} />
        <SkeletonList count={8} />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <ErrorState
        title="Session Not Found"
        message={error instanceof Error ? error.message : 'Unable to load attendance session.'}
        onRetry={() => refetch()}
      />
    );
  }

  const isRevision = session.status === 'submitted';

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner with Actionable Undo Submit */}
      {submitToast && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn border border-emerald-400/30">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-white shrink-0" />
            <span>{submitToast.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => undoSubmitMutation.mutate(submitToast.sessionId)}
              disabled={undoSubmitMutation.isPending}
              className="text-xs px-3 py-1.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold transition-all shadow-xs flex items-center gap-1 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{undoSubmitMutation.isPending ? 'Undoing...' : 'Undo Submit'}</span>
            </button>
            <button
              onClick={() => setSubmitToast(null)}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {undoToastNotice && (
        <div className="p-4 rounded-2xl bg-amber-600 text-white font-bold text-sm shadow-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <RotateCcw className="w-5 h-5 text-white" />
            <span>{undoToastNotice}</span>
          </div>
          <button
            onClick={() => setUndoToastNotice(null)}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. TOP HEADER & SESSION DETAILS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold mb-1">
            <Link href="/faculty" className="hover:text-primary flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Faculty Console
            </Link>
            <span>•</span>
            <span>Slot {session.slotNumber} ({session.timeSlot})</span>
            <span>•</span>
            <span>{session.room}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
              {session.subjectCode} — {session.subjectName}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {session.sectionName}
            </span>
            <StatusBadge
              status={session.status === 'submitted' ? 'active' : 'pending'}
              label={session.status === 'submitted' ? `Submitted (Rev ${session.revisionCount})` : 'Draft Scheduled'}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {session.revisions.length > 0 && (
            <button
              onClick={() => setHistoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/80 hover:bg-muted text-xs font-bold text-foreground transition-colors"
            >
              <History className="w-4 h-4 text-muted-foreground" />
              <span>Revisions ({session.revisions.length})</span>
            </button>
          )}

          <button
            onClick={() => setTouchMode((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
              touchMode
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'border-border/80 hover:bg-muted text-foreground'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{touchMode ? 'Touch Mode (Large Targets)' : 'Enable Touch Mode'}</span>
          </button>

          <button
            onClick={() => setSummaryModalOpen(true)}
            disabled={submitMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>{isRevision ? 'Submit Revision' : 'Review & Submit Roll Call'}</span>
          </button>
        </div>
      </div>

      {/* 2. SPEED SHORTCUTS STRIP & AUTOSAVE INDICATOR */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <span className="font-bold text-foreground flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Speed Keys:
          </span>
          <span className="px-1.5 py-0.5 rounded bg-card border border-border/80 font-mono font-bold text-foreground">
            P
          </span>
          <span>Present</span>
          <span>•</span>
          <span className="px-1.5 py-0.5 rounded bg-card border border-border/80 font-mono font-bold text-foreground">
            A
          </span>
          <span>Absent</span>
          <span>•</span>
          <span className="px-1.5 py-0.5 rounded bg-card border border-border/80 font-mono font-bold text-foreground">
            L
          </span>
          <span>Late</span>
          <span>•</span>
          <span className="px-1.5 py-0.5 rounded bg-card border border-border/80 font-mono font-bold text-foreground">
            ↑ / ↓ or J / K
          </span>
          <span>Navigate</span>
          <span>•</span>
          <span className="px-1.5 py-0.5 rounded bg-card border border-border/80 font-mono font-bold text-foreground">
            Shift+A
          </span>
          <span>Mark All Present</span>
          <span>•</span>
          <span className="px-1.5 py-0.5 rounded bg-card border border-border/80 font-mono font-bold text-foreground">
            Ctrl+Z
          </span>
          <span>Undo ({undoStack.length})</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {undoStack.length > 0 && (
            <button
              onClick={handleUndo}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Undo last mark
            </button>
          )}
          {autosaveTime && (
            <span className="text-[11px] text-muted-foreground">
              Autosaved {autosaveTime}
            </span>
          )}
        </div>
      </div>

      {/* 3. PROGRESS BAR & QUICK STATUS FILTERS */}
      <div className="space-y-3 p-5 rounded-3xl bg-card border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Roll Call Progress
            </span>
            <div className="text-xl font-extrabold text-foreground mt-0.5">
              {stats.marked} of {stats.total} students marked{' '}
              <span className="text-sm font-semibold text-muted-foreground">
                ({Math.round((stats.marked / Math.max(1, stats.total)) * 100)}%)
              </span>
            </div>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border/60">
            {(['All', 'Unmarked', 'Present', 'Absent', 'Late'] as const).map((tab) => {
              const count =
                tab === 'All'
                  ? stats.total
                  : tab === 'Unmarked'
                  ? stats.unmarked
                  : tab === 'Present'
                  ? stats.present
                  : tab === 'Absent'
                  ? stats.absent
                  : stats.late;

              return (
                <button
                  key={tab}
                  onClick={() => {
                    setFilterTab(tab);
                    setSelectedIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterTab === tab
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual Progress Track */}
        <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex">
          <div
            style={{ width: `${(stats.present / Math.max(1, stats.total)) * 100}%` }}
            className="h-full bg-emerald-500 transition-all duration-300"
            title={`Present: ${stats.present}`}
          />
          <div
            style={{ width: `${(stats.late / Math.max(1, stats.total)) * 100}%` }}
            className="h-full bg-amber-500 transition-all duration-300"
            title={`Late: ${stats.late}`}
          />
          <div
            style={{ width: `${(stats.absent / Math.max(1, stats.total)) * 100}%` }}
            className="h-full bg-rose-500 transition-all duration-300"
            title={`Absent: ${stats.absent}`}
          />
        </div>

        {/* Search bar & quick actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search student by name, roll no..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/40 border border-border/70 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <button
            onClick={handleMarkAllPresent}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20 transition-colors"
          >
            Mark All Filtered Present (Shift+A)
          </button>
        </div>
      </div>

      {/* 4. HIGH-PERFORMANCE VIRTUALIZED ROSTER */}
      <div
        ref={rosterContainerRef}
        className="rounded-3xl bg-card border border-border shadow-xs overflow-hidden divide-y divide-border/40"
      >
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="No Students Matched"
            description="No student matches the current filter or search criteria."
          />
        ) : (
          filteredStudents.map((student, idx) => {
            const isSelected = selectedIndex === idx;
            const currentStatus = sheet[student.studentId] || 'Unmarked';

            return (
              <div
                key={student.studentId}
                ref={(el) => {
                  rowRefs.current[idx] = el;
                }}
                onClick={() => setSelectedIndex(idx)}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 ring-2 ring-primary ring-inset z-10'
                    : idx % 2 === 0
                    ? 'bg-card hover:bg-muted/30'
                    : 'bg-muted/10 hover:bg-muted/30'
                }`}
              >
                {/* Student Info */}
                <div className="flex items-center gap-3.5">
                  <span className="w-8 font-mono text-xs font-bold text-muted-foreground/80 shrink-0">
                    #{(idx + 1).toString().padStart(2, '0')}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-muted border border-border/60 flex items-center justify-center font-bold text-xs text-foreground shrink-0 uppercase">
                    {student.name.split(' ').map((p) => p[0]).join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {student.name}
                      </span>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted/60 text-muted-foreground">
                        {student.rollNo}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cumulative Attendance Rate:{' '}
                      <span
                        className={`font-bold ${
                          student.currentAttendanceRate < 75
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-foreground'
                        }`}
                      >
                        {student.currentAttendanceRate}%
                      </span>
                    </p>
                  </div>
                </div>

                {/* Status Toggles (Keyboard / Touch Target Buttons with Tap or Toggle) */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markStudent(student.studentId, currentStatus === 'Present' ? 'Unmarked' : 'Present', false);
                    }}
                    className={`px-3.5 ${
                      touchMode ? 'py-2.5 text-sm font-black' : 'py-1.5 text-xs font-bold'
                    } rounded-xl border transition-all ${
                      currentStatus === 'Present'
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                        : 'border-border/70 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600'
                    }`}
                  >
                    <span className="mr-1">P</span>
                    <span>Present</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markStudent(student.studentId, currentStatus === 'Late' ? 'Unmarked' : 'Late', false);
                    }}
                    className={`px-3.5 ${
                      touchMode ? 'py-2.5 text-sm font-black' : 'py-1.5 text-xs font-bold'
                    } rounded-xl border transition-all ${
                      currentStatus === 'Late'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'border-border/70 hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600'
                    }`}
                  >
                    <span className="mr-1">L</span>
                    <span>Late</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markStudent(student.studentId, currentStatus === 'Absent' ? 'Unmarked' : 'Absent', false);
                    }}
                    className={`px-3.5 ${
                      touchMode ? 'py-2.5 text-sm font-black' : 'py-1.5 text-xs font-bold'
                    } rounded-xl border transition-all ${
                      currentStatus === 'Absent'
                        ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                        : 'border-border/70 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600'
                    }`}
                  >
                    <span className="mr-1">A</span>
                    <span>Absent</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. SUMMARY CONFIRMATION DIALOG BEFORE SUBMIT */}
      <Dialog
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        title={isRevision ? 'Confirm Attendance Revision' : 'Confirm Attendance Submission'}
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Review the roll call counts below before finalizing this session into the authoritative institutional ledger.
          </p>

          <div className="grid grid-cols-4 gap-2.5 text-center">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                Present
              </span>
              <p className="text-xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
                {stats.present}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                Late
              </span>
              <p className="text-xl font-black text-amber-800 dark:text-amber-300 mt-1">
                {stats.late}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase">
                Absent
              </span>
              <p className="text-xl font-black text-rose-800 dark:text-rose-300 mt-1">
                {stats.absent}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-muted border border-border/60">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Rate
              </span>
              <p className="text-xl font-black text-foreground mt-1">
                {stats.pct}%
              </p>
            </div>
          </div>

          {stats.unmarked > 0 && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> {stats.unmarked} student{stats.unmarked === 1 ? '' : 's'} remain unmarked. They will default to Present upon submission.
              </span>
            </div>
          )}

          {/* Revision correction reason input (Mandatory if session was already submitted) */}
          {isRevision && (
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-foreground">
                Documented Correction Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Reason for modifying submitted attendance (min 5 characters, e.g. Student Diya Kaur arrived late with valid medical slip)..."
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-muted/40 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-[11px] text-muted-foreground">
                In compliance with institutional governance policies, attendance revisions require documented audit trail entries.
              </p>
            </div>
          )}

          {correctionError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-semibold">
              {correctionError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => setSummaryModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border/80 text-xs font-bold text-foreground hover:bg-muted transition-colors"
            >
              Back to Editing
            </button>
            <button
              type="button"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-all"
            >
              {submitMutation.isPending ? 'Submitting to Ledger...' : 'Confirm & Commit'}
            </button>
          </div>
        </div>
      </Dialog>

      {/* 6. REVISION HISTORY MODAL */}
      <Dialog
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title="Attendance Revisions History"
      >
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Complete audit trail of all revisions made to session {session.sessionId}.
          </p>

          <div className="space-y-2.5 max-h-80 overflow-y-auto divide-y divide-border/40">
            {session.revisions.map((rev) => (
              <div key={rev.revisionNumber} className="pt-2.5 first:pt-0">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-primary">Revision #{rev.revisionNumber}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(rev.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-foreground mt-1">"{rev.reason}"</p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                  <span>By: {rev.performedBy}</span>
                  <span>{rev.recordsCount} student records</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border/60 flex justify-end">
            <button
              onClick={() => setHistoryModalOpen(false)}
              className="px-4 py-1.5 rounded-xl bg-muted font-bold text-xs text-foreground hover:bg-muted/80"
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default function FacultyAttendanceFlagshipScreen() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <FacultyAttendanceFlagshipContent />
    </React.Suspense>
  );
}
