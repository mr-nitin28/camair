'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Send,
  Zap,
  HelpCircle,
  Search,
  Filter,
  CheckCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export type AttendanceStatus = 'present' | 'absent' | 'late' | null;

export interface RosterStudent {
  id: string;
  enrollmentNo: string;
  name: string;
  avatarUrl?: string;
  historicalAttendancePct: number;
}

export interface SpeedRollCallRosterProps {
  courseTitle: string;
  courseCode: string;
  sessionDate: string;
  students: RosterStudent[];
  onSubmit: (records: Record<string, 'present' | 'absent' | 'late'>) => Promise<void>;
  className?: string;
}

export function SpeedRollCallRoster({
  courseTitle,
  courseCode,
  sessionDate,
  students,
  onSubmit,
  className = '',
}: SpeedRollCallRosterProps) {
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [history, setHistory] = useState<Array<Record<string, AttendanceStatus>>>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [undoToast, setUndoToast] = useState<{ active: boolean; secondsLeft: number } | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const rowRefs = useRef<(HTMLTableRowElement | HTMLDivElement | null)[]>([]);

  // Filter students based on search
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.enrollmentNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute live statistics
  const total = students.length;
  const presentCount = Object.values(marks).filter((s) => s === 'present').length;
  const absentCount = Object.values(marks).filter((s) => s === 'absent').length;
  const lateCount = Object.values(marks).filter((s) => s === 'late').length;
  const unmarkedCount = total - (presentCount + absentCount + lateCount);

  // Mark single student with history state saving
  const setStudentStatus = useCallback(
    (studentId: string, status: AttendanceStatus, advance = true) => {
      setMarks((prev) => {
        // Push previous state onto history stack
        setHistory((h) => [...h.slice(-19), prev]);
        return { ...prev, [studentId]: status };
      });

      if (advance) {
        setSelectedIndex((curr) => Math.min(curr + 1, filteredStudents.length - 1));
      }
    },
    [filteredStudents.length]
  );

  // Undo last action (Ctrl/Cmd + Z)
  const handleUndo = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;
      const lastState = prevHistory[prevHistory.length - 1];
      setMarks(lastState);
      return prevHistory.slice(0, -1);
    });
  }, []);

  // Mark all remaining unassigned as Present (Shift+A)
  const handleMarkRemainingPresent = useCallback(() => {
    setMarks((prev) => {
      setHistory((h) => [...h.slice(-19), prev]);
      const next = { ...prev };
      students.forEach((s) => {
        if (!next[s.id]) {
          next[s.id] = 'present';
        }
      });
      return next;
    });
  }, [students]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in a search box or input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Check undo: Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Modifier key guard: avoid triggering shortcuts when holding Ctrl/Cmd/Alt
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Shift+A => Mark remaining present
      if (e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleMarkRemainingPresent();
        return;
      }

      const currentStudent = filteredStudents[selectedIndex];
      if (!currentStudent) return;

      if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setStudentStatus(currentStudent.id, 'present', true);
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setStudentStatus(currentStudent.id, 'absent', true);
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setStudentStatus(currentStudent.id, 'late', true);
      } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setSelectedIndex((curr) => Math.min(curr + 1, filteredStudents.length - 1));
      } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSelectedIndex((curr) => Math.max(curr - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredStudents, selectedIndex, handleUndo, handleMarkRemainingPresent, setStudentStatus]);

  // Scroll active row into view on index change
  useEffect(() => {
    const el = rowRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIndex]);

  // Handle rapid submission with 8-second grace window
  const handleFinalSubmit = async () => {
    setIsSummaryOpen(false);
    setIsSubmitting(true);
    try {
      const payload: Record<string, 'present' | 'absent' | 'late'> = {};
      students.forEach((s) => {
        payload[s.id] = (marks[s.id] as 'present' | 'absent' | 'late') || 'present';
      });
      await onSubmit(payload);

      // Start 8-second grace window toast
      setUndoToast({ active: true, secondsLeft: 8 });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Countdown timer for undo grace window
  useEffect(() => {
    if (!undoToast?.active) return;
    if (undoToast.secondsLeft <= 0) {
      setUndoToast(null);
      return;
    }
    const timer = setInterval(() => {
      setUndoToast((prev) => (prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [undoToast?.active, undoToast?.secondsLeft]);

  return (
    <div className={`flex flex-col h-full bg-[var(--bg)] text-[var(--text)] ${className}`}>
      {/* Top Console Bar */}
      <div className="p-4 md:p-6 bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-[var(--z-sticky)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] font-mono">
                {courseCode}
              </span>
              <span className="text-xs text-[var(--text-muted)] font-medium">
                {sessionDate}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight mt-1">
              {courseTitle}
            </h1>
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex items-center gap-2 select-none overflow-x-auto pb-1 md:pb-0">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Present: <strong className="tabular-nums">{presentCount}</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              <span>Absent: <strong className="tabular-nums">{absentCount}</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Late: <strong className="tabular-nums">{lateCount}</strong></span>
            </div>
            {unmarkedCount > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-[var(--text-muted)] text-xs font-bold">
                Unmarked: <span className="tabular-nums">{unmarkedCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar: Search & Shortcuts Cheatsheet */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-[var(--border)]/60">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by student name or roll no..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          {/* Desktop Keyboard Cheatsheet */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-[var(--text-muted)] font-medium">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono font-bold text-[var(--text)]">P</kbd> Present
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono font-bold text-[var(--text)]">A</kbd> Absent
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono font-bold text-[var(--text)]">L</kbd> Late
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] font-mono font-bold text-[var(--text)]">Shift+A</kbd> Fill Present
            </span>
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="flex items-center gap-1 hover:text-[var(--text)] disabled:opacity-40 transition-opacity ml-2"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo (Cmd+Z)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Roster Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-28 md:pb-20">
        {/* Desktop View: High-Density Table */}
        <div className="hidden md:block rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[var(--surface-2)] text-[var(--text-muted)] border-b border-[var(--border)] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Historical %</th>
                <th className="py-3 px-4 text-center w-64">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]/60">
              {filteredStudents.map((student, idx) => {
                const isSelected = idx === selectedIndex;
                const status = marks[student.id];
                const isShortage = student.historicalAttendancePct < 75;

                return (
                  <tr
                    key={student.id}
                    ref={(el) => { rowRefs.current[idx] = el; }}
                    onClick={() => setSelectedIndex(idx)}
                    className={`transition-colors duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent-soft)]/50 ring-1 ring-inset ring-[var(--accent)]'
                        : 'hover:bg-[var(--surface-2)]/60'
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-mono text-[var(--text-muted)] font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[var(--text)]">
                      {student.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-[var(--text-muted)]">
                      {student.enrollmentNo}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-bold font-mono text-xs ${
                          isShortage
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {student.historicalAttendancePct.toFixed(1)}%
                        {isShortage && <AlertCircle className="w-3 h-3" />}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudentStatus(student.id, status === 'present' ? null : 'present', false);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            status === 'present'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-emerald-600'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudentStatus(student.id, status === 'absent' ? null : 'absent', false);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            status === 'absent'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-rose-600'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStudentStatus(student.id, status === 'late' ? null : 'late', false);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            status === 'late'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-amber-500'
                          }`}
                        >
                          Late
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View: High-Touch Cards (Thumb-Friendly >= 44x44px) */}
        <div className="md:hidden space-y-3">
          {filteredStudents.map((student, idx) => {
            const isSelected = idx === selectedIndex;
            const status = marks[student.id];
            const isShortage = student.historicalAttendancePct < 75;

            return (
              <div
                key={student.id}
                ref={(el) => { rowRefs.current[idx] = el; }}
                onClick={() => setSelectedIndex(idx)}
                className={`p-4 rounded-2xl border transition-all duration-150 ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--surface)] ring-2 ring-[var(--accent)]/30'
                    : 'border-[var(--border)] bg-[var(--surface)]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider font-bold">
                      {student.enrollmentNo}
                    </span>
                    <h3 className="text-sm font-bold text-[var(--text)] mt-0.5">
                      {student.name}
                    </h3>
                  </div>
                  <span
                    className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full border ${
                      isShortage
                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    }`}
                  >
                    {student.historicalAttendancePct.toFixed(0)}%
                  </span>
                </div>

                {/* Touch Target Buttons (min 44x44px per guidelines) */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStudentStatus(student.id, status === 'present' ? null : 'present', false);
                    }}
                    className={`min-h-[44px] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-transform active:scale-95 ${
                      status === 'present'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-[var(--surface-2)] text-[var(--text-muted)] active:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Present</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStudentStatus(student.id, status === 'absent' ? null : 'absent', false);
                    }}
                    className={`min-h-[44px] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-transform active:scale-95 ${
                      status === 'absent'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-[var(--surface-2)] text-[var(--text-muted)] active:bg-rose-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Absent</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStudentStatus(student.id, status === 'late' ? null : 'late', false);
                    }}
                    className={`min-h-[44px] rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-transform active:scale-95 ${
                      status === 'late'
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'bg-[var(--surface-2)] text-[var(--text-muted)] active:bg-amber-50'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Late</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Action Bar (Thumb Zone) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 md:p-4 bg-[var(--surface)]/90 backdrop-blur-md border-t border-[var(--border)] z-[var(--z-sticky)] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkRemainingPresent}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Fill Remaining Present</span>
              <span className="sm:hidden">Fill All</span>
            </button>
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-2 text-xs font-bold rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)] disabled:opacity-30 active:scale-95 transition-all"
              aria-label="Undo last change"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsSummaryOpen(true)}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs shadow-md hover:shadow-indigo-500/25 active:scale-95 transition-all flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Review & Submit</span>
          </button>
        </div>
      </div>

      {/* Pre-Submit Summary Modal */}
      {isSummaryOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 max-w-md w-full shadow-2xl"
          >
            <h2 className="text-lg font-black text-[var(--text)]">
              Confirm Roll-Call Submission
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Verify attendance counts before committing to the institutional ledger.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-600 block">Present</span>
                <span className="text-xl font-black tabular-nums text-[var(--text)]">{presentCount}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-rose-600 block">Absent</span>
                <span className="text-xl font-black tabular-nums text-[var(--text)]">{absentCount}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-500 block">Late</span>
                <span className="text-xl font-black tabular-nums text-[var(--text)]">{lateCount}</span>
              </div>
            </div>

            {unmarkedCount > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  {unmarkedCount} student(s) remain unmarked and will default to <strong>Present</strong>.
                </span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsSummaryOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Back to Edit
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 8-Second Undo Grace Window Toast */}
      <AnimatePresence>
        {undoToast?.active && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[var(--z-toast)] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10"
          >
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Attendance recorded! Grace window: <strong>{undoToast.secondsLeft}s</strong></span>
            </div>
            <button
              onClick={() => {
                setUndoToast(null);
                // Call undo logic here
              }}
              className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold text-amber-300 transition-colors"
            >
              Undo Submit
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
