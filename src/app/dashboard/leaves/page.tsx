'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Calendar,
  ArrowLeft,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  User,
  MessageSquare,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react';
import Link from 'next/link';

// Detailed Mock Leaves Queue
const mockLeaves = [
  {
    id: 'l1',
    leave_type: 'Medical',
    start_date: '2026-06-14',
    end_date: '2026-06-17',
    reason: 'Suffering from viral influenza. Recommended absolute bed rest by doctor.',
    status: 'Approved',
    attachment_url: '#',
    actioned_by: 'Dr. Ramesh Kumar',
    comments: 'Medical report verified. Leave approved. Make sure to cover Compiler Design labs.',
  },
  {
    id: 'l2',
    leave_type: 'Personal',
    start_date: '2026-06-08',
    end_date: '2026-06-09',
    reason: 'Attending elder sister marriage ceremony in hometown.',
    status: 'Approved',
    attachment_url: null,
    actioned_by: 'Dr. Ramesh Kumar',
    comments: 'Leave approved. Submit assignments beforehand.',
  },
  {
    id: 'l3',
    leave_type: 'On Duty',
    start_date: '2026-06-25',
    end_date: '2026-06-27',
    reason: 'Representing college at the National AI & Web3 Cohort hackathon.',
    status: 'Pending',
    attachment_url: null,
    actioned_by: null,
    comments: null,
  },
];

export default function LeaveManagementPage() {
  const { student } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [leaveType, setLeaveType] = useState('Medical');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Local state to keep submitted leaves in memory for the demo
  const [localLeaves, setLocalLeaves] = useState<any[]>([]);

  // Load local leaves on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('local_leaves');
      if (saved) {
        try {
          setLocalLeaves(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse local leaves:', e);
        }
      }
    }
  }, []);

  const displayLeaves = useMemo(() => {
    return [...localLeaves, ...mockLeaves];
  }, [localLeaves]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      setFormError('Please fill in all required fields.');
      return;
    }
    setFormError(null);
    setSubmitting(true);

    setTimeout(() => {
      const newLeave = {
        id: `local-leave-${Date.now()}`,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        attachment_url: attachmentName ? '#' : null,
        status: 'Pending',
        actioned_by: null,
        comments: null,
      };

      setLocalLeaves((prev) => {
        const updated = [newLeave, ...prev];
        localStorage.setItem('local_leaves', JSON.stringify(updated));
        return updated;
      });

      setStartDate('');
      setEndDate('');
      setReason('');
      setAttachmentName('');
      setModalOpen(false);
      setSubmitting(false);
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Leave Management</h2>
          <p className="text-slate-600 text-xs mt-1">Submit new leave applications and track faculty approvals in real time.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow shadow-indigo-600/10 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4.5 h-4.5" /> Apply for Leave
        </button>
      </div>

      {/* Leave Application History Grid */}
      {displayLeaves.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-700">No leave requests found</p>
          <p className="text-[10px] text-slate-500 mt-1">Apply for leave using the button above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayLeaves.map((leave: any) => (
            <div key={leave.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition animate-fadeIn">
              {/* Top row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full font-mono">
                    {leave.leave_type} Leave
                  </span>
                  <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-extrabold uppercase text-[9px] border self-start sm:self-auto ${
                    leave.status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : leave.status === 'Rejected'
                      ? 'bg-rose-50 text-rose-700 border-rose-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}
                >
                  {leave.status === 'Approved' && <CheckCircle className="w-3.5 h-3.5" />}
                  {leave.status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                  {leave.status === 'Pending' && <Clock className="w-3.5 h-3.5 animate-pulse" />}
                  {leave.status}
                </span>
              </div>

              {/* Body */}
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase block tracking-wider font-mono">Reason</span>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">{leave.reason}</p>
              </div>

              {/* Attachment */}
              {leave.attachment_url && (
                <div className="flex items-center gap-1.5 text-[9.5px] text-indigo-700 font-extrabold bg-indigo-50 px-3 py-1 rounded-lg w-max border border-indigo-100 font-mono">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>medical_certificate.pdf</span>
                </div>
              )}

              {/* Timeline feedback if actioned */}
              {leave.status !== 'Pending' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="text-[9.5px] font-extrabold text-slate-500 uppercase block font-mono">Actioned By</span>
                      <span className="text-slate-800 font-bold">{leave.actioned_by || 'Advisor'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <span className="text-[9.5px] font-extrabold text-slate-500 uppercase block font-mono">Remarks</span>
                      <p className="text-slate-600 italic mt-1 font-semibold">{leave.comments || 'No remarks provided.'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Leave Application Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900">New Leave Application</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto font-semibold text-xs text-slate-700">
              {formError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl p-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                    Leave Type *
                  </label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500/40 transition cursor-pointer font-bold shadow-sm"
                  >
                    <option value="Medical">Medical</option>
                    <option value="Personal">Personal</option>
                    <option value="On Duty">On Duty</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                    Attachment (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="medical_certificate.pdf"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500/40 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500/40 transition"
                  />
                </div>
                <div>
                  <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500/40 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">
                  Reason for Leave *
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe your reason in detail..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500/40 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2 text-xs font-bold rounded-xl transition shadow shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Submit Application'
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
