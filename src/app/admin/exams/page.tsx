'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AdminService,
  type AssessmentReviewItem,
  type GradingScaleVersion,
  type BacklogStudentItem,
  type MarksCorrectionRecord,
} from '@/lib/services/admin-service';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabList, TabTrigger, TabContent } from '@/components/ui/tabs';
import {
  Award,
  CheckCircle,
  AlertTriangle,
  Send,
  Sliders,
  History,
  FileCheck,
  AlertCircle,
  Clock,
  Layers,
  BookOpen,
  UserX,
} from 'lucide-react';

export default function ExaminationsDeskPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'queue' | 'grading' | 'backlogs' | 'corrections'>('queue');

  // Publication confirmation dialog
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentReviewItem | null>(null);
  const [pubResultMsg, setPubResultMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Queries
  const { data: queue, isLoading: loadingQueue } = useQuery({
    queryKey: ['admin-assessments-queue'],
    queryFn: () => AdminService.getAssessmentPublicationQueue(),
  });

  const { data: gradingScale, isLoading: loadingScale } = useQuery({
    queryKey: ['admin-grading-scale'],
    queryFn: () => AdminService.getGradingScales(),
  });

  const { data: backlogs, isLoading: loadingBacklogs } = useQuery({
    queryKey: ['admin-backlogs'],
    queryFn: () => AdminService.getBacklogStudents(),
  });

  const { data: corrections, isLoading: loadingCorrections } = useQuery({
    queryKey: ['admin-marks-corrections'],
    queryFn: () => AdminService.getMarksCorrectionHistory(),
  });

  // Publish Assessment Mutation
  const publishMutation = useMutation({
    mutationFn: (assessmentId: string) => AdminService.publishAssessmentResults(assessmentId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-assessments-queue'] });
      setSelectedAssessment(null);
      setPubResultMsg({ success: true, text: res.message });
    },
    onError: (err: Error) => {
      setPubResultMsg({ success: false, text: err.message || 'Publication failed.' });
    },
  });

  const handlePublishClick = (asm: AssessmentReviewItem) => {
    setSelectedAssessment(asm);
    setPubResultMsg(null);
  };

  const isLoading = loadingQueue || loadingScale || loadingBacklogs || loadingCorrections;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-96 rounded-xl" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examinations Desk & Publication Gate"
        description="Manage versioned grading cutoffs, review faculty marks submissions, and publish verified assessments."
      />

      {pubResultMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border ${
            pubResultMsg.success
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {pubResultMsg.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{pubResultMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setPubResultMsg(null)}
            className="text-[10px] uppercase font-extrabold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <Tabs defaultValue="queue" value={activeTab} onValueChange={(v) => setActiveTab(v as 'queue' | 'grading' | 'backlogs' | 'corrections')}>
        <TabList className="mb-4">
          <TabTrigger value="queue">
            <Send className="w-4 h-4 mr-1.5" />
            <span>Publication Queue ({queue?.filter((a) => a.status === 'submitted' || a.status === 'reviewed').length || 0})</span>
          </TabTrigger>
          <TabTrigger value="grading">
            <Sliders className="w-4 h-4 mr-1.5" />
            <span>Grading Scales ({gradingScale?.version})</span>
          </TabTrigger>
          <TabTrigger value="backlogs">
            <UserX className="w-4 h-4 mr-1.5" />
            <span>Backlog Remedials ({backlogs?.length || 0})</span>
          </TabTrigger>
          <TabTrigger value="corrections">
            <History className="w-4 h-4 mr-1.5" />
            <span>Marks Correction History ({corrections?.length || 0})</span>
          </TabTrigger>
        </TabList>

        {/* 1. PUBLICATION QUEUE */}
        <TabContent value="queue">
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-950/20 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-3">
              <FileCheck className="w-4.5 h-4.5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block mb-0.5">rpc_publish_assessment_results Protocol</span>
                <span>
                  Official assessment results cannot be published while in draft mode. Publication locks mark entries, calculates SGPA points, and dispatches authoritative transcripts to student portals.
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {queue?.map((asm) => (
                <div
                  key={asm.id}
                  className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm hover:border-[var(--border-strong)] transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)]">
                        {asm.subjectCode}
                      </span>
                      <StatusBadge
                        status={
                          asm.status === 'published'
                            ? 'success'
                            : asm.status === 'draft'
                            ? 'neutral'
                            : 'warning'
                        }
                        label={asm.status}
                      />
                      <span className="text-xs text-[var(--text-muted)] font-semibold">
                        {asm.assessmentType} • Weightage: {asm.weightage}%
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                      {asm.assessmentName}
                    </h4>

                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] pt-0.5">
                      <span>Evaluator: <strong className="text-[var(--text)]">{asm.facultyName}</strong></span>
                      <span>•</span>
                      <span>Submissions: <strong className="text-[var(--text)]">{asm.submissionCount} / {asm.totalEnrolled}</strong></span>
                      <span>•</span>
                      <span>Max Marks: <strong className="text-[var(--text)]">{asm.maxMarks}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                    {asm.status === 'published' ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>Live on Portals</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePublishClick(asm)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors shadow-xs cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Publish Results</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabContent>

        {/* 2. VERSIONED GRADING SCALES */}
        <TabContent value="grading">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[var(--text)]">Institutional 10-Point UGC Grading Scale</h3>
                <span className="text-xs text-[var(--text-muted)]">Active Version: {gradingScale?.version} • Effective: {gradingScale?.effectiveFrom}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] uppercase text-[10px] font-extrabold tracking-wider">
                    <th className="py-3 px-4">Letter Grade</th>
                    <th className="py-3 px-4">Grade Point</th>
                    <th className="py-3 px-4">Percentage Cutoff Range</th>
                    <th className="py-3 px-4">Institutional Description</th>
                    <th className="py-3 px-4 text-right">Academic Standing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {gradingScale?.scales.map((tier) => (
                    <tr key={tier.grade} className="hover:bg-[var(--surface-2)] transition-colors">
                      <td className="py-3 px-4 font-black font-mono text-sm text-[var(--accent)]">
                        {tier.grade}
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold text-[var(--text)]">
                        {tier.gradePoint}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[var(--text)]">
                        {tier.minPercent}% — {tier.maxPercent}%
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--text)]">
                        {tier.description}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <StatusBadge
                          status={tier.grade === 'F' ? 'danger' : tier.gradePoint >= 8 ? 'success' : 'info'}
                          label={tier.grade === 'F' ? 'Remedial Backlog' : 'Passing Grade'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabContent>

        {/* 3. BACKLOG REMEDIALS */}
        <TabContent value="backlogs">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)]">Active Student Backlogs Roster</h3>
              <p className="text-xs text-[var(--text-muted)]">Students with F grades requiring remedial evaluation.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] uppercase text-[10px] font-extrabold tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Failed Course</th>
                    <th className="py-3 px-4">Semester Failed</th>
                    <th className="py-3 px-4">Marks Obtained</th>
                    <th className="py-3 px-4 text-right">Remedial Attempts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {backlogs?.map((b) => (
                    <tr key={b.id} className="hover:bg-[var(--surface-2)] transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-[var(--text)] block">{b.studentName}</span>
                        <span className="font-mono text-[11px] text-[var(--text-muted)]">{b.studentId} • {b.departmentCode}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[var(--accent)] mr-1.5">{b.subjectCode}</span>
                        <span className="font-semibold text-[var(--text)]">{b.subjectName}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[var(--text)]">
                        Semester {b.semesterFailed}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-600">
                        {b.marksObtained} / 100
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-[var(--text)]">
                        Attempt {b.attemptsCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabContent>

        {/* 4. MARKS CORRECTIONS HISTORY */}
        <TabContent value="corrections">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)]">Marks Correction Audit Log</h3>
              <p className="text-xs text-[var(--text-muted)]">Authoritative record of post-evaluation mark revisions.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] uppercase text-[10px] font-extrabold tracking-wider">
                    <th className="py-3 px-4">Student & Subject</th>
                    <th className="py-3 px-4">Mark Revision</th>
                    <th className="py-3 px-4">Justification Reason</th>
                    <th className="py-3 px-4">Requested / Approved By</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {corrections?.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--surface-2)] transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-[var(--text)] block">{c.studentName} ({c.studentId})</span>
                        <span className="font-mono text-[11px] text-[var(--accent)] font-semibold">{c.subjectCode}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold">
                        <span className="text-rose-600 line-through mr-1.5">{c.oldMarks}</span>
                        <span className="text-emerald-600">➔ {c.newMarks}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--text)] max-w-xs leading-relaxed">
                        {c.reason}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--text-muted)]">
                        <div>Req: <strong className="text-[var(--text)]">{c.requestedBy}</strong></div>
                        <div>App: <strong className="text-[var(--text)]">{c.approvedBy}</strong></div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[11px] text-[var(--text-muted)]">
                        {new Date(c.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabContent>
      </Tabs>

      {/* CONFIRM PUBLICATION MODAL */}
      {selectedAssessment && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedAssessment(null)}
          title={`Publish Assessment Results: ${selectedAssessment.subjectCode}`}
          description="Confirms evaluation results lock and portal publication."
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[var(--surface-2)] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Assessment:</span>
                <span className="font-bold text-[var(--text)]">{selectedAssessment.assessmentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Submitted Marks Count:</span>
                <span className="font-bold text-[var(--text)]">{selectedAssessment.submissionCount} students</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Maximum Marks:</span>
                <span className="font-bold text-[var(--text)]">{selectedAssessment.maxMarks}</span>
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Publishing will update student GPA indices and generate an immutable audit log.
            </p>

            <div className="pt-3 flex justify-end gap-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setSelectedAssessment(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={publishMutation.isPending}
                onClick={() => publishMutation.mutate(selectedAssessment.id)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                {publishMutation.isPending ? 'Publishing...' : 'Confirm & Publish Results'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
