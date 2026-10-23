'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FacultyService,
  type AssessmentRecordItem,
  type MarksDiffItem,
  type CsvImportResult,
} from '@/lib/services/faculty-service';
import { calculateGradeFromMarks } from '@/lib/calculations/academic';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonList, SkeletonCard } from '@/components/ui/skeleton';
import {
  Award,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Save,
  Search,
  FileSpreadsheet,
  Download,
  Upload,
  Sparkles,
  RotateCcw,
  Check,
  ChevronRight,
  Send,
  Eye,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

function FacultyExamsGradesContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const queryAssessmentId = searchParams.get('assessmentId') || undefined;

  // 1. Fetch Assessment Data
  const {
    data: assessment,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['faculty-assessment-grid', queryAssessmentId],
    queryFn: () => FacultyService.getMarksGrid(queryAssessmentId),
  });

  // Local editable marks state: studentId -> marks
  const [marksState, setMarksState] = useState<Record<string, number | null>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCellStudentId, setSelectedCellStudentId] = useState<string | null>(null);

  // Modals & Diff view
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [csvResult, setCsvResult] = useState<CsvImportResult | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Initialize editable state
  useEffect(() => {
    if (assessment) {
      const initialMap: Record<string, number | null> = {};
      assessment.records.forEach((r: AssessmentRecordItem) => {
        initialMap[r.studentId] = r.marksObtained;
      });
      setMarksState(initialMap);
    }
  }, [assessment]);

  // Handle cell marks change with boundary checking
  const handleCellChange = (studentId: string, value: string) => {
    if (!assessment) return;
    if (value.trim() === '') {
      setMarksState((prev) => ({ ...prev, [studentId]: null }));
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setMarksState((prev) => ({ ...prev, [studentId]: num }));
    }
  };

  // Filtered assessment records
  const filteredRecords = useMemo(() => {
    if (!assessment) return [];
    return assessment.records.filter((r: AssessmentRecordItem) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        r.studentName.toLowerCase().includes(q) ||
        r.rollNo.toLowerCase().includes(q) ||
        r.enrollmentNo.toLowerCase().includes(q)
      );
    });
  }, [assessment, searchQuery]);

  // Generate Diff View Comparing Initial Assessment Records with Local State
  const diffItems: MarksDiffItem[] = useMemo(() => {
    if (!assessment) return [];
    const proposed = Object.entries(marksState).map(([studentId, marks]) => {
      const rec = assessment.records.find((r: AssessmentRecordItem) => r.studentId === studentId);
      return {
        studentId,
        rollNo: rec ? rec.rollNo : '',
        marks: marks || 0,
      };
    });
    return FacultyService.calculateMarksDiff(assessment.records, proposed, assessment.maxMarks);
  }, [assessment, marksState]);

  const modifiedCount = useMemo(() => {
    return diffItems.filter((d) => d.status === 'modified').length;
  }, [diffItems]);

  // Handle CSV Paste Import
  const handleParseCsv = () => {
    if (!assessment) return;
    const result = FacultyService.parseMarksCsv(pasteText, assessment.maxMarks);
    setCsvResult(result);
  };

  // Apply parsed CSV to marksState
  const handleApplyCsv = () => {
    if (!csvResult || !assessment) return;
    const next = { ...marksState };
    const rollMap = new Map<string, string>();
    assessment.records.forEach((r: AssessmentRecordItem) => rollMap.set(r.rollNo.toUpperCase(), r.studentId));

    csvResult.records.forEach((rec) => {
      const studentId = rollMap.get(rec.rollNo.toUpperCase());
      if (studentId) {
        next[studentId] = rec.marks;
      }
    });

    setMarksState(next);
    setPasteModalOpen(false);
    setPasteText('');
    setCsvResult(null);
    setSuccessToast(`Imported ${csvResult.records.length} marks entries from CSV.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Mutation for saving draft or submitting for Exam Admin review
  const saveMutation = useMutation({
    mutationFn: async (targetStatus: 'draft' | 'submitted') => {
      if (!assessment) return;
      const records = Object.entries(marksState).map(([studentId, marks]) => ({
        studentId,
        marks: marks === null ? 0 : marks,
      }));

      return await FacultyService.updateAssessmentMarks({
        assessmentId: assessment.id,
        records,
        status: targetStatus,
      });
    },
    onSuccess: (res, targetStatus) => {
      setDiffModalOpen(false);
      setActionError(null);
      setSuccessToast(
        targetStatus === 'submitted'
          ? 'Marks successfully submitted to Examination Admin for verification.'
          : 'Draft marks saved successfully.'
      );
      queryClient.invalidateQueries({ queryKey: ['faculty-assessment-grid'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-console-summary'] });
      setTimeout(() => setSuccessToast(null), 5000);
    },
    onError: (err: any) => {
      setActionError(err?.message || 'Failed to update marks.');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard height={80} />
        <SkeletonCard height={60} />
        <SkeletonList count={8} />
      </div>
    );
  }

  if (isError || !assessment) {
    return (
      <ErrorState
        title="Assessment Not Found"
        message={error instanceof Error ? error.message : 'Unable to load marks entry grid.'}
        onRetry={() => refetch()}
      />
    );
  }

  const isPublished = assessment.status === 'published';
  const isSubmitted = assessment.status === 'submitted';

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

      {/* 1. HEADER & ASSESSMENT METADATA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold mb-1">
            <Link href="/faculty" className="hover:text-primary flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Faculty Console
            </Link>
            <span>•</span>
            <span>{assessment.subjectCode} ({assessment.subjectName})</span>
            <span>•</span>
            <span>Max Marks: {assessment.maxMarks}</span>
            <span>•</span>
            <span>Weightage: {assessment.weightage}%</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
              {assessment.name}
            </h1>
            <StatusBadge
              status={
                assessment.status === 'published'
                  ? 'active'
                  : assessment.status === 'submitted'
                  ? 'pending'
                  : 'draft'
              }
              label={
                assessment.status === 'published'
                  ? 'PUBLISHED (LOCKED)'
                  : assessment.status === 'submitted'
                  ? 'SUBMITTED FOR REVIEW'
                  : 'DRAFT MODE'
              }
            />
          </div>

          {/* 4-Stage Status Chips (draft -> submitted -> reviewed -> published) */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2 p-1 bg-muted/60 rounded-2xl border border-border/60 text-xs">
            {(['draft', 'submitted', 'reviewed', 'published'] as const).map((stage, idx, arr) => {
              const stages = ['draft', 'submitted', 'reviewed', 'published'];
              const currentIdx = stages.indexOf(assessment.status);
              const stageIdx = stages.indexOf(stage);
              const isPast = stageIdx < currentIdx;
              const isCurrent = stageIdx === currentIdx;

              return (
                <React.Fragment key={stage}>
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : isPast
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-muted-foreground/70'
                    }`}
                  >
                    {isPast ? (
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px]">
                        {idx + 1}
                      </span>
                    )}
                    <span>{stage}</span>
                  </div>
                  {idx < arr.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!isPublished && (
            <button
              onClick={() => setPasteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/80 hover:bg-muted text-xs font-bold text-foreground transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Paste from Excel / CSV</span>
            </button>
          )}

          {!isPublished && (
            <button
              onClick={() => setDiffModalOpen(true)}
              disabled={modifiedCount === 0}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                modifiedCount > 0
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                  : 'border border-border/70 text-muted-foreground opacity-60 cursor-not-allowed'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>View Diff ({modifiedCount} modified)</span>
            </button>
          )}

          {!isPublished && (
            <button
              onClick={() => saveMutation.mutate('submitted')}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              <span>Submit to Exam Cell</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SPREADSHEET TOOLBAR & STATUS WARNING */}
      <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by roll no or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-card border border-border/70 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <span className="text-muted-foreground hidden sm:inline">
            Showing {filteredRecords.length} of {assessment.records.length} students
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isPublished ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Examination Admin published results. Grades are authoritative.
            </span>
          ) : isSubmitted ? (
            <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
              <Clock className="w-4 h-4" /> Under review by Examination Cell. Editing will update proposed marks.
            </span>
          ) : (
            <span className="text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> UGC 10-Point Scale Auto-Calculated Inline
            </span>
          )}
        </div>
      </div>

      {/* 3. SPREADSHEET MARKS ENTRY GRID */}
      <div className="rounded-3xl bg-card border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/70 border-b border-border text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4 w-32">Roll No</th>
                <th className="py-3 px-4 min-w-[180px]">Student Name</th>
                <th className="py-3 px-4 w-40">
                  Marks Obtained <span className="font-normal">(Max: {assessment.maxMarks})</span>
                </th>
                <th className="py-3 px-4 w-28 text-center">Percentage</th>
                <th className="py-3 px-4 w-24 text-center">Grade</th>
                <th className="py-3 px-4 w-24 text-center">Grade Points</th>
                <th className="py-3 px-4 w-32 text-center">Change State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No students match the search filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r: AssessmentRecordItem, idx: number) => {
                  const currentMarks = marksState[r.studentId] !== undefined ? marksState[r.studentId] : r.marksObtained;
                  const originalMarks = r.marksObtained;
                  const isModified = currentMarks !== originalMarks;
                  const isValid =
                    currentMarks === null || (currentMarks >= 0 && currentMarks <= assessment.maxMarks);

                  const gradeInfo =
                    currentMarks !== null
                      ? calculateGradeFromMarks(currentMarks, assessment.maxMarks)
                      : { percentage: 0, grade: '—', gradePoints: 0, description: 'Pending' };

                  return (
                    <tr
                      key={r.studentId}
                      className={`hover:bg-muted/30 transition-colors ${
                        isModified ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-muted-foreground/80">
                        {(idx + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {r.rollNo}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {r.studentName}
                      </td>
                      <td className="py-3 px-4">
                        {isPublished ? (
                          <span className="font-bold font-mono text-foreground">
                            {currentMarks !== null ? currentMarks : '—'}
                          </span>
                        ) : (
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={assessment.maxMarks}
                              value={currentMarks !== null ? currentMarks : ''}
                              onChange={(e) => handleCellChange(r.studentId, e.target.value)}
                              placeholder="0.0"
                              className={`w-28 px-3 py-1.5 rounded-xl font-mono text-xs font-bold text-foreground bg-muted/40 border transition-all focus:outline-hidden focus:ring-2 ${
                                !isValid
                                  ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-500/5 text-rose-600'
                                  : isModified
                                  ? 'border-amber-500/80 bg-amber-500/10 ring-1 ring-amber-500/30'
                                  : 'border-border/80 focus:ring-primary/40'
                              }`}
                            />
                            {!isValid && (
                              <span className="block text-[10px] text-rose-600 font-bold mt-0.5">
                                Must be 0–{assessment.maxMarks}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold">
                        {currentMarks !== null ? `${gradeInfo.percentage}%` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-xs ${
                            gradeInfo.grade === 'O' || gradeInfo.grade === 'A+'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : gradeInfo.grade === 'A' || gradeInfo.grade === 'B+'
                              ? 'bg-primary/10 text-primary'
                              : gradeInfo.grade === 'B' || gradeInfo.grade === 'C'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : gradeInfo.grade === 'F'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {gradeInfo.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {currentMarks !== null ? gradeInfo.gradePoints.toFixed(1) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isModified ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                            Modified (orig {originalMarks})
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            Unchanged
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">
            Grading adheres to UGC 10-Point Scale tiers. Boundary values: O (&ge; 90%), A+ (&ge; 80%), A (&ge; 70%), B+ (&ge; 60%), B (&ge; 50%), C (&ge; 40%), F (&lt; 40%).
          </span>

          {!isPublished && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => saveMutation.mutate('draft')}
                disabled={saveMutation.isPending}
                className="px-4 py-2 rounded-xl border border-border/80 font-bold text-foreground hover:bg-muted transition-colors"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => setDiffModalOpen(true)}
                disabled={modifiedCount === 0}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90 transition-colors"
              >
                Review Diff & Submit ({modifiedCount})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. EXCEL/CSV PASTE IMPORT DIALOG WITH ERROR DIAGNOSTICS */}
      <Dialog
        isOpen={pasteModalOpen}
        onClose={() => setPasteModalOpen(false)}
        title="Paste Marks from Excel / CSV"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Copy two columns from your spreadsheet (Column 1: <code>Roll Number</code>, Column 2: <code>Marks</code>) and paste below. Commas or tabs are accepted.
          </p>

          <textarea
            rows={6}
            placeholder={`23CSE042\t46.5\n23CSE043\t38.0\n23CSE044\t42.0`}
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              setCsvResult(null);
            }}
            className="w-full p-3 font-mono text-xs rounded-xl bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleParseCsv}
              disabled={!pasteText.trim()}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Validate & Parse
            </button>

            {csvResult && csvResult.success && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Parsed {csvResult.parsedCount} valid rows
              </span>
            )}
          </div>

          {/* Diagnostic Error Report */}
          {csvResult && !csvResult.success && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Import Errors Detected ({csvResult.errors.length}):
              </span>
              <ul className="text-xs text-rose-800 dark:text-rose-300 space-y-1 max-h-36 overflow-y-auto font-mono">
                {csvResult.errors.map((err, i) => (
                  <li key={i}>
                    Line {err.row}: [Col: {err.column}] "{err.value}" — {err.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => setPasteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border/80 text-xs font-bold text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCsv}
              disabled={!csvResult || !csvResult.success}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
            >
              Apply to Grid
            </button>
          </div>
        </div>
      </Dialog>

      {/* 5. DIFF MODAL BEFORE SUBMIT */}
      <Dialog
        isOpen={diffModalOpen}
        onClose={() => setDiffModalOpen(false)}
        title="Review Marks Changes Before Submitting"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Comparing proposed modifications against previously saved records for {assessment.name}:
          </p>

          <div className="max-h-72 overflow-y-auto rounded-2xl border border-border/60 divide-y divide-border/40">
            {diffItems.filter((d) => d.status === 'modified').length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground text-center">
                No marks have been modified.
              </p>
            ) : (
              diffItems
                .filter((d) => d.status === 'modified')
                .map((diff) => (
                  <div key={diff.studentId} className="p-3 bg-card flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-foreground">{diff.studentName}</span>
                      <span className="font-mono text-muted-foreground ml-2">({diff.rollNo})</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono font-bold">
                      <span className="text-muted-foreground line-through">
                        {diff.originalMarks !== null ? diff.originalMarks : 'None'} ({diff.originalGrade})
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-primary">
                        {diff.proposedMarks} ({diff.proposedGrade})
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          diff.delta >= 0
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-rose-500/10 text-rose-600'
                        }`}
                      >
                        {diff.delta >= 0 ? `+${diff.delta}` : diff.delta}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>

          {actionError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 text-xs font-semibold">
              {actionError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={() => setDiffModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border/80 text-xs font-bold text-foreground hover:bg-muted"
            >
              Back to Editing
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate('submitted')}
              disabled={saveMutation.isPending}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90"
            >
              {saveMutation.isPending ? 'Submitting to Exam Cell...' : 'Confirm & Submit to Exam Cell'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default function FacultyExamsGradesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <FacultyExamsGradesContent />
    </React.Suspense>
  );
}
